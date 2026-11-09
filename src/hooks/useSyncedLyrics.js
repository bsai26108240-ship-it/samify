import { useState, useEffect } from 'react';
import { fetchLyrics } from '../utils/lyricsService';

/**
 * Parses LRC lyrics string format into timestamped objects.
 *
 * Handles both 2- and 3-digit fractions correctly: `[00:14.20]` becomes
 * 14.200s (not 14.2 or 14.02), so highlighting stays in sync with
 * `audioRef.currentTime`.
 *
 * Input: "[00:14.20] Yeah, they wishin..."
 * Output: [{ time: 14.2, text: "Yeah, they wishin..." }]
 */
export function parseLRC(lrcString) {
  if (!lrcString || typeof lrcString !== 'string') return [];
  const lines = lrcString.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millis = parseInt(match[3].padEnd(3, '0'), 10);
      const timeInSeconds = minutes * 60 + seconds + millis / 1000;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        result.push({ time: timeInSeconds, text });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

export const useSyncedLyrics = (trackTitle, artistName) => {
  const [lyrics, setLyrics] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trackTitle) {
      setLyrics([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadLyrics = async () => {
      setLoading(true);
      try {
        const data = await fetchLyrics(trackTitle, artistName);
        if (!isMounted) return;

        try {
          if (data.syncedLyrics) {
            setLyrics(parseLRC(data.syncedLyrics));
          } else if (data.plainLyrics) {
            const plainLines = data.plainLyrics
              .split('\n')
              .filter((line) => line.trim())
              .map((text, idx) => ({ time: idx * 4, text: text.trim() }));
            setLyrics(plainLines);
          } else {
            setLyrics([]);
          }
        } catch (parseErr) {
          // LRC timestamp parsing failed — fall back to raw plain text so
          // the karaoke view can still show *something* instead of crashing.
          console.warn('LRC parsing failed, falling back to plain text:', parseErr?.message);
          if (isMounted) {
            try {
              const fallbackLines = (data.syncedLyrics || data.plainLyrics || '')
                .split('\n')
                .map((line) => line.replace(/\[.*?\]/g, '').trim())
                .filter(Boolean)
                .map((text, idx) => ({ time: idx * 4, text }));
              setLyrics(fallbackLines);
            } catch {
              setLyrics([]);
            }
          }
        }
      } catch (err) {
        console.warn("LRCLIB lyrics are unavailable:", err?.message || err);
        if (isMounted) setLyrics([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLyrics();

    return () => {
      isMounted = false;
    };
  }, [trackTitle, artistName]);

  return { lyrics, loading };
};
