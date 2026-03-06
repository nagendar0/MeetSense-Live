'use client';

import { useState } from 'react';
import { SummaryResponse } from '../services/api';

interface SummaryPanelProps {
  summary: SummaryResponse | null;
  isRealtime?: boolean;
  lastUpdate?: Date | null;
}

export default function SummaryPanel({ summary, isRealtime, lastUpdate }: SummaryPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('all');

  // Show loading/empty state when in realtime mode without data yet
  if (!summary && isRealtime) {
    return (
      <div className="glass rounded-2xl p-6 animate-pulse">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Meeting Summary
        </h2>
        <div className="space-y-3">
          <div className="h-4 bg-dark-800 rounded w-3/4"></div>
          <div className="h-4 bg-dark-800 rounded w-1/2"></div>
          <div className="h-4 bg-dark-800 rounded w-5/6"></div>
        </div>
        {lastUpdate && (
          <p className="text-xs text-dark-500 mt-4">
            Waiting for more speech to generate summary...
          </p>
        )}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Meeting Summary
      </h2>

      {/* Meeting Title */}
      <div className="bg-gradient-to-r from-accent-900/30 to-dark-800 rounded-xl p-4 mb-4">
        <h3 className="text-sm text-dark-400 mb-1">Meeting Title</h3>
        <p className="text-xl font-semibold gradient-text">{summary.meeting_title}</p>
      </div>

      {/* Summary */}
      <div className="mb-4">
        <h3 className="text-sm text-dark-400 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          Summary
        </h3>
        <p className="text-dark-200 leading-relaxed bg-dark-900 rounded-xl p-4">
          {summary.summary}
        </p>
      </div>

      {/* Key Points */}
      {summary.key_points && summary.key_points.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm text-dark-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Key Discussion Points
          </h3>
          <ul className="space-y-2">
            {summary.key_points.map((point, index) => (
              <li key={index} className="flex items-start gap-2 bg-dark-900 rounded-lg p-3">
                <span className="w-6 h-6 rounded-full bg-accent-600/30 text-accent-400 flex items-center justify-center text-sm flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-dark-200">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {summary.action_items && summary.action_items.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm text-dark-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Action Items
          </h3>
          <ul className="space-y-2">
            {summary.action_items.map((item, index) => (
              <li key={index} className="flex items-start gap-2 bg-accent-900/20 border border-accent-700/30 rounded-lg p-3">
                <svg className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-dark-200">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Deadlines */}
      {summary.deadlines && summary.deadlines.length > 0 && (
        <div>
          <h3 className="text-sm text-dark-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Deadlines
          </h3>
          <ul className="space-y-2">
            {summary.deadlines.map((deadline, index) => (
              <li key={index} className="flex items-start gap-2 bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-dark-200">{deadline}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

