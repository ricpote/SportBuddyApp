export function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    if (Math.abs(diffMinutes) < 1) return 'now';
    if (Math.abs(diffMinutes) < 60) {
      return diffMinutes > 0 ? `in ${diffMinutes}m` : `${Math.abs(diffMinutes)}m ago`;
    }
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (diffHours > 0) return `in ${diffHours}h`;
    if (diffHours < 0) return `${Math.abs(diffHours)}h ago`;
    return 'now';
  }
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDays > 365 || diffDays < -365 ? 'numeric' : undefined });
}
