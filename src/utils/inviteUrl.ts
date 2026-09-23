import { Squad } from '../types/squad';
import { Route, VehicleMode } from '../types/navigation';
import { localSyncService } from '../services/sync/localSyncService';

export interface CompactSquadPayload {
  id: string; // squadId e.g. "SQ-78BR"
  n: string;  // squadName
  d: string;  // destination name
  c: [number, number]; // [lat, lng]
  h: string;  // hostName
  v: VehicleMode; // vehicleMode ('car' | 'bike' | 'walk' | 'bus')
  km: number; // distance in km
  m: number;  // duration in minutes
  p?: [number, number][]; // sampled polyline coordinates
}

// Browser-compatible Base64URL
export const toBase64Url = (str: string): string => {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const fromBase64Url = (base64Url: string): string => {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(escape(atob(base64)));
};

/**
 * Samples a polyline array down to at most `maxPoints` coordinates
 * to keep URL length ultra-compact while preserving the route shape.
 */
export const samplePolyline = (poly: { lat: number; lng: number }[], maxPoints = 20): [number, number][] => {
  if (!poly || poly.length === 0) return [];
  if (poly.length <= maxPoints) {
    return poly.map((p) => [Number(p.lat.toFixed(4)), Number(p.lng.toFixed(4))]);
  }
  const step = (poly.length - 1) / (maxPoints - 1);
  const result: [number, number][] = [];
  for (let i = 0; i < maxPoints; i++) {
    const pt = poly[Math.round(i * step)];
    result.push([Number(pt.lat.toFixed(4)), Number(pt.lng.toFixed(4))]);
  }
  return result;
};

/**
 * Packs a full Squad object into a compact payload for URL sharing.
 */
export const extractCompactPayload = (squad: Squad): CompactSquadPayload => {
  return {
    id: squad.squadId,
    n: squad.name,
    d: squad.destination,
    c: [
      Number((squad.destinationCoordinates?.lat || 0).toFixed(4)),
      Number((squad.destinationCoordinates?.lng || 0).toFixed(4))
    ],
    h: squad.hostName || 'Squad Leader',
    v: squad.vehicleMode || 'car',
    km: Math.round((squad.canonicalRoute?.distance || 10000) / 100) / 10,
    m: Math.round((squad.canonicalRoute?.duration || 1200) / 60),
    p: samplePolyline(squad.canonicalRoute?.polyline || [], 20)
  };
};

/**
 * Encodes a compact squad payload into a base64url string.
 */
export const encodeSquadPayload = (payload: CompactSquadPayload): string => {
  try {
    const json = JSON.stringify(payload);
    return toBase64Url(json);
  } catch (e) {
    console.warn('Failed to encode squad payload:', e);
    return '';
  }
};

/**
 * Reconstructs a full Squad object from an encoded base64url payload.
 */
export const decodeSquadPayload = (encoded: string): Squad | null => {
  try {
    const json = fromBase64Url(encoded);
    const data: CompactSquadPayload = JSON.parse(json);
    if (!data.id || !data.d || !data.c) return null;

    const lat = data.c[0];
    const lng = data.c[1];
    const polyline =
      data.p && data.p.length > 0
        ? data.p.map(([plat, plng]) => ({ lat: plat, lng: plng }))
        : [{ lat, lng }];

    const canonicalRoute: Route = {
      id: `route-${data.id}`,
      name: `Route to ${data.d}`,
      distance: (data.km || 10) * 1000,
      duration: (data.m || 20) * 60,
      summary: `Trip to ${data.d}`,
      polyline,
      steps: [],
      bounds: {
        north: lat + 0.05,
        south: lat - 0.05,
        east: lng + 0.05,
        west: lng - 0.05
      }
    };

    const squad: Squad = {
      squadId: data.id,
      hostId: `host_${data.id}`,
      hostName: data.h || 'Squad Leader',
      name: data.n || `Trip to ${data.d}`,
      destination: data.d,
      destinationCoordinates: { lat, lng },
      vehicleMode: data.v || 'car',
      createdAt: Date.now(),
      status: 'active',
      canonicalRoute,
      settings: {
        allowMemberVehicleChange: true,
        fallingBehindThresholdKm: 3,
        fallingBehindThresholdMins: 7,
        autoReroute: true
      },
      activeRegroupPoint: null
    };

    return squad;
  } catch (e) {
    console.warn('Failed to decode squad payload:', e);
    return null;
  }
};

/**
 * Inspects a URL for an embedded squad payload (?sq=... or &sq=...),
 * decodes it, and saves it into local storage so joining works instantly on ANY device.
 */
export const extractAndCacheSquadFromUrl = (url: string): Squad | null => {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url, 'https://squadmaps.vercel.app');
    const sqParam = parsedUrl.searchParams.get('sq') || parsedUrl.searchParams.get('squad');
    if (sqParam) {
      const decoded = decodeSquadPayload(sqParam);
      if (decoded) {
        localSyncService.saveSquad(decoded);
        return decoded;
      }
    }
  } catch {
    // Regex fallback if URL constructor fails
    const match = url.match(/[?&](?:sq|squad)=([A-Za-z0-9_-]+)/);
    if (match && match[1]) {
      const decoded = decodeSquadPayload(match[1]);
      if (decoded) {
        localSyncService.saveSquad(decoded);
        return decoded;
      }
    }
  }
  return null;
};

/**
 * Generates an invite URL that works across all devices, platforms, and offline states:
 * - Includes squad ID in ?join=CODE
 * - Embeds compact squad metadata in &sq=... so other devices can reconstruct the squad
 *   even if Firebase is quota-exhausted or offline!
 */
export const getInviteUrl = (squadId: string, squad?: Squad | null): string => {
  if (!squadId) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://squadmaps.vercel.app';
  const pathname = typeof window !== 'undefined'
    ? window.location.pathname.replace(/\/join\/.*$/i, '').replace(/\/$/, '')
    : '';

  let url = `${origin}${pathname}/?join=${encodeURIComponent(squadId)}`;

  // Automatically attach compact payload if squad is provided or found locally
  const currentSquad = squad || localSyncService.getSquad(squadId);
  if (currentSquad) {
    const payload = extractCompactPayload(currentSquad);
    const encoded = encodeSquadPayload(payload);
    if (encoded) {
      url += `&sq=${encoded}`;
    }
  }

  return url;
};

/**
 * Extracts a valid Squad ID from various inputs:
 * - Full invite URLs (e.g., https://squadmaps.vercel.app/?join=SQ-92A4)
 * - Path-based URLs (e.g., /join/SQ-92A4)
 * - Hash URLs (e.g., #join=SQ-92A4)
 * - Text containing an SQ-XXXX code
 * - Raw codes (e.g., SQ-92A4 or 92A4)
 *
 * Also automatically caches embedded squad data if present in the URL.
 */
export const parseSquadId = (input: string): string | null => {
  if (!input) return null;
  const trimmed = input.trim();

  // Cache embedded payload if present in URL
  extractAndCacheSquadFromUrl(trimmed);

  // 1. Direct match for SQ-XXXX pattern
  const sqMatch = trimmed.match(/SQ-[A-Za-z0-9]+/i);
  if (sqMatch) {
    return sqMatch[0].toUpperCase();
  }

  // 2. Query param or hash (?join=XYZ or #join=XYZ)
  const joinParamMatch = trimmed.match(/[?&#]join=([A-Za-z0-9_-]+)/i);
  if (joinParamMatch) {
    let id = joinParamMatch[1].toUpperCase();
    if (!id.startsWith('SQ-')) id = `SQ-${id}`;
    return id;
  }

  // 3. /join/XYZ path
  const pathMatch = trimmed.match(/\/join\/([A-Za-z0-9_-]+)/i);
  if (pathMatch) {
    let id = pathMatch[1].toUpperCase();
    if (!id.startsWith('SQ-')) id = `SQ-${id}`;
    return id;
  }

  // 4. Raw short alphanumeric code (e.g., "92A4")
  if (/^[A-Za-z0-9]{3,8}$/.test(trimmed)) {
    return `SQ-${trimmed.toUpperCase()}`;
  }

  return null;
};
