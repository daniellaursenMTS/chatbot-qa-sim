'use client';

import { useState } from 'react';
import IssueBadge from './IssueBadge';

interface Issue {
  id: string;
  messageId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
  explanation: string;
  suggestedFix: string | null;
  message?: { id: string; sequenceIndex: number; turnIndex: number; content: string };
  raisedByPersonaRun?: { personaSnapshot: { name: string } } | null;
}

interface Message {
  id: string;
  role: 'USER' | 'CHATBOT';
  sequenceIndex: number;
  turnIndex: number;
  content: string;
  generationSource?: string | null;
  webhookStatusCode?: number | null;
  webhookLatencyMs?: number | null;
  webhookError?: string | null;
  personaRun?: { personaSnapshot: { name: string } } | null;
}

interface TranscriptMessageProps {
  message: Message;
  issues: Issue[];
}

const severityPriority: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export default function TranscriptMessage({ message, issues }: TranscriptMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'USER';

  const maxSeverity = issues.reduce<'LOW' | 'MEDIUM' | 'HIGH' | null>((max, issue) => {
    if (!max) return issue.severity;
    return (severityPriority[issue.severity] > severityPriority[max]) ? issue.severity : max;
  }, null);

  const copyId = async () => {
    await navigator.clipboard.writeText(message.id.slice(0, 8));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Issue-highlight classes for chatbot messages
  let issueClasses = '';
  if (!isUser && maxSeverity === 'HIGH') {
    issueClasses = 'border-l-4 border-danger-500 bg-danger-50';
  } else if (!isUser && maxSeverity === 'MEDIUM') {
    issueClasses = 'border-l-4 border-warning-500';
  } else if (!isUser && maxSeverity === 'LOW') {
    issueClasses = 'border-l-4 border-warning-500/40';
  }

  if (isUser) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-lg bg-primary-50 px-4 py-3">
          <div className="mb-1 flex items-center gap-2 text-xs text-text-secondary">
            {message.personaRun?.personaSnapshot?.name && (
              <span className="font-medium text-primary-700">
                {message.personaRun.personaSnapshot.name}
              </span>
            )}
            <span>Turn {message.turnIndex}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-text-primary">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className={`max-w-[75%] rounded-lg bg-surface-tertiary px-4 py-3 ${issueClasses}`}>
        <div className="mb-1 flex items-center gap-2 text-xs text-text-secondary">
          <span className="font-medium">Chatbot</span>
          <button
            type="button"
            onClick={copyId}
            className="rounded px-1 py-0.5 font-mono text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors"
            title="Copy message ID"
          >
            {copied ? 'Copied!' : message.id.slice(0, 8)}
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm text-text-primary">{message.content}</p>
        {issues.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {issues.map((issue) => (
              <IssueBadge key={issue.id} severity={issue.severity} category={issue.category} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
