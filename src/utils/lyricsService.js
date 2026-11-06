/**
 * Fetches synced or plain lyrics from LRCLIB free API.
 * @param {string} title - Song Title
 * @param {string} artist - Artist Name
 * @returns {Promise<{syncedLyrics: string|null, plainLyrics: string|null}>}
 */
export const fetchLyrics = async (title, artist) => {
  if (!title) return { syncedLyrics: null, plainLyrics: null };

  try {
    const cleanTitle = title.replace(/\s*(\(|\[)(official|music|video|audio|remastered|lyric).*?(\)|\])/gi, '').trim();
    const cleanArtist = (artist || '').replace(/,\s*.*/, '').trim();

    const queryUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
    
    let res = await fetch(queryUrl);

    if (!res.ok) {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData && searchData.length > 0) {
          return {
            syncedLyrics: searchData[0].syncedLyrics || null,
            plainLyrics: searchData[0].plainLyrics || null
          };
        }
      }
      return { syncedLyrics: null, plainLyrics: null };
    }

    const data = await res.json();
    return {
      syncedLyrics: data.syncedLyrics || null,
      plainLyrics: data.plainLyrics || null
    };
  } catch (error) {
    console.error("LRCLIB Lyrics fetch error:", error);
    return { syncedLyrics: null, plainLyrics: null };
  }
};
