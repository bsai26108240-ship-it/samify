export default async function handler(req, res) {
  // Support both req.query and parsed searchParams fallback
  let playlistId = req.query?.playlistId;
  if (!playlistId && req.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      playlistId = url.searchParams.get('playlistId');
    } catch {}
  }

  // Also support ?url= param (extract playlist ID from full YouTube URL)
  let rawUrl = req.query?.url;
  if (!playlistId && rawUrl) {
    const listMatch = rawUrl.match(/[&?]list=([^&]+)/);
    if (listMatch) playlistId = listMatch[1];
  }

  if (!playlistId) {
    return res.status(400).json({ error: 'Missing playlistId parameter.' });
  }

  try {
    // --- 1. Multi-page Piped/Invidious fetch (up to 500 tracks) ---
    const instances = [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.video',
      'https://invidious.drgns.space',
    ];

    let allTracks = [];
    let playlistTitle = 'Imported Playlist';

    for (const instance of instances) {
      try {
        let nextpage = null;
        let pagesFetched = 0;
        const maxPages = 10; // 10 pages × ~50 items = up to 500 tracks

        do {
          pagesFetched++;

          // Piped uses /playlists/<id>?nextpage=... for pagination
          const fetchUrl = nextpage
            ? `${instance}/playlists/${playlistId}?nextpage=${encodeURIComponent(nextpage)}`
            : `${instance}/playlists/${playlistId}`;

          const response = await fetch(fetchUrl, {
            headers: { 'User-Agent': 'Samify/1.0' },
          });

          if (!response.ok) break;

          const data = await response.json();

          // Grab playlist name from first page
          if (pagesFetched === 1 && data.name) {
            playlistTitle = data.name;
          }

          const pageItems = data.relatedStreams || data.videos || [];
          if (pageItems.length === 0) break;

          const parsedChunk = pageItems.map((item) => {
            const videoId = item.url
              ? item.url.replace('/watch?v=', '')
              : item.videoId || '';
            return {
              id: videoId,
              title: item.title || 'Unknown Title',
              artist: item.uploaderName || item.author || 'Unknown Artist',
              album: playlistTitle,
              coverUrl:
                item.thumbnailUrl ||
                item.videoThumbnails?.[0]?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              duration: item.duration ? item.duration * 1000 : 180000,
              youtubeId: videoId,
            };
          }).filter((t) => t.id !== '');

          allTracks = [...allTracks, ...parsedChunk];
          nextpage = data.nextpage || null;

        } while (nextpage && pagesFetched < maxPages);

        // If we got tracks from this instance, return immediately
        if (allTracks.length > 0) {
          return res.status(200).json({
            title: playlistTitle,
            tracks: allTracks,
          });
        }
      } catch {
        // Instance unreachable — try next one
      }
    }

    // --- 2. Fallback: YouTube RSS XML feed (max 15 items, public playlists only) ---
    try {
      const rssRes = await fetch(
        `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`
      );

      if (rssRes.ok) {
        const xmlText = await rssRes.text();

        const titleMatch = xmlText.match(/<title>(.*?)<\/title>/);
        playlistTitle = titleMatch ? titleMatch[1] : 'YouTube Playlist';

        const entryRegex = /<entry>[\s\S]*?<\/entry>/g;
        const entries = xmlText.match(entryRegex) || [];

        const tracks = entries
          .map((entry) => {
            const vIdMatch =
              entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/) ||
              entry.match(/<id>yt:video:(.*?)<\/id>/);
            const videoId = vIdMatch ? vIdMatch[1] : '';

            const tMatch = entry.match(/<title>(.*?)<\/title>/);
            const title = tMatch ? tMatch[1] : 'Unknown Track';

            const aMatch = entry.match(/<name>(.*?)<\/name>/);
            const artist = aMatch ? aMatch[1] : 'Unknown Artist';

            return {
              id: videoId,
              title,
              artist,
              album: playlistTitle,
              coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              duration: 180000,
              youtubeId: videoId,
            };
          })
          .filter((t) => t.id !== '');

        if (tracks.length > 0) {
          return res.status(200).json({ title: playlistTitle, tracks });
        }
      }
    } catch {
      // RSS fallback also failed
    }

    return res.status(500).json({
      error: 'Failed to extract playlist tracks. The playlist may be private or all fetch instances are unavailable.',
    });
  } catch (error) {
    console.error('Playlist parse error:', error);
    return res.status(500).json({ error: error.message });
  }
}
