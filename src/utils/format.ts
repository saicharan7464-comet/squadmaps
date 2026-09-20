/**
 * Formats meters into human-readable distance (e.g. "450 m" or "18.4 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formats duration in seconds into human-readable time (e.g. "45 min" or "2 hr 15 min")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return '1 min';
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Formats speed in km/h
 */
export function formatSpeed(kmh: number): string {
  const rounded = Math.round(Math.max(0, kmh));
  return `${rounded} km/h`;
}

/**
 * Computes and formats ETA timestamp into clock string (e.g. "5:42 PM")
 */
export function formatETA(durationSeconds: number): string {
  const arrivalDate = new Date(Date.now() + durationSeconds * 1000);
  return arrivalDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Formats timestamp into relative "Last seen X ago" string
 */
export function formatLastSeen(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}
