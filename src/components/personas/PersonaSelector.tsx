'use client';

import Badge from '@/components/ui/Badge';

interface PersonaSelectorPersona {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

interface PersonaSelectorProps {
  personas: PersonaSelectorPersona[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}

export default function PersonaSelector({
  personas,
  selectedIds,
  onChange,
  max = 20,
}: PersonaSelectorProps) {
  const activeCount = personas.filter((p) => p.active).length;
  const atMax = selectedIds.length >= max;

  function togglePersona(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else if (!atMax) {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {selectedIds.length} of {activeCount} selected (max {max})
        </p>
        {atMax && (
          <p className="text-sm font-medium text-warning-700">
            Maximum personas selected
          </p>
        )}
      </div>

      {personas.length === 0 && (
        <p className="text-sm text-text-tertiary py-4 text-center">
          No personas available. Create some first.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {personas.map((persona) => {
          const isSelected = selectedIds.includes(persona.id);
          const isDisabled = !persona.active;
          const isUnselectable = !isSelected && atMax;

          return (
            <button
              key={persona.id}
              type="button"
              disabled={isDisabled || isUnselectable}
              onClick={() => togglePersona(persona.id)}
              className={`relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors ${
                isDisabled
                  ? 'border-border bg-surface-secondary opacity-50 cursor-not-allowed'
                  : isSelected
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                    : isUnselectable
                      ? 'border-border bg-surface opacity-60 cursor-not-allowed'
                      : 'border-border bg-surface hover:border-primary-300 hover:bg-surface-tertiary cursor-pointer'
              }`}
            >
              {/* Checkbox indicator */}
              <div className="absolute top-3 right-3">
                <div
                  className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-border-strong bg-surface'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pr-8">
                <span className="text-sm font-medium text-text-primary">{persona.name}</span>
                <Badge variant={persona.active ? 'success' : 'default'}>
                  {persona.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <p className="text-xs text-text-secondary line-clamp-2">
                {persona.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
