'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import RunStatusBadge from '@/components/simulations/RunStatusBadge';
import TranscriptView from '@/components/simulations/TranscriptView';
import EvaluationPanel from '@/components/simulations/EvaluationPanel';
import ExportButtons from '@/components/simulations/ExportButtons';
import DeleteRunButton from '@/components/simulations/DeleteRunButton';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface SimulationRun {
  id: string;
  sessionId: string;
  status: string;
  chatbotName: string;
  chatbotPurpose: string;
  testScenario: string;
  ecommerceCategory: string;
  initialQuestionCount: number;
  followUpQuestionCount: number;
  targetBotResponseCount: number;
  webhookConfigSnapshot: { name: string; url: string; method: string; notes: string } | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  errorDetails: string | null;
  createdAt: string;
  updatedAt: string;
  personas: any[];
  messages: any[];
  evaluation: any | null;
  events: any[];
}

function formatDate(date: string | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleString();
}

export default function SimulationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [run, setRun] = useState<SimulationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reEvaluating, setReEvaluating] = useState(false);
  const [errorDetailsOpen, setErrorDetailsOpen] = useState(false);

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/simulation-runs/${id}`);
      if (!res.ok) {
        setError(res.status === 404 ? 'Simulation run not found.' : `Error ${res.status}`);
        return;
      }
      const data = await res.json();
      setRun(data);
      setError(null);
    } catch (err) {
      setError('Failed to load simulation run.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  const handleReEvaluate = async () => {
    setReEvaluating(true);
    try {
      const res = await fetch(`/api/simulation-runs/${id}/evaluate`, { method: 'POST' });
      if (res.ok) {
        await fetchRun();
      }
    } catch (err) {
      console.error('Re-evaluate error:', err);
    } finally {
      setReEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          {error ?? 'Not found'}
        </h2>
        <Button variant="secondary" size="sm" onClick={() => router.push('/')}>
          Back to Home
        </Button>
      </div>
    );
  }

  const canReEvaluate = run.status === 'COMPLETED' || run.status === 'FAILED';
  const evaluationIssues = run.evaluation?.issues ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{run.chatbotName}</h1>
          <p className="mt-1 text-sm text-text-secondary">{run.chatbotPurpose}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {canReEvaluate && (
            <Button variant="secondary" size="sm" loading={reEvaluating} onClick={handleReEvaluate}>
              Re-evaluate
            </Button>
          )}
          <ExportButtons runId={id} />
        </div>
      </div>

      {/* 1. Status Panel */}
      <Card>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-base font-semibold text-text-primary">Status</h2>
          <RunStatusBadge status={run.status} />
        </div>
        {run.status === 'FAILED' && run.errorMessage && (
          <div className="mt-3 rounded-lg bg-danger-50 p-4">
            <p className="text-sm font-medium text-danger-700">{run.errorMessage}</p>
            {run.errorDetails && (
              <div className="mt-2">
                <button
                  type="button"
                  className="text-xs font-medium text-danger-600 hover:underline"
                  onClick={() => setErrorDetailsOpen((v) => !v)}
                >
                  {errorDetailsOpen ? 'Hide details' : 'Show details'}
                </button>
                {errorDetailsOpen && (
                  <pre className="mt-2 max-h-60 overflow-auto rounded bg-surface p-3 text-xs text-text-secondary">
                    {run.errorDetails}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 2. Run Metadata */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-4">Run Details</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <dt className="text-text-tertiary">Test Scenario</dt>
            <dd className="mt-0.5 text-text-primary">{run.testScenario || '--'}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">E-commerce Category</dt>
            <dd className="mt-0.5 text-text-primary">{run.ecommerceCategory || '--'}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Session ID</dt>
            <dd className="mt-0.5 font-mono text-text-primary text-xs">{run.sessionId}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Initial Questions</dt>
            <dd className="mt-0.5 text-text-primary">{run.initialQuestionCount}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Follow-up Questions</dt>
            <dd className="mt-0.5 text-text-primary">{run.followUpQuestionCount}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Target Bot Responses</dt>
            <dd className="mt-0.5 text-text-primary">{run.targetBotResponseCount}</dd>
          </div>
          {run.webhookConfigSnapshot && (
            <>
              <div>
                <dt className="text-text-tertiary">Webhook</dt>
                <dd className="mt-0.5 text-text-primary">{run.webhookConfigSnapshot.name}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-text-tertiary">Webhook URL</dt>
                <dd className="mt-0.5 font-mono text-text-primary text-xs break-all">
                  {run.webhookConfigSnapshot.url}
                </dd>
              </div>
            </>
          )}
          <div>
            <dt className="text-text-tertiary">Created</dt>
            <dd className="mt-0.5 text-text-primary">{formatDate(run.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Started</dt>
            <dd className="mt-0.5 text-text-primary">{formatDate(run.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Completed</dt>
            <dd className="mt-0.5 text-text-primary">{formatDate(run.completedAt)}</dd>
          </div>
        </dl>
      </Card>

      {/* 3. Personas Used */}
      {run.personas.length > 0 && (
        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-4">Personas Used</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {run.personas.map((p: any) => {
              const snap = p.personaSnapshot;
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-border bg-surface-secondary p-4"
                >
                  <h3 className="text-sm font-semibold text-text-primary">{snap.name}</h3>
                  {snap.description && (
                    <p className="mt-1 text-xs text-text-secondary line-clamp-3">
                      {snap.description}
                    </p>
                  )}
                  {snap.skillFocus && (
                    <p className="mt-2 text-xs text-primary-600">
                      Focus: {snap.skillFocus}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 4. Transcript */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-4">Transcript</h2>
        <TranscriptView messages={run.messages} issues={evaluationIssues} />
      </Card>

      {/* 5. Evaluation Panel */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-4">Evaluation</h2>
        {run.evaluation ? (
          <EvaluationPanel evaluation={run.evaluation} />
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-text-tertiary mb-3">No evaluation yet.</p>
            {canReEvaluate && (
              <Button
                variant="primary"
                size="sm"
                loading={reEvaluating}
                onClick={handleReEvaluate}
              >
                Run Evaluation
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* 6. Delete */}
      <div className="flex justify-end pt-2 pb-8">
        <DeleteRunButton runId={id} onDeleted={() => router.push('/')} />
      </div>
    </div>
  );
}
