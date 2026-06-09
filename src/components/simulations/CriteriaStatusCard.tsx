import Badge from '@/components/ui/Badge';

type CriterionStatus = 'PASS' | 'WARNING' | 'FAIL';

const statusVariant: Record<CriterionStatus, 'success' | 'warning' | 'danger'> = {
  PASS: 'success',
  WARNING: 'warning',
  FAIL: 'danger',
};

interface CriteriaResult {
  id: string;
  criterion: string;
  status: CriterionStatus;
  explanation: string;
  suggestedFix: string | null;
  relatedMessageIds?: string | null;
  personaRun?: { personaSnapshot: { name: string } } | null;
}

interface CriteriaStatusCardProps {
  result: CriteriaResult;
}

export default function CriteriaStatusCard({ result }: CriteriaStatusCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary">{result.criterion}</h4>
        <Badge variant={statusVariant[result.status]}>{result.status}</Badge>
      </div>
      <p className="text-sm text-text-secondary">{result.explanation}</p>
      {result.suggestedFix && (
        <div className="mt-2 rounded bg-surface-secondary px-3 py-2">
          <p className="text-xs font-medium text-text-tertiary">Suggested Fix</p>
          <p className="text-sm text-text-secondary">{result.suggestedFix}</p>
        </div>
      )}
    </div>
  );
}
