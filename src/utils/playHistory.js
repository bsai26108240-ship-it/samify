/**
 * Local play-history tracking that powers the personalized discovery engine.
 *
 * Every successful playback is recorded under `samify_play_history` with a
 * rolling play count so "Most Played" and "Tailored To You" shelves survive
 * across sessions.
 */
const STORAGE_KEY = 'samify_play_history';
const MAX_HISTORY = 80;

const readHistory = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeHistory = (entries) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // Storage full or unavailable — discovery shelves just stay empty.
  }
};

export const getPlayHistory = () => readHistory();

/**
 * Highest-play-frequency tracks, most played first.
 */
export const getTopPlayed = (limit = 10) =>
  readHistory()
    .sort((a, b) => (b.count || 0) - (a.count || 0) || (b.lastPlayed || 0) - (a.lastPlayed || 0))
    .slice(0, limit);

/**
 * The user's most listened genres, ranked. Genre strings can be composites
 * ("Hip-Hop / Trap"), so each part of the string gets its own vote.
 */
export const getTopGenres = (limit = 3) => {
  const tally = new Map();

  readHistory().forEach((entry) => {
    const genre = entry?.genre;
    if (!genre || typeof genre !== 'string') return;

    genre
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        tally.set(part, (tally.get(part) || 0) + (entry.count || 1));
      });
  });

  return Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre]) => genre);
};

/**
 * Records one play of a track, upserting on the track id.
 */
export const recordPlay = (track) => {
  if (!track) return;

  const id = String(track.id || '');
  if (!id) return;

  const history = readHistory();
  const now = Date.now();
  const existing = history.find((entry) => entry.id === id);

  const entry = {
    id,
    title: track.title || 'Unknown Track',
    artist: track.artist || 'Unknown Artist',
    album: track.album || 'Single',
    coverUrl: track.coverUrl || track.coverArt || '',
    genre: track.genre || '',
    duration: track.duration || 0,
    count: existing ? (existing.count || 0) + 1 : 1,
    lastPlayed: now,
  };

  writeHistory([entry, ...history.filter((item) => item.id !== id)]);
};
