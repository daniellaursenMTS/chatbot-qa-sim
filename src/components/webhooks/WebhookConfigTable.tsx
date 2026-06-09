'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WebhookConfigTableProps {
  webhooks: WebhookConfig[];
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
}

export default function WebhookConfigTable({
  webhooks,
  onDelete,
  onTest,
}: WebhookConfigTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<WebhookConfig | null>(null);

  if (webhooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text-tertiary mb-4"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <h3 className="text-lg font-medium text-text-primary mb-1">
          No webhooks configured
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Create your first webhook to start forwarding events.
        </p>
        <Link href="/webhooks/new">
          <Button variant="primary" size="sm">
            Add Webhook
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="px-4 py-3 text-left font-medium text-text-secondary">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary">
                URL
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary">
                Method
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary">
                Notes
              </th>
              <th className="px-4 py-3 text-right font-medium text-text-secondary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map((webhook) => (
              <tr
                key={webhook.id}
                className="border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors"
              >
                <td className="px-4 py-3 font-medium text-text-primary">
                  {webhook.name}
                </td>
                <td className="px-4 py-3 text-text-secondary max-w-xs truncate font-mono text-xs">
                  {webhook.url}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={webhook.method === 'POST' ? 'info' : 'warning'}>
                    {webhook.method}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">
                  {webhook.notes || '\u2014'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/webhooks/${webhook.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onTest(webhook.id)}
                    >
                      Test
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteTarget(webhook)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Webhook"
      >
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to delete{' '}
          <span className="font-medium text-text-primary">
            {deleteTarget?.name}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (deleteTarget) {
                onDelete(deleteTarget.id);
                setDeleteTarget(null);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
