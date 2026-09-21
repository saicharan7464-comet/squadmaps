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
