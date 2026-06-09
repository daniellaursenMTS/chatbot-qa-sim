'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import WebhookConfigTable, {
  type WebhookConfig,
} from '@/components/webhooks/WebhookConfigTable';

interface TestResult {
  ok: boolean;
  statusCode?: number;
  latencyMs?: number;
  reply?: string;
  error?: string;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/webhook-configs');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to load webhooks');
      }
      const data: WebhookConfig[] = await res.json();
      setWebhooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/webhook-configs/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to delete webhook');
      }
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/webhook-configs/${id}/test`, {
        method: 'POST',
      });
      const data: TestResult = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({
        ok: false,
        error: err instanceof Error ? err.message : 'Test request failed',
      });
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Webhooks</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage webhook configurations for event forwarding.
          </p>
        </div>
        <Link href="/webhooks/new">
          <Button variant="primary">Add Webhook</Button>
        </Link>
      </div>

      {loading && (
        <Card>
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin h-6 w-6 text-primary-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="ml-3 text-sm text-text-secondary">
              Loading webhooks...
            </span>
          </div>
        </Card>
      )}

      {error && !loading && (
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <p className="text-sm text-danger-600 mb-4">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchWebhooks}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {!loading && !error && (
        <Card className="p-0">
          <WebhookConfigTable
            webhooks={webhooks}
            onDelete={handleDelete}
            onTest={handleTest}
          />
        </Card>
      )}

      {/* Test result modal */}
      <Modal
        open={testResult !== null}
        onClose={() => setTestResult(null)}
        title="Webhook Test Result"
      >
        {testResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-secondary">
                Status:
              </span>
              <Badge variant={testResult.ok ? 'success' : 'danger'}>
                {testResult.ok ? 'Success' : 'Failed'}
              </Badge>
            </div>

            {testResult.statusCode !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-secondary">
                  HTTP Status:
                </span>
                <span className="text-sm text-text-primary font-mono">
                  {testResult.statusCode}
                </span>
              </div>
            )}

            {testResult.latencyMs !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-secondary">
                  Latency:
                </span>
                <span className="text-sm text-text-primary">
                  {testResult.latencyMs}ms
                </span>
              </div>
            )}

            {testResult.reply && (
              <div>
                <span className="text-sm font-medium text-text-secondary block mb-1">
                  Response:
                </span>
                <pre className="text-xs bg-surface-tertiary rounded-lg p-3 overflow-auto max-h-40 text-text-primary font-mono">
                  {testResult.reply}
                </pre>
              </div>
            )}

            {testResult.error && (
              <div>
                <span className="text-sm font-medium text-text-secondary block mb-1">
                  Error:
                </span>
                <p className="text-sm text-danger-600">{testResult.error}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTestResult(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
