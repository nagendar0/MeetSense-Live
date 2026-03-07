const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = null;
    this.model = null;
    this.visionModel = null;
    this.maxRetries = 3;
    this.retryDelay = 1000;

    this.initialize();
  }

  initialize() {
    if (!this.apiKey) {
      logger.warn(
        "GEMINI_API_KEY not configured. AI features will be limited.",
      );
      return;
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    this.visionModel = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });
    logger.info("Gemini AI service initialized successfully");
  }

  isConfigured() {
    return !!this.genAI;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async retryWithBackoff(fn, retries = this.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        const delay = this.retryDelay * Math.pow(2, i);
        logger.warn(
          `Retry ${i + 1}/${retries} after ${delay}ms: ${error.message}`,
        );
        await this.sleep(delay);
      }
    }
  }

  async generateContent(prompt, options = {}) {
    if (!this.isConfigured()) {
      throw new AppError("Gemini API key not configured", 500);
    }

    return this.retryWithBackoff(async () => {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    });
  }

  async generateStructuredContent(prompt, schema) {
    if (!this.isConfigured()) {
      throw new AppError("Gemini API key not configured", 500);
    }

    const result = await this.retryWithBackoff(async () => {
      return await this.model.generateContent({
        contents: [{ text: prompt }],
        generationConfig: {
          responseMimeType: "application/json",
          schema: schema,
        },
      });
    });

    const text = result.response.text();
    try {
      return JSON.parse(text);
    } catch (parseError) {
      logger.error("Failed to parse AI response as JSON", {
        error: parseError.message,
      });
      throw new AppError("Invalid AI response format", 500);
    }
  }

  async analyzeImage(imageBuffer, mimeType, prompt) {
    if (!this.isConfigured()) {
      throw new AppError("Gemini API key not configured", 500);
    }

    const imageBase64 = imageBuffer.toString("base64");

    return this.retryWithBackoff(async () => {
      const result = await this.visionModel.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        { text: prompt },
      ]);
      return result.response.text();
    });
  }

  async analyzeScreen(imageBase64) {
    const prompt = `Analyze this screen capture from a meeting. Describe what is visible - slides, diagrams, code, charts, documents, or any content being shared. Provide a clear explanation of what this screen shows in the context of a meeting or presentation. If there is text, extract the key information.`;

    return this.analyzeImage(
      Buffer.from(imageBase64, "base64"),
      "image/png",
      prompt,
    );
  }

  async summarizeMeeting(transcript) {
    const prompt = `Analyze the following meeting transcript and provide a structured summary in JSON format with these fields:
- meeting_title: A brief descriptive title for the meeting
- summary: A 2-3 sentence summary of the meeting
- key_points: Array of 3-5 key discussion points
- action_items: Array of tasks assigned with names if mentioned
- deadlines: Array of any deadlines mentioned with dates if available

Transcript:
${transcript}`;

    const schema = {
      type: "object",
      properties: {
        meeting_title: { type: "string" },
        summary: { type: "string" },
        key_points: { type: "array", items: { type: "string" } },
        action_items: { type: "array", items: { type: "string" } },
        deadlines: { type: "array", items: { type: "string" } },
      },
      required: [
        "meeting_title",
        "summary",
        "key_points",
        "action_items",
        "deadlines",
      ],
    };

    return this.generateStructuredContent(prompt, schema);
  }

  async extractInsights(transcript) {
    const prompt = `Analyze the following meeting transcript and extract insights in JSON format with these fields:
- tasks: Array of tasks mentioned as assigned to someone
- decisions: Array of decisions made during the meeting
- deadlines: Array of deadlines mentioned with dates
- topics: Array of key discussion topics
- suggestions: Array of helpful suggestions based on the meeting

Transcript:
${transcript}`;

    const schema = {
      type: "object",
      properties: {
        tasks: { type: "array", items: { type: "string" } },
        decisions: { type: "array", items: { type: "string" } },
        deadlines: { type: "array", items: { type: "string" } },
        topics: { type: "array", items: { type: "string" } },
        suggestions: { type: "array", items: { type: "string" } },
      },
      required: ["tasks", "decisions", "deadlines", "topics", "suggestions"],
    };

    return this.generateStructuredContent(prompt, schema);
  }

  async answerQuestion(transcript, question) {
    const prompt = `Based on the following meeting transcript, answer the user's question.

Transcript:
${transcript}

Question: ${question}

Provide a clear, concise answer based only on the information in the transcript. If the question cannot be answered from the transcript, say so.`;

    return this.generateContent(prompt);
  }

  async generateRealtimeInsights(transcript, previousInsights = null) {
    const previousContext = previousInsights
      ? `Previous insights to update from:\n${JSON.stringify(previousInsights, null, 2)}`
      : "No previous insights";

    const prompt = `Analyze the latest meeting transcript and extract NEW or UPDATED insights. 

${previousContext}

Current transcript:
${transcript}

Extract in JSON format:
- tasks: Array of tasks assigned (build on previous if any)
- decisions: Array of decisions made (build on previous if any)  
- deadlines: Array of deadlines mentioned with dates
- topics: Array of key discussion topics (build on previous if any)
- new_items: What's NEW since the last update?`;

    const schema = {
      type: "object",
      properties: {
        tasks: { type: "array", items: { type: "string" } },
        decisions: { type: "array", items: { type: "string" } },
        deadlines: { type: "array", items: { type: "string" } },
        topics: { type: "array", items: { type: "string" } },
        new_items: { type: "array", items: { type: "string" } },
      },
      required: ["tasks", "decisions", "deadlines", "topics", "new_items"],
    };

    return this.generateStructuredContent(prompt, schema);
  }

  async generateRealtimeSummary(transcript) {
    const prompt = `Create a brief real-time summary of this meeting transcript. Update the key points as the meeting progresses.

Transcript:
${transcript}

Provide JSON with:
- meeting_title: Brief title
- summary: 1-2 sentence current summary
- key_points: Array of current key points (max 5)
- action_items: Current action items
- deadlines: Current deadlines mentioned`;

    const schema = {
      type: "object",
      properties: {
        meeting_title: { type: "string" },
        summary: { type: "string" },
        key_points: { type: "array", items: { type: "string" } },
        action_items: { type: "array", items: { type: "string" } },
        deadlines: { type: "array", items: { type: "string" } },
      },
      required: [
        "meeting_title",
        "summary",
        "key_points",
        "action_items",
        "deadlines",
      ],
    };

    return this.generateStructuredContent(prompt, schema);
  }

  async generateSuggestions(transcript, insights) {
    const prompt = `Based on this meeting transcript and current insights, provide helpful suggestions.

Transcript excerpt (last part):
${transcript.slice(-1000)}

Current insights:
${JSON.stringify(insights)}

Generate suggestions like:
- "You mentioned a deadline but did not assign a task owner"
- "Consider summarizing key decisions made"
- "This topic seems important - might want to add action items"

Return as JSON array of strings.`;

    const result = await this.generateContent(prompt);
    try {
      return JSON.parse(result);
    } catch {
      return [];
    }
  }
}

module.exports = new GeminiService();
