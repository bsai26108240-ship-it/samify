/**
 * Shared helpers for cleaning and validating audio stream URLs returned by
 * third-party music APIs before handing them to an HTML5 <audio> element.
 */

export const decodeHtmlEntities = (value) =>
  String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&#0*38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*34;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/**
 * Returns a normalized http(s) URL, or an empty string when the input is not
 * a usable stream URL. Also upgrades protocol-relative and http URLs.
 */
export const cleanStreamUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  let url = decodeHtmlEntities(rawUrl).trim();
  if (!url) return '';

  if (url.startsWith('//')) url = `https:${url}`;
  url = url.replace(/^http:\/\//i, 'https://');

  try {
    const base =
      typeof window !== 'undefined' && window.location
        ? window.location.origin
        : 'http://localhost';
    const parsed = new URL(url, base);

    if (parsed.protocol === 'blob:' || parsed.protocol === 'data:') {
      return url;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
};

export const isSameOriginUrl = (url) => {
  if (!url) return false;

  try {
    const base =
      typeof window !== 'undefined' && window.location
        ? window.location.origin
        : 'http://localhost';
    return new URL(url, base).origin === base;
  } catch {
    return false;
  }
};

/**
 * Picks the first valid stream URL from a track-like object.
 */
export const extractStreamUrl = (track) => {
  const candidates = [
    track?.audioUrl,
    track?.streamUrl,
    track?.downloadUrl,
    track?.url,
  ];

  for (const candidate of candidates) {
    const cleaned = cleanStreamUrl(candidate);
    if (cleaned) return cleaned;
  }

  return '';
};

export const isRemoteUrl = (url) => /^https?:\/\//i.test(String(url || ''));

/**
 * A universally reachable, royalty-free demo stream. Used as the last-resort
 * playback source when a track's primary (and per-track fallback) URL fails,
 * so the player never goes fully silent.
 *
 * Replace with a licensed CDN asset before shipping to production.
 */
export const DEFAULT_FALLBACK_STREAM =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

/**
 * Returns the best recovery URL for a track that failed to load: the track's
 * own per-track fallback stream first, then the global demo stream.
 */
export const getFallbackStreamUrl = (track) => {
  const candidates = [track?.fallbackAudioUrl, track?.fallbackStreamUrl, DEFAULT_FALLBACK_STREAM];

  for (const candidate of candidates) {
    const cleaned = cleanStreamUrl(candidate);
    if (cleaned) return cleaned;
  }

  return '';
};
