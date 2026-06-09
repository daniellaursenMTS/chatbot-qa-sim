'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PersonaForm from '@/components/personas/PersonaForm';

export default function NewPersonaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleSubmit(data: Record<string, any>) {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to create persona');
      }

      router.push('/personas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">New Persona</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Create a new simulated customer persona for QA testing.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      <PersonaForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
