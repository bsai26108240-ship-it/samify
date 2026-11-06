/**
 * Samify High-Performance Client-Side Playlist Importer
 * Resolves CORS blocks, handles parameter order, and bypasses Vercel 10s timeouts.
 */

export const importFullPlaylist = async (playlistUrl) => {
  if (!playlistUrl || typeof playlistUrl !== 'string') {
    throw new Error('Please enter a valid YouTube playlist URL.');
  }

  // 1. Extract Playlist ID robustly from any YouTube URL format
  let playlistId = null;
  try {
    const parsedUrl = new URL(playlistUrl.trim());
    playlistId = parsedUrl.searchParams.get('list');
  } catch (e) {
    // String regex fallback if URL constructor fails
    const match = playlistUrl.match(/[?&]list=([^&]+)/);
    playlistId = match ? match[1] : null;
  }

  if (!playlistId) {
    throw new Error('Invalid playlist URL format. Make sure the link includes "?list=" or "&list=".');
  }

  let tracks = [];

  // 2. Multi-instance proxies to bypass browser CORS completely
  const corsProxies = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  const apiInstances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.video',
    'https://invidious.drgns.space'
  ];

  // Try fetching paginated tracks through CORS proxies
  for (const proxyFn of corsProxies) {
    if (tracks.length > 0) break;

    for (const instance of apiInstances) {
      try {
        let nextpage = null;
        let page = 1;
        let fetchedTracks = [];

        do {
          const targetUrl = nextpage
            ? `${instance}/api/v1/playlists/${playlistId}?nextpage=${encodeURIComponent(nextpage)}`
            : `${instance}/api/v1/playlists/${playlistId}`;

          const res = await fetch(proxyFn(targetUrl));
          if (!res.ok) break;

          const data = await res.json();
          const items = data.relatedStreams || data.videos || [];

          if (items.length === 0) break;

          const pageTracks = items.map((item) => ({
            id: item.videoId || (item.url ? item.url.replace('/watch?v=', '') : Math.random().toString(36).substring(2)),
            youtubeId: item.videoId || (item.url ? item.url.replace('/watch?v=', '') : ''),
            title: item.title || 'Unknown Title',
            artist: item.uploaderName || item.author || 'Unknown Artist',
            duration: item.duration ? item.duration * 1000 : 0,
            coverUrl: item.thumbnailUrl || item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`
          }));

          fetchedTracks = [...fetchedTracks, ...pageTracks];
          nextpage = data.nextpage || null;
          page++;

        } while (nextpage && page <= 25); // Supports up to 1,000+ tracks safely

        if (fetchedTracks.length > 0) {
          tracks = fetchedTracks;
          break;
        }
      } catch (err) {
        console.warn(`Attempt failed for instance ${instance}, trying next...`);
      }
    }
  }

  // 3. Final Fallback: YouTube RSS Feed via CORS Proxy
  if (tracks.length === 0) {
    for (const proxyFn of corsProxies) {
      try {
        const rssTarget = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
        const res = await fetch(proxyFn(rssTarget));

        if (res.ok) {
          const xmlText = await res.text();
          const parser = new DOMParser();
          const xml = parser.parseFromString(xmlText, 'text/xml');
          const entries = Array.from(xml.querySelectorAll('entry'));

          if (entries.length > 0) {
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
            break;
          }
        }
      } catch (rssErr) {
        console.warn('RSS Fallback attempt failed...');
      }
    }
  }

  if (tracks.length === 0) {
    throw new Error('Unable to fetch playlist tracks. Please verify that the playlist is set to Public on YouTube.');
  }

  return tracks;
};
