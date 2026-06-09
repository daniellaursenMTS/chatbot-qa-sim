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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/simulation-runs/${runId}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        onDeleted();
      } else {
        console.error('Failed to delete run:', res.status);
      }
    } catch (err) {
      console.error('Error deleting run:', err);
    } finally {
      setDeleting(false);
      setShowConfirm(false);
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
