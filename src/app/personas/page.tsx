'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PersonaTable, { type Persona } from '@/components/personas/PersonaTable';

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Persona | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPersonas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/personas');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to load personas');
      }
      const data: Persona[] = await res.json();
      setPersonas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  async function handleToggleActive(id: string, active: boolean) {
    try {
      const res = await fetch(`/api/personas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to update persona');
      }
      setPersonas((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active } : p)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update persona');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/personas/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to delete persona');
      }
      setPersonas((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete persona');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Personas</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage simulated customer personas for QA testing.
          </p>
        </div>
        <Link href="/personas/new">
          <Button>Add Persona</Button>
        </Link>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
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
          <span className="ml-2 text-sm text-text-secondary">Loading personas...</span>
        </div>
      ) : (
        <PersonaTable
          personas={personas}
          onDelete={(id) => {
            const persona = personas.find((p) => p.id === id);
            if (persona) setDeleteTarget(persona);
          }}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Persona"
      >
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot
          be undone.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
