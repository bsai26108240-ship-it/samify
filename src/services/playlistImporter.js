// Client-side playlist parser (Bypasses serverless timeouts)
export const importFullPlaylist = async (playlistUrl) => {
  const match = playlistUrl.match(/[&?]list=([^&]+)/);
  const playlistId = match ? match[1] : null;

  if (!playlistId) {
    throw new Error('Invalid YouTube playlist URL');
  }

  // 1. Try Invidious / Piped instances directly from client browser
  const instances = [
    'https://invidious.drgns.space',
    'https://pipedapi.kavin.rocks',
    'https://api.piped.video'
  ];

  let tracks = [];

  for (const instance of instances) {
    try {
      let page = 1;
      let nextpage = null;
      let fetchedTracks = [];

      do {
        const url = nextpage
          ? `${instance}/api/v1/playlists/${playlistId}?nextpage=${encodeURIComponent(nextpage)}`
          : `${instance}/api/v1/playlists/${playlistId}`;

        const res = await fetch(url);
        if (!res.ok) break;

        const data = await res.json();
        const items = data.relatedStreams || data.videos || [];

        const pageTracks = items.map((item) => ({
          id: item.videoId || (item.url ? item.url.replace('/watch?v=', '') : Math.random().toString()),
          youtubeId: item.videoId || (item.url ? item.url.replace('/watch?v=', '') : ''),
          title: item.title,
          artist: item.uploaderName || item.author || 'Unknown Artist',
          duration: item.duration ? item.duration * 1000 : 0,
          coverUrl: item.thumbnailUrl || item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`
        }));

        fetchedTracks = [...fetchedTracks, ...pageTracks];
        nextpage = data.nextpage || null;
        page++;

      } while (nextpage && page <= 20); // Supports up to 1,000 tracks!

      if (fetchedTracks.length > 0) {
        tracks = fetchedTracks;
        break; // Successfully fetched!
      }
    } catch (err) {
      console.warn(`Instance ${instance} failed, trying next...`, err);
    }
  }

  // 2. Fallback: Parse via YouTube RSS Feed if API instances fail
  if (tracks.length === 0) {
    try {
      const rssUrl = `https://corsproxy.io/?${encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`)}`;
      const rssRes = await fetch(rssUrl);
      if (rssRes.ok) {
        const xmlText = await rssRes.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const entries = Array.from(xml.querySelectorAll('entry'));

        tracks = entries.map((entry) => {
          const videoId = entry.querySelector('videoId')?.textContent || '';
          return {
            id: videoId,
            youtubeId: videoId,
            title: entry.querySelector('title')?.textContent || 'Unknown Title',
            artist: entry.querySelector('author > name')?.textContent || 'Unknown Artist',
            duration: 0,
            coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
          };
        });
      }
    } catch (rssErr) {
      console.error('CORS RSS fallback failed:', rssErr);
    }
  }

  if (tracks.length === 0) {
    throw new Error('Could not fetch tracks. Please check if the playlist is public.');
  }

  return tracks;
};
