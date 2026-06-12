'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SimulationRunTable, {
  type SimulationRun,
} from '@/components/simulations/SimulationRunTable';

export default function DashboardPage() {
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/simulation-runs');
      if (!res.ok) {
        throw new Error(`Failed to fetch simulation runs (${res.status})`);
      }
      const data: SimulationRun[] = await res.json();
      setRuns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch initial data on mount; fetchRuns updates state asynchronously via
    // the returned promise, which is the intended data-loading pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRuns();
  }, [fetchRuns]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/simulation-runs/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(`Failed to delete simulation run (${res.status})`);
      }
      setRuns((prev) => prev.filter((run) => run.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete simulation run');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <Link href="/simulations/new">
          <Button variant="primary">New Simulation</Button>
        </Link>
      </div>

      {loading && (
        <Card>
          <div className="flex items-center justify-center py-12">
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
            <span className="ml-3 text-text-secondary">
              Loading simulation runs...
            </span>
          </div>
        </Card>
      )}

      {error && (
        <Card className="border-danger-200 bg-danger-50">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-danger-600 shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-danger-700 font-medium">
                Error loading simulation runs
              </p>
              <p className="text-danger-600 text-sm mt-1">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setLoading(true);
                  fetchRuns();
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!loading && !error && (
        <Card className="p-0 overflow-hidden">
          <SimulationRunTable runs={runs} onDelete={handleDelete} />
        </Card>
      )}
    </div>
  );
}
