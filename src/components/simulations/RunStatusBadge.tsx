import Badge from '@/components/ui/Badge';

const statusConfig: Record<
  string,
  { variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; label: string }
> = {
  CREATED: { variant: 'default', label: 'Created' },
  RUNNING: { variant: 'info', label: 'Running' },
  EVALUATING: { variant: 'warning', label: 'Evaluating' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  FAILED: { variant: 'danger', label: 'Failed' },
};

interface RunStatusBadgeProps {
  status: string;
}

export default function RunStatusBadge({ status }: RunStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    variant: 'default' as const,
    label: status,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
