import { LatLng, Route } from '../types/navigation';
import { Squad } from '../types/squad';

/**
 * Optimizes route polyline for storage and real-time syncing.
 * Very long routes (e.g. 2,000+ km) contain 20,000 to 80,000 coordinates in full overview.
 * This can easily exceed Firestore's 1MB document limit and HTML5 LocalStorage's 5MB quota.
 * This helper downsamples points smoothly to max ~1,200 points while preserving the exact
 * start, intermediate trajectory, and destination coordinates.
 */
export function optimizeRouteForStorage(route: Route, maxPoints: number = 1200): Route {
  if (!route || !route.polyline || route.polyline.length <= maxPoints) {
    return route;
  }

  const polyline = route.polyline;
  const len = polyline.length;
  const step = Math.ceil(len / maxPoints);
  const sampled: LatLng[] = [];

  for (let i = 0; i < len; i += step) {
    sampled.push(polyline[i]);
  }

  // Ensure the destination point is strictly preserved
  const lastOriginal = polyline[len - 1];
  const lastSampled = sampled[sampled.length - 1];
  if (
    !lastSampled ||
    lastSampled.lat !== lastOriginal.lat ||
    lastSampled.lng !== lastOriginal.lng
  ) {
    sampled.push(lastOriginal);
  }

  return {
    ...route,
    polyline: sampled
  };
}

export function optimizeSquadForStorage(squad: Squad): Squad {
  if (!squad || !squad.canonicalRoute) return squad;
  return {
    ...squad,
    canonicalRoute: optimizeRouteForStorage(squad.canonicalRoute)
  };
}
