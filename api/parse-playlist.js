export default async function handler(req, res) {
  // Support both req.query and parsed searchParams fallback
  let playlistId = req.query?.playlistId;
  if (!playlistId && req.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      playlistId = url.searchParams.get('playlistId');
    } catch {}
  }

  if (!playlistId) {
    return res.status(400).json({ error: "Missing playlistId parameter." });
  }

  try {
    // 1. Try public Piped instance server-side
    try {
      const pipedRes = await fetch(`https://pipedapi.kavin.rocks/playlists/${playlistId}`);
      if (pipedRes.ok) {
        const data = await pipedRes.json();
        if (data.relatedStreams && data.relatedStreams.length > 0) {
          const tracks = data.relatedStreams.map((item) => ({
            id: item.url.replace('/watch?v=', ''),
            title: item.title,
            artist: item.uploaderName || 'Unknown Artist',
            album: data.name || 'YouTube Import',
            coverUrl: item.thumbnailUrl || '/default-cover.png',
            duration: (item.duration || 180) * 1000,
            youtubeId: item.url.replace('/watch?v=', '')
          }));
          return res.status(200).json({ tracks, title: data.name || 'Imported Playlist' });
        }
      }
    } catch {
      // Piped instance unreachable, fall through to direct YouTube RSS feed
    }

    // 2. Fallback to direct YouTube XML Feed server-side
    const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`);
    if (!rssRes.ok) {
      return res.status(404).json({ error: "Playlist not found or set to Private." });
    }

    const xmlText = await rssRes.text();
    
    // Regex parsing for serverless environment without DOMParser
    const titleMatch = xmlText.match(/<title>(.*?)<\/title>/);
    const playlistTitle = titleMatch ? titleMatch[1] : "YouTube Playlist";

    const entryRegex = /<entry>[\s\S]*?<\/entry>/g;
    const entries = xmlText.match(entryRegex) || [];

    if (entries.length === 0) {
      return res.status(404).json({ error: "No tracks found in this playlist." });
    }

    const tracks = entries.map((entry) => {
      const vIdMatch = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || entry.match(/<id>yt:video:(.*?)<\/id>/);
      const videoId = vIdMatch ? vIdMatch[1] : '';
      
      const tMatch = entry.match(/<title>(.*?)<\/title>/);
      const title = tMatch ? tMatch[1] : 'Unknown Track';

      const aMatch = entry.match(/<name>(.*?)<\/name>/);
      const artist = aMatch ? aMatch[1] : 'Unknown Artist';

      return {
        id: videoId,
        title: title,
        artist: artist,
        album: playlistTitle,
        coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: 180000,
        youtubeId: videoId
      };
    }).filter(t => t.id !== '');

    return res.status(200).json({ tracks, title: playlistTitle });
  } catch (error) {
    console.error("Parse playlist API error:", error);
    return res.status(500).json({ error: "Failed to parse playlist." });
  }
}

