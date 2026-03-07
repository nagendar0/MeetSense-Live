const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  realtime?: boolean;
  agentPipeline?: boolean;
}

export interface KnowledgeGraphResponse {
  topics: string[];
  people: string[];
  tasks: { task: string; owner: string | null }[];
  deadlines: string[];
  decisions: string[];
  relationships: { from: string; to: string; type: string }[];
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isOperational: boolean = true,
  ) {
    super(message);
    this.name = "ApiError";
    Error.captureStackTrace(this, this.constructor);
  }
}

// Request timeout utility
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout: number = 30000,
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Retry utility with exponential backoff
const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.ok || attempt === maxRetries - 1) {
        return response;
      }
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }
  }

  throw lastError;
};

export const api = {
  async healthCheck(): Promise<HealthResponse> {
    const response = await fetchWithRetry(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new ApiError("Failed to check health", response.status);
    }
    return response.json();
  },

  async summarize(text: string): Promise<SummaryResponse> {
    const response = await fetchWithRetry(`${API_BASE_URL}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ApiError(
        error.error || "Failed to generate summary",
        response.status,
      );
    }

    return response.json();
  },

  async getInsights(text: string): Promise<InsightsResponse> {
    const response = await fetchWithRetry(`${API_BASE_URL}/insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ApiError(
        error.error || "Failed to generate insights",
        response.status,
      );
    }

    return response.json();
  },

  async askQuestion(
    transcript: string,
    question: string,
  ): Promise<AskResponse> {
    const response = await fetchWithRetry(`${API_BASE_URL}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transcript, question }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ApiError(
        error.error || "Failed to get answer",
        response.status,
      );
    }

    return response.json();
  },

  async analyzeImage(imageFile: File): Promise<AnalyzeImageResponse> {
    const formData = new FormData();
    formData.append("image", imageFile);

    const response = await fetchWithRetry(`${API_BASE_URL}/analyze-image`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ApiError(
        error.error || "Failed to analyze image",
        response.status,
      );
    }

    return response.json();
  },

  async analyzeScreen(imageData: string): Promise<AnalyzeScreenResponse> {
    const response = await fetchWithRetry(`${API_BASE_URL}/analyze-screen`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageData }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ApiError(
        error.error || "Failed to analyze screen",
        response.status,
      );
    }

    return response.json();
  },

  async getKnowledge(
    text: string,
    meetingId?: string,
  ): Promise<KnowledgeGraphResponse> {
    const response = await fetchWithRetry(`${API_BASE_URL}/knowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, meetingId }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ApiError(
        error.error || "Failed to generate knowledge graph",
        response.status,
      );
    }

    return response.json();
  },

  // New: Real-time insights endpoint
  async getRealtimeInsights(
    transcript: string,
    previousInsights?: InsightsResponse,
  ): Promise<InsightsResponse> {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/insights/realtime`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript, previousInsights }),
      },
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ApiError(
        error.error || "Failed to get real-time insights",
        response.status,
      );
    }

    const data = await response.json();
    return data.insights;
  },

  // New: Meeting completion endpoint
  async completeMeeting(
    transcript: string,
    insights?: InsightsResponse,
    meetingId?: string,
  ): Promise<SummaryResponse> {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/meeting/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript, insights, meetingId }),
      },
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ApiError(
        error.error || "Failed to complete meeting",
        response.status,
      );
    }

    const data = await response.json();
    return data.summary;
  },

  // New: Chat endpoint with context
  async chat(
    transcript: string,
    question: string,
    insights?: InsightsResponse,
    screenAnalysis?: string[],
    history?: { role: string; content: string }[],
  ): Promise<AskResponse> {
    const response = await fetchWithRetry(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transcript,
        question,
        insights,
        screenAnalysis,
        history,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new ApiError(
        error.error || "Failed to get chat response",
        response.status,
      );
    }

    return response.json();
  },
};
