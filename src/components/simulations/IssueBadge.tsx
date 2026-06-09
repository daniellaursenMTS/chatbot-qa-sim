type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

interface IssueBadgeProps {
  severity: Severity;
  category: string;
}

const severityClasses: Record<Severity, string> = {
  LOW: 'bg-warning-50 text-warning-700',
  MEDIUM: 'bg-warning-500 text-white',
  HIGH: 'bg-danger-500 text-white',
};

export default function IssueBadge({ severity, category }: IssueBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${severityClasses[severity]}`}
    >
      {severity} &middot; {category}
    </span>
  );
}
