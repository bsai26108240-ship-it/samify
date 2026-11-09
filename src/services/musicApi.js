import { cleanStreamUrl, decodeHtmlEntities } from './streamUtils';
import { getAllOfflineTracks } from '../utils/offlineStorage';
import { MUSIC_CATALOGUE } from '../data/catalogue';

/**
 * Production JioSaavn client-side API engine.
 *
 * Implements a CORS proxy pipeline across multiple JioSaavn mirror endpoints.
 * When browser CORS or network dropouts occur, each request walks through
 * public proxy endpoints until genuine 320kbps/160kbps streams are returned.
 * If all online mirrors fail, it checks local IndexedDB offline storage
 * and the genuine bundled catalogue before returning empty.
 */

const API_BASES = [
  'https://saavn.dev/api',
  'https://jiosaavn-api-v3.vercel.app',
  'https://jiosaavn-api-sigma.vercel.app',
];

const PROXIES = [
  (url) => url,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

const MAX_LYRICS_ENRICH = 8;
const REQUEST_TIMEOUT_MS = 4000;

/**
 * Walks every mirror and proxy combination until one returns a usable payload.
 * Unwraps proxy payloads (e.g. allorigins { contents: string }).
 */
async function fetchWithProxies(endpoint) {
  let lastError = null;

  for (const base of API_BASES) {
    const targetUrl = `${base}${endpoint}`;
    for (const proxyFn of PROXIES) {
      try {
        const proxiedUrl = proxyFn(targetUrl);
        const res = await fetch(proxiedUrl, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: { Accept: 'application/json' },
        });

        if (res.ok) {
          const raw = await res.json();
          const data = typeof raw.contents === 'string' ? JSON.parse(raw.contents) : raw;
          if (data && (data.data || data.results || Array.isArray(data))) {
            return data;
          }
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error('All live API mirrors and proxies failed.');
}

const extractSongArray = (payload) => {
  if (!payload) return [];
  const candidates = [
    payload?.data?.results,
    payload?.data?.songs,
    payload?.data?.data,
    payload?.data,
    payload?.results,
    payload?.songs,
  ];
  return candidates.find((candidate) => Array.isArray(candidate)) || [];
};

const extractPlaylistArray = (payload) => {
  if (!payload) return [];
  const candidates = [
    payload?.data?.results,
    payload?.data?.playlists,
    payload?.data?.data,
    payload?.data,
    payload?.results,
    payload?.playlists,
  ];
  return candidates.find((candidate) => Array.isArray(candidate)) || [];
};

/**
 * Extracts the highest-resolution cover art (preferring 512x512 / 500x500).
 */
const pickImage = (images) => {
  if (!images) return '';
  if (typeof images === 'string') return images;

  if (Array.isArray(images)) {
    const preferred =
      images.find((img) => img?.quality === '512x512') ||
      images.find((img) => img?.quality === '500x500') ||
      images.find((img) => img?.quality === '150x150') ||
      images[images.length - 1];
    return preferred?.link || preferred?.url || '';
  }

  return images.link || images.url || '';
};

const extractArtistNames = (song = {}) => {
  const primary = song.artists?.primary;

  if (Array.isArray(primary)) {
    const names = primary
      .map((artist) => (typeof artist === 'string' ? artist : artist?.name))
      .filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }

  if (primary && typeof primary === 'object' && primary.name) {
    return primary.name;
  }

  if (Array.isArray(song.primaryArtists)) {
    const names = song.primaryArtists
      .map((artist) => (typeof artist === 'string' ? artist : artist?.name))
      .filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }

  return (
    song.primaryArtists ||
    song.artist ||
    song.singers ||
    song.subtitle ||
    'Unknown Artist'
  );
};

const extractLyrics = (song) => {
  const raw = song?.lyrics ?? song?.plainLyrics;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return raw.lyrics || raw.snippet || '';
  return '';
};

const getAllDownloads = (song = {}) => {
  const candidates = [song.downloadUrl, song.downloadUrls, song.download_urls];
  return candidates.find((candidate) => Array.isArray(candidate)) || [];
};

/**
 * Normalizes a raw JioSaavn song object into Samify's internal track schema.
 * Extracts 320kbps / 160kbps stream URLs and high-res artwork.
 */
export const normalizeTrack = (song = {}) => {
  const downloads = getAllDownloads(song);

  // Prefer 320kbps, then 160kbps, then highest available bitrate
  const bestAudio =
    downloads.find((item) => /^320/.test(item?.quality || '')) ||
    downloads.find((item) => /^160/.test(item?.quality || '')) ||
    downloads[downloads.length - 1] ||
    downloads[0] ||
    {};

  const audioUrl = cleanStreamUrl(
    bestAudio.link ||
      bestAudio.url ||
      song.audioUrl ||
      song.streamUrl ||
      song.media_url ||
      song.url
  );

  const imageUrl =
    pickImage(song.image) ||
    pickImage(song.images) ||
    pickImage(song.coverArt) ||
    pickImage(song.coverUrl) ||
    '';

  const lyrics = extractLyrics(song);
  const artistNames = extractArtistNames(song);

  const albumName =
    typeof song.album === 'string' ? song.album : song.album?.name || 'Single';

  return {
    id: String(song.id || song.songId || song.song_id || Math.random().toString(36).slice(2)),
    title: decodeHtmlEntities(song.name || song.title || 'Unknown Track'),
    artist: decodeHtmlEntities(artistNames),
    album: decodeHtmlEntities(albumName),
    coverUrl: imageUrl || 'https://via.placeholder.com/500',
    coverArt: imageUrl || 'https://via.placeholder.com/500',
    audioUrl,
    streamUrl: audioUrl,
    duration: parseInt(song.duration || song.duration_seconds, 10) || 0,
    language: song.language || '',
    year: song.year || '',
    genre: song.genre || '',
    hasLyrics: Boolean(song.hasLyrics) || Boolean(lyrics),
    lyrics,
    source: 'jiosaavn',
  };
};

const normalizePlaylist = (playlist = {}) => ({
  id: String(playlist.id || playlist.playlistId || playlist.playlist_id || ''),
  title: decodeHtmlEntities(playlist.name || playlist.title || 'Untitled Playlist'),
  description: decodeHtmlEntities(playlist.description || ''),
  coverUrl: pickImage(playlist.image) || 'https://via.placeholder.com/500',
  trackCount: playlist.songCount || playlist.songs?.length || 0,
  source: 'jiosaavn',
});

/**
 * Searches local IndexedDB and bundled catalogue when online search fails.
 * NEVER returns dummy SoundHelix test beats.
 */
const getLocalFallbackTracks = async (term) => {
  const query = (term || '').toLowerCase().trim();

  // 1. Check local IndexedDB offline storage first
  try {
    const offline = await getAllOfflineTracks();
    if (Array.isArray(offline) && offline.length > 0) {
      const offlineMatches = offline.filter((track) => {
        if (!query) return true;
        const text = `${track.title} ${track.artist} ${track.album}`.toLowerCase();
        return text.includes(query);
      });
      if (offlineMatches.length > 0) {
        return offlineMatches;
      }
    }
  } catch (err) {
    console.warn('Failed to query offline tracks:', err);
  }

  // 2. Fall back to bundled catalogue tracks with real audio assets
  if (Array.isArray(MUSIC_CATALOGUE) && MUSIC_CATALOGUE.length > 0) {
    const catalogueMatches = MUSIC_CATALOGUE.filter((track) => {
      if (!query) return true;
      const text = `${track.title} ${track.artist} ${track.album} ${track.genre || ''}`.toLowerCase();
      return text.includes(query);
    });
    if (catalogueMatches.length > 0) {
      return catalogueMatches.map(normalizeTrack);
    }
  }

  return [];
};

/**
 * Fetches lyrics for a single song on demand.
 */
export const getSongLyrics = async (songId) => {
  if (!songId) return '';

  try {
    const data = await fetchWithProxies(
      `/songs/${encodeURIComponent(songId)}/lyrics`
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
 * Search JioSaavn for songs through the proxy failover pipeline.
 * Extracts genuine 320kbps/160kbps audio URLs.
 * If all online mirrors fail, checks local IndexedDB and bundled catalogue.
 */
export const searchSongs = async (
  query,
  { withLyrics = true, limit = 20, throwOnError = false } = {}
) => {
  const term = String(query || '').trim();
  if (!term) return [];

  try {
    const data = await fetchWithProxies(
      `/search/songs?query=${encodeURIComponent(term)}&limit=${limit}`
    );

    const songs = extractSongArray(data);
    const tracks = songs
      .map(normalizeTrack)
      .filter((track) => track.id && track.audioUrl);

    if (tracks.length > 0) {
      return withLyrics ? await enrichTracksWithLyrics(tracks) : tracks;
    }
  } catch (error) {
    console.warn('[MusicAPI] Live search failed across all mirrors & proxies:', error?.message || error);
  }

  // Fallback to IndexedDB / bundled catalogue with real audio
  const fallback = await getLocalFallbackTracks(term);
  if (fallback.length > 0) {
    return fallback;
  }

  if (throwOnError) {
    throw new Error(`No tracks found for "${term}"`);
  }
  return [];
};

/**
 * Fetches an artist's catalogue with proxy pipeline support.
 */
export const getArtistSongs = async (
  artistName,
  { limit = 50, withLyrics = false, throwOnError = false } = {}
) => {
  const term = String(artistName || '').trim();
  if (!term) return [];

  try {
    const tracks = await searchSongs(term, { limit, withLyrics, throwOnError: false });
    if (tracks.length > 0) return tracks;
  } catch (error) {
    if (throwOnError) throw error;
  }

  return await getLocalFallbackTracks(term);
};

/**
 * Returns trending tracks and playlists for the discovery view.
 */
export const getTrendingCharts = async () => {
  try {
    const [songsData, playlistsData] = await Promise.all([
      fetchWithProxies('/search/songs?query=top%20hits&limit=20'),
      fetchWithProxies('/search/playlists?query=trending&limit=10').catch(() => null),
    ]);

    const songs = extractSongArray(songsData);
    const playlists = extractPlaylistArray(playlistsData);

    const tracks = songs
      .map(normalizeTrack)
      .filter((track) => track.id && track.audioUrl);

    if (tracks.length > 0) {
      return {
        tracks,
        playlists: playlists
          .map(normalizePlaylist)
          .filter((playlist) => playlist.id),
      };
    }
  } catch (error) {
    console.warn('[MusicAPI] Charts unavailable:', error?.message || error);
  }

  const fallbackTracks = await getLocalFallbackTracks('');
  return {
    tracks: fallbackTracks.slice(0, 20),
    playlists: [],
  };
};

export const searchMusic = searchSongs;
export const getTrendingMusic = async () => (await getTrendingCharts()).tracks;
