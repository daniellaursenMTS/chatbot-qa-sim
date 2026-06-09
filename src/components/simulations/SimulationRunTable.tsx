'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import RunStatusBadge from '@/components/simulations/RunStatusBadge';

export interface SimulationRun {
  id: string;
  sessionId: string;
  status: string;
  chatbotName: string;
  chatbotPurpose: string;
  testScenario: string;
  ecommerceCategory: string;
  initialQuestionCount: number;
  followUpQuestionCount: number;
  targetBotResponseCount: number;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
  personas: { personaSnapshot: { name: string } }[];
}

interface SimulationRunTableProps {
  runs: SimulationRun[];
  onDelete: (id: string) => void;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function triggerDownload(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function SimulationRunTable({
  runs,
  onDelete,
}: SimulationRunTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<SimulationRun | null>(null);

  const sorted = [...runs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary text-lg mb-4">
          No simulation runs yet. Start your first simulation!
        </p>
        <Link href="/simulations/new">
          <Button variant="primary">New Simulation</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-border text-text-tertiary">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Chatbot Name</th>
              <th className="px-4 py-3 font-medium">Scenario</th>
              <th className="px-4 py-3 font-medium text-right">Messages</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((run) => (
              <tr
                key={run.id}
                className="border-b border-border hover:bg-surface-secondary transition-colors"
              >
                <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                  {format(new Date(run.createdAt), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="px-4 py-3">
                  <RunStatusBadge status={run.status} />
                </td>
                <td className="px-4 py-3 text-text-primary font-medium">
                  {run.chatbotName}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {truncate(run.testScenario, 50)}
                </td>
                <td className="px-4 py-3 text-text-secondary text-right tabular-nums">
                  {run._count.messages}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/simulations/${run.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        triggerDownload(
                          `/api/simulation-runs/${run.id}/export/markdown`,
                        )
                      }
                    >
                      Export MD
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        triggerDownload(
                          `/api/simulation-runs/${run.id}/export/pdf`,
                        )
                      }
                    >
                      Export PDF
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteTarget(run)}
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
        title="Delete Simulation Run"
      >
        <p className="text-text-secondary mb-6">
          Are you sure you want to delete the simulation run for{' '}
          <span className="font-medium text-text-primary">
            {deleteTarget?.chatbotName}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
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
