'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import WebhookConfigForm from '@/components/webhooks/WebhookConfigForm';

export default function NewWebhookPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: {
    name: string;
    url: string;
    method: string;
    notes: string;
  }) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/webhook-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to create webhook');
      }
      router.push('/webhooks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/webhooks"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          &larr; Back to Webhooks
        </Link>
        <h1 className="text-2xl font-bold text-text-primary mt-2">
          New Webhook
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure a new webhook endpoint.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger-500/30 bg-danger-50 px-4 py-3">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <Card>
        <WebhookConfigForm onSubmit={handleSubmit} isLoading={isLoading} />
      </Card>
    </div>
  );
}
