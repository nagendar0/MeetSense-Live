import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Set up default listeners
    this.socket.on('insights-update', (data) => {
      this.emit('insights-update', data);
    });

    this.socket.on('summary-update', (data) => {
      this.emit('summary-update', data);
    });

    this.socket.on('suggestions', (data) => {
      this.emit('suggestions', data);
    });

    this.socket.on('answer-result', (data) => {
      this.emit('answer-result', data);
    });

    this.socket.on('answer-start', () => {
      this.emit('answer-start', {});
    });

    this.socket.on('session-reset', () => {
      this.emit('session-reset', {});
    });

    this.socket.on('error', (data) => {
      this.emit('socket-error', data);
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
      this.socket.emit('transcript-update', { transcript, forceUpdate });
    }
  }

  // Ask a question in real-time
  askQuestion(question: string) {
    if (this.socket?.connected) {
      this.socket.emit('ask-question', { question });
    }
  }

  // Reset session
  resetSession() {
    if (this.socket?.connected) {
      this.socket.emit('reset-session');
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
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;

