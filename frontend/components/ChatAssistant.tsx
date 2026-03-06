'use client';

import { useState, useEffect } from 'react';
import socketService from '../services/socket';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAssistantProps {
  transcript: string;
}

export default function ChatAssistant({ transcript }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Listen for socket events
  useEffect(() => {
    socketService.on('answer-result', (data: { answer: string }) => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    });

    socketService.on('answer-start', () => {
      setIsLoading(true);
    });
  }, []);

  const suggestedQuestions = [
    'What tasks were assigned?',
    'What were the main decisions?',
    'When are the deadlines?',
    'What topics were discussed?',
    'Summarize the key points',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !transcript || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Use Socket.io for real-time question
    if (socketService.isConnected()) {
      socketService.askQuestion(input);
    } else {
      // Fallback to REST API if socket not connected
      setIsLoading(true);
      try {
        const { api } = await import('../services/api');
        const response = await api.askQuestion(transcript, input);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.answer,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Chat error:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I couldn\'t get an answer. Please try again.',
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    handleSubmit(new Event('submit') as any);
  };

  return (
    <div className="glass rounded-2xl p-6 flex flex-col h-[500px]">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Meeting Chat Assistant
      </h2>

      {!transcript ? (
        <div className="flex-1 flex flex-col items-center justify-center text-dark-500">
          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-center mb-2">Start a voice transcript to chat about your meeting</p>
          <p className="text-sm text-dark-600">Ask questions about what was discussed, tasks assigned, or decisions made</p>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center mb-4">
                <p className="text-dark-400 mb-3">Ask me anything about the meeting!</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedQuestion(question)}
                      disabled={isLoading}
                      className="text-xs px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-full transition-smooth disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-accent-600 text-white'
                      : 'bg-dark-700 text-dark-200'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-dark-700 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-dark-400 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-dark-400 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-dark-400 rounded-full typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-4 py-2 text-dark-200 placeholder-dark-500 focus:outline-none focus:border-accent-500 transition-smooth"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-xl transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </>
      )}
    </div>
  );
}

