'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface DeleteRunButtonProps {
  runId: string;
  onDeleted: () => void;
}

export default function DeleteRunButton({ runId, onDeleted }: DeleteRunButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/simulation-runs/${runId}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        onDeleted();
      } else {
        const body = await res.json().catch(() => null);
        setDeleteError(body?.error?.message ?? `Failed to delete run (${res.status})`);
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete run');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
        Delete Run
      </Button>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Delete Simulation Run">
        <p className="text-sm text-text-secondary mb-4">
          Are you sure you want to delete this simulation run? This action cannot be undone.
        </p>
        {deleteError && (
          <div className="mb-4 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2">
            <p className="text-sm text-danger-700">{deleteError}</p>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
