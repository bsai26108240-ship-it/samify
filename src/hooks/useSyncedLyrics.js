import { useState, useEffect } from 'react';
import { fetchLyrics } from '../utils/lyricsService';

/**
 * Parses LRC lyrics string format into timestamped objects
 * Input: "[00:14.20] Yeah, they wishin..."
 * Output: [{ time: 14.2, text: "Yeah, they wishin..." }]
 */
const parseLrc = (lrcString) => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3], 10);
      
      const totalTime = minutes * 60 + seconds + (milliseconds > 99 ? milliseconds / 1000 : milliseconds / 100);
      const text = line.replace(timeRegex, '').trim();

      if (text) {
        parsed.push({ time: totalTime, text });
      }
    }
  }

  return parsed.sort((a, b) => a.time - b.time);
};

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
            setLyrics(parseLrc(data.syncedLyrics));
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
