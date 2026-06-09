import { format } from "date-fns";

export function formatDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd HH:mm:ss");
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes === 0) return `${remaining}s`;
  return `${minutes}m ${remaining}s`;
}
