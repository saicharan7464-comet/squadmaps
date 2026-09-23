/**
 * Normalizes a raw squad code, user input, or URL into a canonical squad code.
 * Rules:
 * - Decodes URL components
 * - Trims whitespace
 * - Removes accidental "#" prefixes (e.g. "#SQ-W0K6")
 * - Extracts code from full URL paths (e.g. "/join/SQ-W0K6", "?join=SQ-W0K6")
 * - Converts to uppercase
 * - Supports short alphanumeric codes (e.g. "W0K6" -> "SQ-W0K6")
 *
 * Examples:
 * "#SQ-W0K6" -> "SQ-W0K6"
 * "sq-w0k6" -> "SQ-W0K6"
 * " SQ-W0K6 " -> "SQ-W0K6"
 * "https://squadmaps.vercel.app/join/SQ-W0K6" -> "SQ-W0K6"
 * "https://squadmaps.vercel.app/?join=SQ-W0K6" -> "SQ-W0K6"
 */
export const normalizeSquadCode = (input: string): string => {
  if (!input) return '';

  let cleaned = input;
  try {
    cleaned = decodeURIComponent(input);
  } catch {}

  cleaned = cleaned.trim();

  // Strip leading '#' characters
  cleaned = cleaned.replace(/^#+/, '').trim();

  // Check for URL query parameter (?join=XYZ or &join=XYZ or #join=XYZ)
  const queryMatch = cleaned.match(/[?&#]join=([A-Za-z0-9_-]+)/i);
  if (queryMatch) {
    let extracted = queryMatch[1].toUpperCase();
    if (!extracted.startsWith('SQ-') && /^[A-Za-z0-9]{3,8}$/.test(extracted)) {
      extracted = `SQ-${extracted}`;
    }
    return extracted;
  }

  // Check for /join/XYZ path in a URL or relative path
  const pathMatch = cleaned.match(/\/join\/([A-Za-z0-9_-]+)/i);
  if (pathMatch) {
    let extracted = pathMatch[1].toUpperCase();
    if (!extracted.startsWith('SQ-') && /^[A-Za-z0-9]{3,8}$/.test(extracted)) {
      extracted = `SQ-${extracted}`;
    }
    return extracted;
  }

  // Direct regex search for SQ-XXXX pattern
  const sqMatch = cleaned.match(/SQ-[A-Za-z0-9]+/i);
  if (sqMatch) {
    return sqMatch[0].toUpperCase();
  }

  // Raw short alphanumeric code without prefix (e.g., "W0K6" or "92A4")
  if (/^[A-Za-z0-9]{3,8}$/.test(cleaned)) {
    return `SQ-${cleaned.toUpperCase()}`;
  }

  return cleaned.toUpperCase();
};

/**
 * Generates an invite URL that uses the production origin dynamically:
 * `${window.location.origin}/join/${encodeURIComponent(squadCode)}`
 */
export const getInviteUrl = (squadCode: string): string => {
  if (!squadCode) return '';
  const normalized = normalizeSquadCode(squadCode);
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://squadmaps.vercel.app';
  return `${origin}/join/${encodeURIComponent(normalized)}`;
};

/**
 * Extracts a valid Squad ID from various inputs (URL, text, code).
 * Backward-compatible wrapper around normalizeSquadCode.
 */
export const parseSquadId = (input: string): string | null => {
  if (!input) return null;
  const normalized = normalizeSquadCode(input);
  if (normalized && /^SQ-[A-Za-z0-9]+$/.test(normalized)) {
    return normalized;
  }
  return null;
};
