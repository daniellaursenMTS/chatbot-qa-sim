'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  skillFocus: string;
  ecommerceContext: {
    browsingStyle?: string;
    patienceLevel?: string;
    productKnowledge?: string;
    tone?: string;
    intent?: string;
  } | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PersonaTableProps {
  personas: Persona[];
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '...';
}

export default function PersonaTable({ personas, onDelete, onToggleActive }: PersonaTableProps) {
  if (personas.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center">
        <svg
          className="mx-auto h-12 w-12 text-text-tertiary"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          />
        </svg>
        <h3 className="mt-3 text-sm font-semibold text-text-primary">No personas yet</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Create your first persona to start running simulations.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-secondary">
            <th className="px-4 py-3 font-medium text-text-secondary">Name</th>
            <th className="px-4 py-3 font-medium text-text-secondary">Description</th>
            <th className="px-4 py-3 font-medium text-text-secondary">Skill Focus</th>
            <th className="px-4 py-3 font-medium text-text-secondary">Status</th>
            <th className="px-4 py-3 font-medium text-text-secondary text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {personas.map((persona) => (
            <tr key={persona.id} className="border-b border-border last:border-b-0 hover:bg-surface-tertiary transition-colors">
              <td className="px-4 py-3 font-medium text-text-primary whitespace-nowrap">
                {persona.name}
              </td>
              <td className="px-4 py-3 text-text-secondary max-w-xs">
                {truncate(persona.description, 60)}
              </td>
              <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                {persona.skillFocus}
              </td>
              <td className="px-4 py-3">
                <Badge variant={persona.active ? 'success' : 'default'}>
                  {persona.active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/personas/${persona.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onToggleActive(persona.id, !persona.active)}
                  >
                    {persona.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(persona.id)}
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
  );
}
