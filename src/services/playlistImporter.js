export const importFullPlaylist = async (playlistUrl) => {
  if (!playlistUrl || typeof playlistUrl !== 'string') {
    throw new Error('Please enter a valid YouTube playlist URL.');
  }

  let playlistId = null;
  try {
    const parsedUrl = new URL(playlistUrl.trim());
    playlistId = parsedUrl.searchParams.get('list');
  } catch (e) {
    const match = playlistUrl.match(/[?&]list=([^&]+)/);
    playlistId = match ? match[1] : null;
  }

  if (!playlistId) {
    throw new Error('Invalid playlist URL format. Ensure it contains "?list=" or "&list=".');
  }

  // 1. Fetch XML via local Edge function (Bypasses CORS entirely)
  const res = await fetch(`/api/import-rss?playlistId=${encodeURIComponent(playlistId)}`);

  if (!res.ok) {
    throw new Error('Unable to fetch playlist feed. Ensure the YouTube playlist is set to Public.');
  }

  const { xmlText } = await res.json();
  if (!xmlText) {
    throw new Error('Empty playlist feed returned.');
  }

  // 2. Parse XML in the browser
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const entries = Array.from(xml.querySelectorAll('entry'));

  if (entries.length === 0) {
    throw new Error('No tracks found in playlist. Please verify the link is public.');
  }

  const tracks = entries.map((entry) => {
    const videoId = entry.querySelector('videoId')?.textContent || '';
    const title = entry.querySelector('title')?.textContent || 'Unknown Track';
    const author = entry.querySelector('author > name')?.textContent || 'Unknown Artist';

    return {
      id: videoId || Math.random().toString(36).substring(2),
      youtubeId: videoId,
      title: title,
      artist: author,
      duration: 0,
      coverUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '/default-cover.png'
    };
  });

  return tracks;
};
