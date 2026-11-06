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
      return;
    }

    let isMounted = true;

    const loadLyrics = async () => {
      setLoading(true);
      try {
        const data = await fetchLyrics(trackTitle, artistName);
        if (!isMounted) return;

        if (data.syncedLyrics) {
          setLyrics(parseLrc(data.syncedLyrics));
        } else if (data.plainLyrics) {
          const plainLines = data.plainLyrics.split('\n').map((text, idx) => ({ time: idx * 4, text }));
          setLyrics(plainLines);
        } else {
          setLyrics([]);
        }
      } catch (err) {
        console.error("LrcLib Lyrics fetch failed:", err);
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
