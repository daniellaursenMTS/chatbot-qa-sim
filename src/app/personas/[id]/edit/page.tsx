'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PersonaForm from '@/components/personas/PersonaForm';
import type { Persona } from '@/components/personas/PersonaTable';

export default function EditPersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPersona() {
      try {
        setLoading(true);
        const res = await fetch(`/api/personas/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? 'Failed to load persona');
        }
        const data: Persona = await res.json();
        setPersona(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchPersona();
  }, [id]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleSubmit(data: any) {
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`/api/personas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to update persona');
      }

      router.push('/personas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg
          className="h-6 w-6 animate-spin text-primary-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="ml-2 text-sm text-text-secondary">Loading persona...</span>
      </div>
    );
  }

  if (error && !persona) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text-primary">Edit Persona</h1>
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Edit Persona</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Update the details for <strong>{persona?.name}</strong>.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {persona && (
        <PersonaForm
          initialData={persona}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}
