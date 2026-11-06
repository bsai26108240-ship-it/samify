export const fetchSyncedLyrics = async (trackTitle, artistName, durationMs) => {
  try {
    const durationSec = Math.round((durationMs || 0) / 1000);
    const query = new URLSearchParams({
      track_name: trackTitle,
      artist_name: artistName,
      ...(durationSec > 0 && { duration: durationSec })
    });

    const res = await fetch(`https://lrclib.net/api/get?${query.toString()}`);
    if (!res.ok) {
      // Fallback search if exact match fails
      const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(trackTitle + ' ' + artistName)}`);
      const searchData = await searchRes.json();
      if (searchData && searchData.length > 0) {
        return parseLRC(searchData[0].syncedLyrics || searchData[0].plainLyrics);
      }
      return null;
    }

    const data = await res.json();
    return parseLRC(data.syncedLyrics || data.plainLyrics);
  } catch (err) {
    console.error("Lyrics fetch error:", err);
    return null;
  }
};

// Converts raw LRC text format [00:12.34] into active timestamp array for karaoke highlighting
const parseLRC = (lrcText) => {
  if (!lrcText) return null;
  const lines = lrcText.split('\n');
  const result = [];

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
      const timeInMs = minutes * 60000 + seconds * 1000 + milliseconds;
      const text = line.replace(timeRegex, '').trim();
      
      if (text) {
        result.push({ time: timeInMs / 1000, text });
      }
    }
  }

  return result.length > 0 ? result : null;
};

