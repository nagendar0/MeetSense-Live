const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface SummaryResponse {
  meeting_title: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  deadlines: string[];
}

export interface InsightsResponse {
  tasks: string[];
  decisions: string[];
  deadlines: string[];
  topics: string[];
}

export interface AskResponse {
  answer: string;
}

export interface AnalyzeImageResponse {
  explanation: string;
}

export interface AnalyzeScreenResponse {
  analysis: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  geminiConfigured: boolean;
}

export const api = {
  async healthCheck(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  },

  async summarize(text: string): Promise<SummaryResponse> {
    const response = await fetch(`${API_BASE_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate summary');
    }
    
    return response.json();
  },

  async getInsights(text: string): Promise<InsightsResponse> {
    const response = await fetch(`${API_BASE_URL}/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate insights');
    }
    
    return response.json();
  },

  async askQuestion(transcript: string, question: string): Promise<AskResponse> {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript, question }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get answer');
    }
    
    return response.json();
  },

  async analyzeImage(imageFile: File): Promise<AnalyzeImageResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await fetch(`${API_BASE_URL}/analyze-image`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze image');
    }
    
    return response.json();
  },

  async analyzeScreen(imageData: string): Promise<AnalyzeScreenResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze-screen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageData }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze screen');
    }
    
    return response.json();
  },
};

