# MeetSense Live - Next-Generation Multimodal AI Meeting Agent

MeetSense Live is a powerful AI-powered meeting assistant that supports multimodal inputs and outputs (voice, text, and images). It listens to meetings in real-time, generates structured summaries, detects action items and deadlines, answers questions about the meeting, and explains uploaded slides using Google Gemini AI.

## Features

- **Live Voice Transcription** - Real-time speech-to-text using Web Speech API
- **AI Meeting Summary** - Structured JSON summaries with key points and action items
- **Real-Time AI Insights** - Task detection, decisions, deadlines, and topic analysis
- **Meeting Chat Assistant** - Ask questions about your meeting transcript
- **Image/Slide Explanation** - Upload and analyze meeting slides with Gemini multimodal AI
- **Modern Dark UI** - Beautiful, responsive dashboard with smooth interactions

## Prerequisites

- Node.js 18+
- npm or yarn
- Google Gemini API Key

## Installation

### 1. Clone the repository

```bash
cd meetsense-live
```

### 2. Install all dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

Or use the convenience script:

```bash
npm run install:all
```

### 3. Set up the Gemini API Key

1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a `.env` file in the backend folder:

```bash
cd backend
cp .env.example .env
```

3. Edit `.env` and add your API key:

```
GEMINI_API_KEY=your_actual_api_key_here
PORT=3001
```

## Running the Application

### Option 1: Run both frontend and backend together

```bash
npm run dev
```

This will start:
- Frontend at http://localhost:3000
- Backend at http://localhost:3001

### Option 2: Run separately

**Start the backend:**

```bash
cd backend
npm run dev
```

**Start the frontend (in a new terminal):**

```bash
cd frontend
npm run dev
```

## Using MeetSense Live

### 1. Start Voice Transcription

- Click "Start Voice" button to begin recording
- The app will use your microphone to transcribe speech in real-time
- Click "Stop Voice" when finished

### 2. Generate Meeting Summary

- After transcription, click "Generate Summary"
- The AI will analyze the transcript and provide:
  - Meeting title
  - Summary
  - Key discussion points
  - Action items
  - Deadlines

### 3. Get AI Insights

- Click "Get Insights" to analyze the meeting
- View categorized insights:
  - Tasks assigned
  - Decisions made
  - Deadlines mentioned
  - Discussion topics

### 4. Chat with Meeting Assistant

- Ask questions about the meeting in the chat panel
- Get instant answers about tasks, decisions, or any meeting content

### 5. Analyze Images/Slides

- Upload a slide or image in the "Slide / Image Analysis" section
- Click "Analyze Image" to get AI-powered explanations

## API Endpoints

The backend exposes the following endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/summarize` | POST | Generate meeting summary |
| `/insights` | POST | Extract AI insights |
| `/ask` | POST | Ask questions about meeting |
| `/analyze-image` | POST | Analyze uploaded images |

### Request/Response Examples

**POST /summarize**
```json
Request:
{ "text": "meeting transcript..." }

Response:
{
  "meeting_title": "Weekly Team Standup",
  "summary": "The team discussed progress on the new feature launch...",
  "key_points": ["Feature launch on track", "Bug fixes needed", "QA testing begins Monday"],
  "action_items": ["John to fix login bug", "Sarah to complete QA testing"],
  "deadlines": ["Feature launch - Friday"]
}
```

**POST /ask**
```json
Request:
{
  "transcript": "meeting transcript...",
  "question": "What tasks were assigned?"
}

Response:
{
  "answer": "John was assigned to fix the login bug..."
}
```

## Deployment to Google Cloud Run

### Prerequisites

- Google Cloud CLI (gcloud) installed
- Docker installed
- Google Cloud project with billing enabled

### Build and Deploy

1. Build the Docker image:

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/meetsense-live
```

2. Deploy to Cloud Run:

```bash
gcloud run deploy meetsense-live \
  --image gcr.io/YOUR_PROJECT_ID/meetsense-live \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_api_key
```

### Alternative: Use Cloud Build with Dockerfile

Create a `Dockerfile` in the root:

```dockerfile
# Build frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/package*.json frontend/
RUN cd frontend && npm install
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json backend/
RUN cd backend && npm install --production
COPY backend/ backend/
COPY --from=builder /app/frontend/out ./frontend/out

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "backend/server.js"]
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **AI**: Google Gemini via @google/genai SDK
- **Speech**: Web Speech API (webkitSpeechRecognition)

## Browser Compatibility

The voice transcription feature works best in:
- Google Chrome (recommended)
- Microsoft Edge
- Safari (limited support)

## Troubleshooting

### "Speech recognition is not supported"
- Use Chrome or Edge browser
- Web Speech API requires HTTPS in production

### "Microphone access denied"
- Allow microphone permissions in browser settings
- Ensure you're using HTTPS or localhost

### "Failed to generate summary"
- Check that the backend is running
- Verify GEMINI_API_KEY is set correctly
- Check backend logs for detailed errors

### TypeScript errors during development
- Run `npm install` in the frontend directory to install all dependencies
- The errors should resolve once node_modules is properly installed

## License

MIT License

