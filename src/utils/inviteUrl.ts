/**
 * Generates an invite URL that works across all environments:
 * - Local dev (localhost)
 * - Local Wi-Fi network (192.168.x.x)
 * - Vercel / Netlify / Firebase / Cloudflare
 * - Subdirectory deployments (e.g. GitHub Pages)
 *
 * Uses query parameter `?join=CODE` so that static web servers always serve index.html
 * rather than returning HTTP 404 for virtual subpaths like `/join/CODE`.
 */
export const getInviteUrl = (squadId: string): string => {
  if (!squadId) return '';
  const origin = window.location.origin;
  // Strip any subpath after /join/ or trailing slash
  const pathname = window.location.pathname.replace(/\/join\/.*$/i, '').replace(/\/$/, '');
  return `${origin}${pathname}/?join=${encodeURIComponent(squadId)}`;
};

/**
 * Extracts a valid Squad ID from various inputs:
 * - Full invite URLs (e.g., https://squadmaps.vercel.app/?join=SQ-92A4)
 * - Path-based URLs (e.g., /join/SQ-92A4)
 * - Hash URLs (e.g., #join=SQ-92A4)
 * - Text containing an SQ-XXXX code
 * - Raw codes (e.g., SQ-92A4 or 92A4)
 */
export const parseSquadId = (input: string): string | null => {
  if (!input) return null;
  const trimmed = input.trim();

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

