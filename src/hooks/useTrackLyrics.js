import { useMemo } from 'react';
import { useSyncedLyrics } from './useSyncedLyrics';

const LRC_TIMESTAMP = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

const toSeconds = (match) => {
  const minutes = parseInt(match[1], 10) || 0;
  const seconds = parseInt(match[2], 10) || 0;
  const fraction = match[3]
    ? parseInt(match[3].padEnd(3, '0'), 10) / 1000
    : 0;

  return minutes * 60 + seconds + fraction;
};

/**
 * Normalizes the many lyric shapes used across the app into a sorted array of
 * `{ time, text }` lines.
 *
 * Supported inputs:
 * - Catalogue arrays: [{ time: 12.4, text: '...' }]
 * - API plain strings: "line one\nline two"
 * - LRC strings: "[00:12.40] line one"
 */
export const parseLyricsInput = (lyrics) => {
  try {
    if (!lyrics) return [];

    if (Array.isArray(lyrics)) {
      return lyrics
        .map((line, index) => {
          if (typeof line === 'string') {
            return { time: index * 4, text: line.trim() };
          }

          const time = Number(line?.time ?? line?.timestamp ?? index * 4);
          return {
            time: Number.isFinite(time) ? time : index * 4,
            text: String(line?.text ?? line?.line ?? '').trim(),
          };
        })
        .filter((line) => line.text)
        .sort((a, b) => a.time - b.time);
    }

    if (typeof lyrics !== 'string') return [];

    const rawLines = lyrics.split(/\r?\n/);
    const timed = [];

    for (const rawLine of rawLines) {
      LRC_TIMESTAMP.lastIndex = 0;
      const timestamps = [];
      let match = LRC_TIMESTAMP.exec(rawLine);

      while (match) {
        timestamps.push(toSeconds(match));
        match = LRC_TIMESTAMP.exec(rawLine);
      }

      if (timestamps.length === 0) continue;

      const text = rawLine.replace(LRC_TIMESTAMP, '').trim();
      if (!text) continue;

      for (const time of timestamps) {
        timed.push({ time, text });
      }
    }

    if (timed.length > 0) {
      return timed.sort((a, b) => a.time - b.time);
    }

    // Plain lyrics have no timestamps; spread them across the track as a rough
    // fallback so the karaoke view can still follow along.
    return rawLines
      .map((text, index) => ({ time: index * 4, text: text.trim() }))
      .filter((line) => line.text);
  } catch (err) {
    // If anything goes wrong parsing, return a safe plain-text fallback so
    // the UI never crashes from malformed lyric data.
    console.warn('Lyrics parsing failed, returning empty:', err?.message);
    if (typeof lyrics === 'string') {
      return lyrics
        .split(/\r?\n/)
        .map((line) => line.replace(/\[.*?\]/g, '').trim())
        .filter(Boolean)
        .map((text, idx) => ({ time: idx * 4, text }));
    }
    return [];
  }
};

/**
 * Returns the index of the lyric line that should be highlighted for the given
 * playback position. Returns -1 before the first timestamp.
 */
export const getActiveLyricIndex = (lyrics, currentTime = 0) => {
  if (!Array.isArray(lyrics) || lyrics.length === 0) return -1;

  let activeIndex = -1;

  for (let index = 0; index < lyrics.length; index += 1) {
    if (currentTime >= lyrics[index].time) {
      activeIndex = index;
    } else {
      break;
    }
  }

  return activeIndex;
};

/**
 * Returns true when lyrics already carry real timestamps (LRC or a catalogue
 * array). Plain-text lyrics still get a timed fallback, but we try LRCLIB first
 * so karaoke sync stays millisecond-accurate when a synced version exists.
 */
export const hasExplicitTimestamps = (lyrics) => {
  if (Array.isArray(lyrics)) {
    return lyrics.some(
      (line) =>
        line &&
        typeof line === 'object' &&
        Number.isFinite(Number(line.time ?? line.timestamp))
    );
  }

  if (typeof lyrics === 'string') {
    LRC_TIMESTAMP.lastIndex = 0;
    const hasTimestamp = LRC_TIMESTAMP.test(lyrics);
    LRC_TIMESTAMP.lastIndex = 0;
    return hasTimestamp;
  }

  return false;
};

/**
 * Resolves lyrics for a track: embedded synced lyrics first, then the LRCLIB
 * lookup, then embedded plain-text lines with timed auto-scroll fallback.
 */
export const useTrackLyrics = (track) => {
  const embeddedLyrics = useMemo(
    () => parseLyricsInput(track?.lyrics),
    [track?.lyrics]
  );

  const hasEmbeddedLyrics = embeddedLyrics.length > 0;
  const embeddedIsSynced = useMemo(
    () => hasExplicitTimestamps(track?.lyrics),
    [track?.lyrics]
  );

  // Fetch a synced version when we have no lyrics or only plain-text lyrics.
  const shouldFetch = !hasEmbeddedLyrics || !embeddedIsSynced;
  const { lyrics: fetchedLyrics, loading } = useSyncedLyrics(
    shouldFetch ? track?.title : null,
    shouldFetch ? track?.artist : null
  );

  const useFetched = shouldFetch && fetchedLyrics.length > 0;

  return {
    lyrics: useFetched ? fetchedLyrics : embeddedLyrics,
    loading: shouldFetch && !useFetched ? loading : false,
    hasEmbeddedLyrics,
    isSynced: useFetched || embeddedIsSynced,
  };
};
