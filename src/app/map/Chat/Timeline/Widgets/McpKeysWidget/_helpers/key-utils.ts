export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function isExpired(expiresAt: Date | null): boolean {
  return expiresAt !== null && expiresAt < new Date();
}
