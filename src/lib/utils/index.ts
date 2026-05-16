/**
 * Truncate text to a specified length with ellipsis.
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Remove HTML tags from a string.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Format a date string to a human-readable format.
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a filesize string from nyaa.si (e.g., "1.2 GiB") to a standardized format.
 */
export function formatFilesize(size: string): string {
  return size.trim();
}

/**
 * Format a number with commas.
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Calculate time until airing from seconds.
 */
export function timeUntilAiring(seconds: number): string {
  if (seconds <= 0) return 'Airing now';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Get a color based on score.
 */
export function scoreColor(score: number | null): string {
  if (!score) return 'text-gray-400';
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Format score for display.
 */
export function formatScore(score: number | null): string {
  if (!score) return 'N/A';
  return (score / 10).toFixed(1);
}

/**
 * Convert status string to a display-friendly format.
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    FINISHED: 'Finished',
    RELEASING: 'Airing',
    NOT_YET_RELEASED: 'Upcoming',
    CANCELLED: 'Cancelled',
    HIATUS: 'On Hiatus',
  };
  return statusMap[status] || status;
}

/**
 * Get status color class.
 */
export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    FINISHED: 'bg-green-500/20 text-green-400 border-green-500/30',
    RELEASING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    NOT_YET_RELEASED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
    HIATUS: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}
