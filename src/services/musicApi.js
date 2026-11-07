const BASE_URL = 'https://saavn.dev/api';

/**
 * Normalizes raw API response objects into Samify's internal track schema.
 */
const normalizeTrack = (song) => {
  // Select highest available quality audio URL (320kbps -> 160kbps -> 96kbps)
  const downloadUrls = song.downloadUrl || [];
  const bestAudio = downloadUrls.find(d => d.quality === '320kbps') || 
                    downloadUrls.find(d => d.quality === '160kbps') || 
                    downloadUrls[downloadUrls.length - 1] || {};

  // Select highest quality cover artwork
  const images = song.image || [];
  const bestImage = images.find(img => img.quality === '500x500') || 
                    images[images.length - 1] || {};

  return {
    id: song.id,
    title: song.name ? song.name.replace(/&quot;/g, '"').replace(/&#039;/g, "'") : 'Unknown Track',
    artist: song.artists?.primary?.[0]?.name || song.artist || 'Unknown Artist',
    album: song.album?.name || 'Single',
    coverUrl: bestImage.link || bestImage.url || 'https://via.placeholder.com/500',
    audioUrl: bestAudio.link || bestAudio.url || '',
    duration: parseInt(song.duration, 10) || 0,
    source: 'jiosaavn'
  };
};

export const searchMusic = async (query) => {
  if (!query || !query.trim()) return [];
  try {
    const response = await fetch(`${BASE_URL}/search/songs?query=${encodeURIComponent(query)}&limit=20`);
    const data = await response.json();
    const songs = data?.data?.results || data?.data || [];
    return songs.map(normalizeTrack).filter(t => t.audioUrl);
  } catch (error) {
    console.error('Failed to search music via JioSaavn API:', error);
    return [];
  }
};

export const getTrendingMusic = async () => {
  try {
    const response = await fetch(`${BASE_URL}/search/songs?query=Trending&limit=15`);
    const data = await response.json();
    const songs = data?.data?.results || data?.data || [];
    return songs.map(normalizeTrack).filter(t => t.audioUrl);
  } catch (error) {
    console.error('Failed to fetch trending tracks:', error);
    return [];
  }
};
