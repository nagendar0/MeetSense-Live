'use client';

import { useState, useRef, useEffect } from 'react';

interface TranscriptPanelProps {
  transcript: string;
}

export default function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedTranscript(transcript);
  }, [transcript]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="glass rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Live Transcript
        </h2>
        {transcript && (
          <span className="text-sm text-dark-500">
            {transcript.split(/\s+/).filter(w => w).length} words
          </span>
        )}
      </div>

      <div className="bg-dark-900 rounded-xl p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
        {isEditing ? (
          <textarea
            value={editedTranscript}
            onChange={(e) => setEditedTranscript(e.target.value)}
            className="w-full h-full min-h-[180px] bg-transparent text-dark-200 resize-none focus:outline-none"
            placeholder="Edit transcript here..."
          />
        ) : transcript ? (
          <p className="text-dark-200 whitespace-pre-wrap leading-relaxed">
            {transcript}
          </p>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <p className="text-center">
              Click "Start Voice" to begin transcription
            </p>
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {transcript && (
        <div className="flex justify-end mt-3 gap-2">
          {isEditing && (
            <button
              onClick={() => {
                setEditedTranscript(transcript);
                setIsEditing(false);
              }}
              className="px-3 py-2 text-sm text-dark-400 hover:text-dark-200 transition-smooth"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-2 text-sm bg-dark-700 hover:bg-dark-600 rounded-lg transition-smooth"
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>
      )}
    </div>
  );
}

