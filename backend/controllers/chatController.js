const geminiService = require("../services/geminiService");
const logger = require("../utils/logger");
const { AppError, asyncHandler } = require("../utils/errorHandler");

// @desc    Ask a question about the meeting
// @route   POST /api/ai/ask
// @access  Public
const askQuestion = asyncHandler(async (req, res, next) => {
  const { transcript, question, screenAnalysis } = req.body;

  if (!transcript || !question) {
    return next(new AppError("Transcript and question are required", 400));
  }

  logger.info("Answering question", {
    questionLength: question.length,
    transcriptLength: transcript.length,
  });

  let context = `Transcript:\n${transcript}`;

  if (screenAnalysis && screenAnalysis.length > 0) {
    const screenContext = screenAnalysis
      .map((s, i) => `Screen ${i + 1}: ${s.analysis}`)
      .join("\n\n");
    context += `\n\nScreen Analysis:\n${screenContext}`;
  }

  const answer = await geminiService.answerQuestion(context, question);

  res.status(200).json({
    success: true,
    data: { answer },
  });
});

// @desc    Chat with AI about the meeting
// @route   POST /api/ai/chat
// @access  Public
const chat = asyncHandler(async (req, res, next) => {
  const { transcript, message, history, screenAnalysis } = req.body;

  if (!message) {
    return next(new AppError("Message is required", 400));
  }

  logger.info("Chat message", { messageLength: message.length });

  let context = "";

  if (transcript) {
    context += `Meeting Transcript:\n${transcript}\n\n`;
  }

  if (screenAnalysis && screenAnalysis.length > 0) {
    const screenContext = screenAnalysis
      .map((s, i) => `Screen ${i + 1}: ${s.analysis}`)
      .join("\n");
    context += `Screen Analysis:\n${screenContext}\n\n`;
  }

  if (history && history.length > 0) {
    const conversationHistory = history
      .map((h) => `User: ${h.user}\nAI: ${h.ai}`)
      .join("\n\n");
    context += `Conversation History:\n${conversationHistory}\n\n`;
  }

  context += `Current Question: ${message}`;

  const prompt = `You are a helpful AI assistant analyzing a meeting. Based on the context provided, answer the user's question. Be concise and helpful.

${context}

Provide a clear, helpful response.`;

  const answer = await geminiService.generateContent(prompt);

  res.status(200).json({
    success: true,
    data: {
      answer,
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = {
  askQuestion,
  chat,
};
