import { LatLng } from '../types/navigation';

/**
 * Calculates great-circle distance between two points in meters using Haversine formula
 */
export function haversineDistance(p1: LatLng, p2: LatLng): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates initial bearing from point A to point B in degrees (0 - 360)
 */
export function calculateBearing(start: LatLng, end: LatLng): number {
  const lat1 = (start.lat * Math.PI) / 180;
  const lat2 = (end.lat * Math.PI) / 180;
  const dLng = ((end.lng - start.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Calculates minimum distance from a point to a line segment defined by two coordinates
 */
export function distanceToSegment(p: LatLng, v: LatLng, w: LatLng): number {
  const l2 = Math.pow(v.lat - w.lat, 2) + Math.pow(v.lng - w.lng, 2);
  if (l2 === 0) return haversineDistance(p, v);

  // Consider the line extending the segment, parameterized as v + t (w - v).
  // We find projection of point p onto the line.
  // It falls where t = [(p-v) . (w-v)] / |w-v|^2
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2
    )
  );

  const projection: LatLng = {
    lat: v.lat + t * (w.lat - v.lat),
    lng: v.lng + t * (w.lng - v.lng)
  };

  return haversineDistance(p, projection);
}

/**
 * Checks if current GPS point is further than thresholdMeters from the active polyline
 */
export function isPointOffRoute(point: LatLng, polyline: LatLng[], thresholdMeters = 50): boolean {
  if (!polyline || polyline.length < 2) return false;

  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = distanceToSegment(point, polyline[i], polyline[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
    }
    if (minDistance <= thresholdMeters) {
      return false; // Point is within acceptable corridor
    }
  }

  return minDistance > thresholdMeters;
}

/**
 * Finds the closest point and index on the route polyline
 */
export function findNearestPointOnRoute(point: LatLng, polyline: LatLng[]): { point: LatLng; index: number; distance: number } {
  if (!polyline || polyline.length === 0) {
    return { point, index: 0, distance: 0 };
  }

  let minDistance = Infinity;
  let nearestIndex = 0;
  let closestPoint = polyline[0];

  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distanceToSegment(point, polyline[i], polyline[i + 1]);
    if (d < minDistance) {
      minDistance = d;
      nearestIndex = i;
      closestPoint = polyline[i];
    }
  }

  return { point: closestPoint, index: nearestIndex, distance: minDistance };
}

/**
 * Decodes Google Encoded Polyline string to LatLng array
 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}
