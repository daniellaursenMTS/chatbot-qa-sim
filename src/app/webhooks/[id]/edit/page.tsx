'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import WebhookConfigForm from '@/components/webhooks/WebhookConfigForm';
import type { WebhookConfig } from '@/components/webhooks/WebhookConfigTable';

export default function EditWebhookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [webhook, setWebhook] = useState<WebhookConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWebhook() {
      try {
        const res = await fetch(`/api/webhook-configs/${id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? 'Failed to load webhook');
        }
        const data: WebhookConfig = await res.json();
        setWebhook(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchWebhook();
  }, [id]);

  async function handleSubmit(data: {
    name: string;
    url: string;
    method: string;
    notes: string;
  }) {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/webhook-configs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to update webhook');
      }
      router.push('/webhooks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
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
        <span className="ml-3 text-sm text-text-secondary">Loading...</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Webhook Not Found
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          The webhook configuration you are looking for does not exist.
        </p>
        <Link href="/webhooks">
          <Button variant="secondary" size="sm">
            Back to Webhooks
          </Button>
        </Link>
      </div>
    );
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
          Edit Webhook
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Update the webhook configuration.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger-500/30 bg-danger-50 px-4 py-3">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <Card>
        {webhook && (
          <WebhookConfigForm
            initialData={webhook}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        )}
      </Card>
    </div>
  );
}
