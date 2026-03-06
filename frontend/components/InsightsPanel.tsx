'use client';

import { useState } from 'react';
import { InsightsResponse } from '../services/api';

interface Suggestion {
  message: string;
  type: 'info' | 'warning' | 'tip';
}

interface InsightsPanelProps {
  insights: InsightsResponse | null;
  suggestions?: Suggestion[];
  isRealtime?: boolean;
}

export default function InsightsPanel({ insights, suggestions = [], isRealtime }: InsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'decisions' | 'deadlines' | 'topics'>('tasks');

  // Show loading state for realtime mode
  if (!insights && isRealtime) {
    return (
      <div className="glass rounded-2xl p-6 animate-pulse">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI Insights
        </h2>
        <div className="space-y-3">
          <div className="h-8 bg-dark-800 rounded"></div>
          <div className="h-20 bg-dark-800 rounded"></div>
        </div>
        <p className="text-xs text-dark-500 mt-4">
          Analyzing meeting conversation...
        </p>
      </div>
    );
  }

  if (!insights) return null;

  const tabs = [
    { id: 'tasks' as const, label: 'Tasks', count: insights.tasks?.length || 0, color: 'text-accent-400', bg: 'bg-accent-600' },
    { id: 'decisions' as const, label: 'Decisions', count: insights.decisions?.length || 0, color: 'text-blue-400', bg: 'bg-blue-600' },
    { id: 'deadlines' as const, label: 'Deadlines', count: insights.deadlines?.length || 0, color: 'text-red-400', bg: 'bg-red-600' },
    { id: 'topics' as const, label: 'Topics', count: insights.topics?.length || 0, color: 'text-purple-400', bg: 'bg-purple-600' },
  ];

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'tasks':
        return insights.tasks || [];
      case 'decisions':
        return insights.decisions || [];
      case 'deadlines':
        return insights.deadlines || [];
      case 'topics':
        return insights.topics || [];
      default:
        return [];
    }
  };

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        AI Insights
      </h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-smooth flex items-center gap-2 ${
              activeTab === tab.id
                ? `${tab.bg} text-white`
                : 'bg-dark-700 text-dark-400 hover:text-dark-200 hover:bg-dark-600'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-dark-800'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-dark-900 rounded-xl p-4 min-h-[150px] max-h-[250px] overflow-y-auto">
        {getCurrentItems().length > 0 ? (
          <ul className="space-y-2">
            {getCurrentItems().map((item, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-dark-800 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activeTab === 'tasks' ? 'bg-accent-500' :
                  activeTab === 'decisions' ? 'bg-blue-500' :
                  activeTab === 'deadlines' ? 'bg-red-500' : 'bg-purple-500'
                }`} />
                <span className="text-dark-200">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No {activeTab} detected</p>
          </div>
        )}
      </div>
    </div>
  );
}

