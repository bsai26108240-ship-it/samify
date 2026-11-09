import { cleanStreamUrl, decodeHtmlEntities } from './streamUtils';

/**
 * JioSaavn client-side API layer with multi-mirror failover.
 *
 * Iterates through a list of public JioSaavn REST mirrors with a 4-second
 * timeout per attempt. If one mirror is down, rate-limited, or returns an
 * empty payload, the next mirror is tried automatically.
 */

const API_BASES = [
  import.meta.env?.VITE_JIOSAAVN_API_BASE,
  'https://saavn.dev/api',
  'https://jiosaavn-api-v3.vercel.app',
  'https://jiosaavn-api-sigma.vercel.app',
  'https://saavn.me',
].filter(Boolean);

const MAX_LYRICS_ENRICH = 8;

// ---------------------------------------------------------------------------
// Core fetch with sequential mirror failover
// ---------------------------------------------------------------------------

/**
 * Tries every mirror in `API_BASES` sequentially for the given `path`.
 * Returns the parsed JSON body from the first mirror that responds with a
 * 2xx status and a non-empty payload, or throws the last encountered error.
 */
const fetchFromMirrors = async (path, { timeout = 4000 } = {}) => {
  let lastError = null;

  for (const base of API_BASES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const url = `${base}${path}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`JioSaavn mirror ${base} returned HTTP ${response.status}`);
      }

      const json = await response.json();

      // Guard against mirrors that return 200 with an empty or error body.
      if (json && typeof json === 'object' && !json.error) {
        return json;
      }

      throw new Error(`Mirror ${base} returned empty or error payload`);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('All JioSaavn mirrors are unavailable');
};

// ---------------------------------------------------------------------------
// Response normalizers
// ---------------------------------------------------------------------------

/**
 * Picks the highest-resolution cover image from the many payload shapes
 * returned by different mirrors.
 */
const pickImage = (images) => {
  if (!images) return '';
  if (typeof images === 'string') return images;

  if (Array.isArray(images)) {
    // Prefer explicit 500×500, then the last (largest) entry.
    const preferred =
      images.find((img) => img?.quality === '500x500') ||
      images[2] ||
      images[images.length - 1];
    return preferred?.link || preferred?.url || '';
  }

  return images.link || images.url || '';
};

/**
 * Extracts lyrics from the many shapes different mirrors return.
 */
const extractLyrics = (song) => {
  if (!song) return null;

  // Some mirrors return a nested lyrics object, others a plain string.
  const raw = song.lyrics;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object') {
    return raw.lyrics || raw.snippet || null;
  }

  // When lyrics aren't inline, report the URL so the UI can lazily fetch.
  if (song.hasLyrics && song.lyricsUrl) return song.lyricsUrl;

  return null;
};

/**
 * Universal response normalizer — turns any JioSaavn song object into
 * Samify's internal track schema regardless of which mirror provided it.
 */
export const normalizeTrack = (song = {}) => {
  // --- Audio URL ---
  const downloads = Array.isArray(song.downloadUrl)
    ? song.downloadUrl
    : Array.isArray(song.downloadUrls)
      ? song.downloadUrls
      : [];

  // Prefer index-based high quality first, then quality-label based.
  const bestAudio =
    downloads.find((item) => item?.quality === '320kbps') ||
    downloads.find((item) => item?.quality === '160kbps') ||
    downloads[4] ||
    downloads[3] ||
    downloads[0] ||
    {};

  const audioUrl = cleanStreamUrl(
    bestAudio.link ||
      bestAudio.url ||
      song.audioUrl ||
      song.media_url ||
      song.url
  );

  // --- Cover Art ---
  const imageUrl =
    pickImage(song.image) ||
    song.album_image ||
    '';

  // --- Lyrics ---
  const lyrics = extractLyrics(song);

  // --- Artist ---
  let artistNames = 'Unknown Artist';
  try {
    if (song.artists?.primary && Array.isArray(song.artists.primary)) {
      const mapped = song.artists.primary.map((a) => a.name).filter(Boolean).join(', ');
      if (mapped) artistNames = mapped;
    } else if (song.primaryArtists) {
      artistNames = song.primaryArtists;
    } else if (song.artist) {
      artistNames = typeof song.artist === 'string'
        ? song.artist
        : Array.isArray(song.artist)
          ? song.artist.map((a) => (typeof a === 'string' ? a : a.name)).join(', ')
          : 'Unknown Artist';
    } else if (song.singers) {
      artistNames = song.singers;
    }
  } catch {
    artistNames = 'Unknown Artist';
  }

  // --- Album ---
  const albumName =
    typeof song.album === 'string'
      ? song.album
      : song.album?.name || 'Single';

  // --- ID ---
  const id = String(song.id || song.songId || Math.random().toString(36).slice(2));

  return {
    id,
    title: decodeHtmlEntities(song.name || song.title || song.songName || 'Untitled Track'),
    artist: decodeHtmlEntities(artistNames),
    album: decodeHtmlEntities(albumName),
    coverUrl: imageUrl || 'https://via.placeholder.com/500',
    coverArt: imageUrl || 'https://via.placeholder.com/500',
    audioUrl,
    streamUrl: audioUrl,
    duration: parseInt(song.duration, 10) || 0,
    language: song.language || '',
    year: song.year || '',
    hasLyrics: Boolean(song.hasLyrics) || Boolean(lyrics),
    lyrics,
    source: 'jiosaavn',
  };
};

const normalizePlaylist = (playlist = {}) => ({
  id: String(playlist.id || playlist.playlistId || ''),
  title: decodeHtmlEntities(playlist.name || playlist.title || 'Untitled Playlist'),
  description: decodeHtmlEntities(playlist.description || ''),
  coverUrl: pickImage(playlist.image) || 'https://via.placeholder.com/500',
  trackCount: playlist.songCount || playlist.songs?.length || 0,
  source: 'jiosaavn',
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches lyrics for a single song on demand.
 */
export const getSongLyrics = async (songId) => {
  if (!songId) return '';

  try {
    const data = await fetchFromMirrors(
      `/songs/${encodeURIComponent(songId)}/lyrics`,
      { timeout: 7000 }
    );
    return data?.data?.lyrics || data?.lyrics || data?.data?.snippet || '';
  } catch {
    return '';
  }
};

const enrichTracksWithLyrics = async (tracks) => {
  if (!tracks.length) return tracks;

  const head = tracks.slice(0, MAX_LYRICS_ENRICH);
  const enrichedHead = await Promise.all(
    head.map(async (track) => {
      if (track.lyrics) return track;
      try {
        const lyrics = await getSongLyrics(track.id);
        return lyrics ? { ...track, lyrics, hasLyrics: true } : track;
      } catch {
        return track;
      }
    })
  );

  return [...enrichedHead, ...tracks.slice(MAX_LYRICS_ENRICH)];
};

/**
 * Extracts the results array from the many response shapes mirrors use.
 */
const extractResults = (data) => {
  const candidates = [
    data?.data?.results,
    data?.data?.songs,
    data?.data,
    data?.results,
    data?.songs,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }

  return [];
};

/**
 * Search JioSaavn for songs with multi-mirror failover.
 *
 * Tries the `/search/songs` endpoint first, falling back to `/search?q=` on
 * mirrors that use that alternate path. Returns normalized Samify tracks
 * filtered to only those with a valid title and audio URL.
 */
export const searchSongs = async (
  query,
  { withLyrics = true, limit = 20, throwOnError = false } = {}
) => {
  const term = String(query || '').trim();
  if (!term) return [];

  try {
    // Primary search path used by saavn.dev and most mirrors
    let data;
    try {
      data = await fetchFromMirrors(
        `/search/songs?query=${encodeURIComponent(term)}&limit=${limit}`
      );
    } catch {
      // Fallback path used by some mirrors
      data = await fetchFromMirrors(
        `/search?q=${encodeURIComponent(term)}&limit=${limit}`
      );
    }

    const songs = extractResults(data);

    const tracks = songs
      .map(normalizeTrack)
      .filter((track) => track.title && track.audioUrl);

    return withLyrics ? enrichTracksWithLyrics(tracks) : tracks;
  } catch (error) {
    console.warn('JioSaavn search is unavailable:', error?.message || error);
    if (throwOnError) throw error;
    return [];
  }
};

/**
 * Fetches an artist's catalogue by searching the artist name.
 */
export const getArtistSongs = async (
  artistName,
  { limit = 50, withLyrics = false, throwOnError = false } = {}
) => {
  const term = String(artistName || '').trim();
  if (!term) return [];

  return searchSongs(term, { limit, withLyrics, throwOnError });
};

/**
 * Returns trending tracks and playlists for the discovery view.
 */
export const getTrendingCharts = async () => {
  try {
    const [songsData, playlistsData] = await Promise.all([
      fetchFromMirrors('/search/songs?query=top%20hits&limit=20').catch(() =>
        fetchFromMirrors('/search?q=top%20hits&limit=20').catch(() => null)
      ),
      fetchFromMirrors('/search/playlists?query=trending&limit=10').catch(() => null),
    ]);

    const songs = songsData ? extractResults(songsData) : [];
    const playlists = playlistsData?.data?.results || playlistsData?.data || [];

    return {
      tracks: songs
        .map(normalizeTrack)
        .filter((track) => track.id && track.audioUrl),
      playlists: (Array.isArray(playlists) ? playlists : [])
        .map(normalizePlaylist)
        .filter((playlist) => playlist.id),
    };
  } catch (error) {
    console.warn('JioSaavn charts are unavailable:', error?.message || error);
    return { tracks: [], playlists: [] };
  }
};

// Backward-compatible aliases for existing callers.
export const searchMusic = searchSongs;
export const getTrendingMusic = async () => (await getTrendingCharts()).tracks;
