'use client';

import TranscriptMessage from './TranscriptMessage';

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

interface TranscriptViewProps {
  messages: Message[];
  issues: Issue[];
}

export default function TranscriptView({ messages, issues }: TranscriptViewProps) {
  const issuesByMessageId = new Map<string, Issue[]>();
  for (const issue of issues) {
    const existing = issuesByMessageId.get(issue.messageId) ?? [];
    existing.push(issue);
    issuesByMessageId.set(issue.messageId, existing);
  }

  const sortedMessages = [...messages].sort((a, b) => a.sequenceIndex - b.sequenceIndex);

  return (
    <div className="space-y-3">
      {sortedMessages.map((msg) => (
        <TranscriptMessage
          key={msg.id}
          message={msg}
          issues={issuesByMessageId.get(msg.id) ?? []}
        />
      ))}
      {sortedMessages.length === 0 && (
        <p className="py-8 text-center text-sm text-text-tertiary">No messages yet.</p>
      )}
    </div>
  );
}
