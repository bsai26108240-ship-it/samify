/**
 * Dominant-color extraction from album artwork used to build the dynamic
 * gradient mesh behind the full-screen player and lyrics overlays.
 *
 * Canvas sampling fails silently (returns null) when the image is
 * cross-origin without CORS headers — callers must keep a static fallback.
 */
const PALETTE_CACHE = new Map();

const MIN_ALPHA = 64;
const COLOR_BINS = 14;

const toHexString = (r, g, b) =>
  '#' + [r, g, b].map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')).join('');

/**
 * Extracts the three most vibrant, distinct colors from an image.
 */
export const extractPalette = (src) =>
  new Promise((resolve) => {
    if (!src || typeof src !== 'string') {
      resolve(null);
      return;
    }

    const cached = PALETTE_CACHE.get(src);
    if (cached !== undefined) {
      resolve(cached);
      return;
    }

    // Never let a busted URL or tainted canvas reject — always resolve null.
    const fail = () => {
      PALETTE_CACHE.set(src, null);
      resolve(null);
    };

    try {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.referrerPolicy = 'no-referrer';

      image.onload = () => {
        try {
          const size = 48;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) return fail();

          context.drawImage(image, 0, 0, size, size);
          const { data } = context.getImageData(0, 0, size, size);

          // Hue-bucketed histograms: each bucket keeps its brightest,
          // most saturated representative pixel so gradients stay vibrant.
          const buckets = new Map();

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a < MIN_ALPHA) continue;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            const saturation = max === 0 ? 0 : delta / max;
            if (saturation < 0.12) continue; // Skip greys/near-black/near-white.

            let hue = 0;
            if (delta !== 0) {
              if (max === r) hue = ((g - b) / delta) % 6;
              else if (max === g) hue = (b - r) / delta + 2;
              else hue = (r - g) / delta + 4;
              hue = (hue * 60 + 360) % 360;
            }

            const bucket = Math.round(hue / (360 / COLOR_BINS)) % COLOR_BINS;
            const current = buckets.get(bucket);
            const weight = saturation * (max / 255);

            if (!current || weight > current.weight) {
              buckets.set(bucket, { r, g, b, weight });
            }
          }

          if (buckets.size === 0) return fail();

          const colors = Array.from(buckets.values())
            .sort((x, y) => y.weight - x.weight)
            .slice(0, 3)
            .map(({ r, g, b }, index) => {
              // Nudge each swatch toward a mid-tone so text stays readable.
              const lift = index === 0 ? 0.82 : index === 1 ? 0.6 : 0.42;
              return toHexString(r * lift + 20, g * lift + 24, b * lift + 30);
            });

          while (colors.length < 3) colors.push('#10b981');

          PALETTE_CACHE.set(src, colors);
          resolve(colors);
        } catch {
          fail();
        }
      };

      image.onerror = fail;
      image.src = src;
    } catch {
      fail();
    }
  });

/** Neutral fallback mesh when artwork cannot be sampled. */
export const DEFAULT_GRADIENT_PALETTE = ['#0e7490', '#10b981', '#1d4ed8'];

/**
 * Convenience: palette for a cover URL, always resolving to 3 colors.
 */
export const getTrackPalette = async (coverUrl) => {
  const palette = await extractPalette(coverUrl);
  return palette || DEFAULT_GRADIENT_PALETTE;
};
