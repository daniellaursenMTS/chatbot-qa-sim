'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import NewSimulationForm from '@/components/simulations/NewSimulationForm';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: string;
  notes: string | null;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  skillFocus: string;
  ecommerceContext: Record<string, string> | null;
  active: boolean;
}

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'no-webhooks' }
  | { status: 'ready'; webhooks: WebhookConfig[]; personas: Persona[] };

export default function NewSimulationPage() {
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    async function load() {
      try {
        const [webhooksRes, personasRes] = await Promise.all([
          fetch('/api/webhook-configs'),
          fetch('/api/personas'),
        ]);

        if (!webhooksRes.ok) {
          throw new Error(`Failed to load webhooks (${webhooksRes.status})`);
        }
        if (!personasRes.ok) {
          throw new Error(`Failed to load personas (${personasRes.status})`);
        }

        const webhooks: WebhookConfig[] = await webhooksRes.json();
        const personas: Persona[] = await personasRes.json();

        if (webhooks.length === 0) {
          setState({ status: 'no-webhooks' });
          return;
        }

        setState({ status: 'ready', webhooks, personas });
      } catch (err) {
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load data',
        });
      }
    }

    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">New Simulation</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Configure and run a chatbot QA simulation.
        </p>
      </div>

      {state.status === 'loading' && (
        <Card className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-6 w-6 text-primary-600"
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
            <p className="text-sm text-text-secondary">Loading configuration...</p>
          </div>
        </Card>
      )}

      {state.status === 'error' && (
        <Card className="text-center py-8 space-y-3">
          <p className="text-sm text-danger-600">{state.message}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      )}

      {state.status === 'no-webhooks' && (
        <Card className="text-center py-8 space-y-4">
          <p className="text-text-primary font-medium">
            No webhook configurations found
          </p>
          <p className="text-sm text-text-secondary">
            You need to create a webhook configuration before running a simulation.
          </p>
          <Link href="/webhooks/new">
            <Button variant="primary">Create Webhook Configuration</Button>
          </Link>
        </Card>
      )}

      {state.status === 'ready' && (
        <NewSimulationForm
          webhooks={state.webhooks}
          personas={state.personas}
        />
      )}
    </div>
  );
}
