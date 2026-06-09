'use client';

import { useState } from 'react';
import CriteriaStatusCard from './CriteriaStatusCard';
import IssueBadge from './IssueBadge';

interface CriteriaResult {
  id: string;
  criterion: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  explanation: string;
  suggestedFix: string | null;
  relatedMessageIds?: string | null;
  personaRun?: { personaSnapshot: { name: string } } | null;
}

interface PersonaComment {
  id: string;
  personaName: string;
  overallComment: string;
  whatWorked: string; // JSON array
  concerns: string; // JSON array
}

interface EvaluationIssue {
  id: string;
  messageId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
  explanation: string;
  suggestedFix: string | null;
  message: { id: string; sequenceIndex: number; turnIndex: number; content: string } | null;
  raisedByPersonaRun?: { personaSnapshot: { name: string } } | null;
}

interface Evaluation {
  id: string;
  model: string;
  summary: string;
  createdAt: string;
  criteriaResults: CriteriaResult[];
  personaComments: PersonaComment[];
  issues: EvaluationIssue[];
}

interface EvaluationPanelProps {
  evaluation: Evaluation;
}

type Tab = 'summary' | 'byPersona' | 'issues';

function parseJsonArray(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function EvaluationPanel({ evaluation }: EvaluationPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Summary' },
    { key: 'byPersona', label: 'By Persona' },
    { key: 'issues', label: 'All Issues' },
  ];

  // Group criteria results by persona
  const criteriaByPersona = new Map<string, CriteriaResult[]>();
  for (const cr of evaluation.criteriaResults) {
    const name = cr.personaRun?.personaSnapshot?.name ?? 'General';
    const existing = criteriaByPersona.get(name) ?? [];
    existing.push(cr);
    criteriaByPersona.set(name, existing);
  }

  // Group issues by messageId
  const issuesByMessage = new Map<string, EvaluationIssue[]>();
  for (const issue of evaluation.issues) {
    const key = issue.messageId ?? 'unknown';
    const existing = issuesByMessage.get(key) ?? [];
    existing.push(issue);
    issuesByMessage.set(key, existing);
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary tab */}
      {activeTab === 'summary' && (
        <div>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {evaluation.summary}
          </p>
          <p className="mt-3 text-xs text-text-tertiary">
            Evaluated with {evaluation.model} on{' '}
            {new Date(evaluation.createdAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* By Persona tab */}
      {activeTab === 'byPersona' && (
        <div className="space-y-6">
          {evaluation.personaComments.map((pc) => {
            const whatWorked = parseJsonArray(pc.whatWorked);
            const concerns = parseJsonArray(pc.concerns);
            const personaCriteria = criteriaByPersona.get(pc.personaName) ?? [];

            return (
              <div key={pc.id} className="rounded-lg border border-border p-4">
                <h3 className="text-base font-semibold text-text-primary mb-3">
                  {pc.personaName}
                </h3>

                <p className="text-sm text-text-secondary mb-4">{pc.overallComment}</p>

                {whatWorked.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-success-700 mb-1">What Worked</h4>
                    <ul className="list-disc list-inside space-y-0.5">
                      {whatWorked.map((item, i) => (
                        <li key={i} className="text-sm text-text-secondary">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {concerns.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-warning-700 mb-1">Concerns</h4>
                    <ul className="list-disc list-inside space-y-0.5">
                      {concerns.map((item, i) => (
                        <li key={i} className="text-sm text-text-secondary">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {personaCriteria.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-2">
                      Criteria Results
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {personaCriteria.map((cr) => (
                        <CriteriaStatusCard key={cr.id} result={cr} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {evaluation.personaComments.length === 0 && (
            <p className="py-4 text-sm text-text-tertiary text-center">
              No persona comments available.
            </p>
          )}
        </div>
      )}

      {/* All Issues tab */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          {Array.from(issuesByMessage.entries()).map(([messageId, msgIssues]) => {
            const firstIssue = msgIssues[0];
            const msgContent = firstIssue?.message?.content;
            const msgSeq = firstIssue?.message?.sequenceIndex;

            return (
              <div key={messageId} className="rounded-lg border border-border p-4">
                {msgContent && (
                  <div className="mb-3 rounded bg-surface-secondary px-3 py-2">
                    <p className="text-xs font-medium text-text-tertiary mb-1">
                      Message #{msgSeq} &middot; {messageId.slice(0, 8)}
                    </p>
                    <p className="text-sm text-text-secondary line-clamp-3">{msgContent}</p>
                  </div>
                )}
                <div className="space-y-3">
                  {msgIssues.map((issue) => (
                    <div key={issue.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <IssueBadge severity={issue.severity} category={issue.category} />
                        {issue.raisedByPersonaRun?.personaSnapshot?.name && (
                          <span className="text-xs text-text-tertiary">
                            by {issue.raisedByPersonaRun.personaSnapshot.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">{issue.explanation}</p>
                      {issue.suggestedFix && (
                        <p className="text-sm text-primary-700">
                          Fix: {issue.suggestedFix}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {evaluation.issues.length === 0 && (
            <p className="py-4 text-sm text-text-tertiary text-center">No issues found.</p>
          )}
        </div>
      )}
    </div>
  );
}
