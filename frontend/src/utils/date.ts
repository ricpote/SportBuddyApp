export function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (diffHours > 0) return `em ${diffHours}h`;
    if (diffHours < 0) return `há ${Math.abs(diffHours)}h`;
    return 'agora';
  }
  if (diffDays === 1) return 'amanhã';
  if (diffDays === -1) return 'ontem';
  if (diffDays > 1 && diffDays <= 7) return `em ${diffDays} dias`;
  if (diffDays < -1 && diffDays >= -7) return `há ${Math.abs(diffDays)} dias`;

  return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: diffDays > 365 || diffDays < -365 ? 'numeric' : undefined });
}
