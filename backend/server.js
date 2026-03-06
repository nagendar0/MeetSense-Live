require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Store active sessions
const sessions = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    geminiConfigured: !!GEMINI_API_KEY,
    realtime: true
  });
});

// Summarize endpoint (REST)
app.post('/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Transcript text is required' });
    }

    if (!genAI) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `Analyze the provide a structured summary following meeting transcript and in JSON format with these fields:
- meeting_title: A brief descriptive title for the meeting
- summary: A 2-3 sentence summary of the meeting
- key_points: Array of 3-5 key discussion points
- action_items: Array of tasks assigned with names if mentioned
- deadlines: Array of any deadlines mentioned with dates if available

Transcript:
${text}

Respond ONLY with valid JSON, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(response);
    } catch (parseError) {
      parsed = {
        meeting_title: 'Meeting Summary',
        summary: response.substring(0, 200),
        key_points: [],
        action_items: [],
        deadlines: []
      };
    }

    res.json(parsed);
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
});

// Insights endpoint (REST)
app.post('/insights', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Transcript text is required' });
    }

    if (!genAI) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `Analyze the following meeting transcript and extract insights in JSON format with these fields:
- tasks: Array of tasks mentioned as assigned to someone
- decisions: Array of decisions made during the meeting
- deadlines: Array of deadlines mentioned with dates
- topics: Array of key discussion topics
- suggestions: Array of helpful suggestions based on the meeting

Transcript:
${text}

Respond ONLY with valid JSON, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(response);
    } catch (parseError) {
      parsed = {
        tasks: [],
        decisions: [],
        deadlines: [],
        topics: [],
        suggestions: []
      };
    }

    res.json(parsed);
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate insights' });
  }
});

// Ask endpoint (REST)
app.post('/ask', async (req, res) => {
  try {
    const { transcript, question } = req.body;
    
    if (!transcript || !question) {
      return res.status(400).json({ error: 'Transcript and question are required' });
    }

    if (!genAI) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `Based on the following meeting transcript, answer the user's question.

Transcript:
${transcript}

Question: ${question}

Provide a clear, concise answer based only on the information in the transcript. If the question cannot be answered from the transcript, say so.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    res.json({ answer: response });
  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({ error: error.message || 'Failed to get answer' });
  }
});

// Analyze image endpoint
app.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!genAI) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const imageBase64 = req.file.buffer.toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: imageBase64
        }
      },
      { text: 'Describe this image in detail. Explain what it shows, any text visible, diagrams, charts, or any important visual elements. Provide a clear explanation suitable for someone who cannot see the image.' }
    ]);

    res.json({ explanation: result.response.text() });
  } catch (error) {
    console.error('Analyze image error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze image' });
  }
});

// Analyze screen endpoint - for real-time screen capture analysis
app.post('/analyze-screen', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (!genAI) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Remove data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      },
      { text: 'Analyze this screen capture from a meeting. Describe what is visible - slides, diagrams, code, charts, documents, or any content being shared. Provide a clear explanation of what this screen shows in the context of a meeting or presentation. If there is text, extract the key information.' }
    ]);

    res.json({ analysis: result.response.text() });
  } catch (error) {
    console.error('Analyze screen error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze screen' });
  }
});

// Socket.io connection handling for real-time AI
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  let currentSession = {
    transcript: '',
    summary: null,
    insights: null,
    isProcessing: false
  };
  
  sessions.set(socket.id, currentSession);

  // Handle real-time transcript updates
  socket.on('transcript-update', async (data) => {
    const { transcript, forceUpdate } = data;
    currentSession.transcript = transcript;
    
    // Only process AI insights when there's significant new content or forced
    if (transcript.length > 50 && (!currentSession.isProcessing || forceUpdate)) {
      currentSession.isProcessing = true;
      
      try {
        // Generate real-time insights
        const insights = await generateRealTimeInsights(transcript, currentSession.insights);
        currentSession.insights = insights;
        
        // Emit insights update
        socket.emit('insights-update', insights);
        
        // Generate summary update
        const summary = await generateRealTimeSummary(transcript);
        currentSession.summary = summary;
        
        // Emit summary update
        socket.emit('summary-update', summary);
        
        // Generate suggestions
        const suggestions = await generateSuggestions(transcript, insights);
        if (suggestions.length > 0) {
          socket.emit('suggestions', suggestions);
        }
        
      } catch (error) {
        console.error('Real-time processing error:', error);
        socket.emit('error', { message: error.message });
      } finally {
        currentSession.isProcessing = false;
      }
    }
  });

  // Handle real-time question answering
  socket.on('ask-question', async (data) => {
    const { question } = data;
    
    try {
      socket.emit('answer-start');
      
      const answer = await askRealTimeQuestion(currentSession.transcript, question);
      
      socket.emit('answer-result', { answer });
    } catch (error) {
      console.error('Question answering error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle session reset
  socket.on('reset-session', () => {
    currentSession = {
      transcript: '',
      summary: null,
      insights: null,
      isProcessing: false
    };
    sessions.set(socket.id, currentSession);
    socket.emit('session-reset');
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    sessions.delete(socket.id);
  });
});

// Real-time AI functions
async function generateRealTimeInsights(transcript, previousInsights) {
  if (!genAI) throw new Error('Gemini API not configured');
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `Analyze the latest meeting transcript and extract NEW or UPDATED insights. 

Previous insights to update from:
${previousInsights ? JSON.stringify(previousInsights, null, 2) : 'None'}

Current transcript:
${transcript}

Extract in JSON format:
- tasks: Array of tasks assigned (build on previous if any)
- decisions: Array of decisions made (build on previous if any)  
- deadlines: Array of deadlines mentioned with dates
- topics: Array of key discussion topics (build on previous if any)
- new_items: What's NEW since the last update?

Respond ONLY with valid JSON.`;

  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text());
  } catch {
    return previousInsights || { tasks: [], decisions: [], deadlines: [], topics: [], new_items: [] };
  }
}

async function generateRealTimeSummary(transcript) {
  if (!genAI) throw new Error('Gemini API not configured');
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `Create a brief real-time summary of this meeting transcript. Update the key points as the meeting progresses.

Transcript:
${transcript}

Provide JSON with:
- meeting_title: Brief title
- summary: 1-2 sentence current summary
- key_points: Array of current key points (max 5)
- action_items: Current action items
- deadlines: Current deadlines mentioned

Respond ONLY with valid JSON.`;

  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text());
  } catch {
    return { meeting_title: 'Meeting in Progress', summary: 'Processing...', key_points: [], action_items: [], deadlines: [] };
  }
}

async function generateSuggestions(transcript, insights) {
  if (!genAI) return [];
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
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

  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text());
  } catch {
    return [];
  }
}

async function askRealTimeQuestion(transcript, question) {
  if (!genAI) throw new Error('Gemini API not configured');
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `Based on the meeting transcript below, answer the user's question in real-time.

Transcript:
${transcript}

Question: ${question}

Provide a clear, concise answer.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`MeetSense Live Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Socket.io enabled for real-time AI`);
});

