import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionStateListeners: Set<(state: ConnectionState) => void> =
    new Set();
  private _connectionState: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  private setConnectionState(state: ConnectionState) {
    this._connectionState = state;
    this.connectionStateListeners.forEach((callback) => callback(state));
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void) {
    this.connectionStateListeners.add(callback);
    // Immediately notify of current state
    callback(this._connectionState);
    return () => this.connectionStateListeners.delete(callback);
  }

  connect() {
    if (this.socket?.connected) return;

    this.setConnectionState("connecting");

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      this.setConnectionState("connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      this.setConnectionState("disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.setConnectionState("error");
      }
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
      this.setConnectionState("connecting");
    });

    this.socket.on("reconnect", () => {
      console.log("Socket reconnected");
      this.setConnectionState("connected");
    });

    // Set up default listeners
    this.socket.on("insights-update", (data) => {
      this.emit("insights-update", data);
    });

    this.socket.on("summary-update", (data) => {
      this.emit("summary-update", data);
    });

    this.socket.on("suggestions", (data) => {
      this.emit("suggestions", data);
    });

    this.socket.on("answer-result", (data) => {
      this.emit("answer-result", data);
    });

    this.socket.on("answer-start", () => {
      this.emit("answer-start", {});
    });

    this.socket.on("session-reset", () => {
      this.emit("session-reset", {});
    });

    this.socket.on("knowledge-update", (data) => {
      this.emit("knowledge-update", data);
    });

    this.socket.on("error", (data) => {
      this.emit("socket-error", data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Send transcript update for real-time processing
  sendTranscriptUpdate(transcript: string, forceUpdate: boolean = false) {
    if (this.socket?.connected) {
      this.socket.emit("transcript-update", { transcript, forceUpdate });
    }
  }

  // Ask a question in real-time
  askQuestion(question: string) {
    if (this.socket?.connected) {
      this.socket.emit("ask-question", { question });
    }
  }

  // Reset session
  resetSession() {
    if (this.socket?.connected) {
      this.socket.emit("reset-session");
    }
  }

  // Event subscription system
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;
