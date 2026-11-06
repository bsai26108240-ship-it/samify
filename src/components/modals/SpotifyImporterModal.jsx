import React, { useState, useContext } from 'react';
import { LibraryContext } from '../../contexts/LibraryContext';

const PipedInstances = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.private.coffee',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.moomoo.me',
];

export const SpotifyImporterModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const libraryContext = useContext(LibraryContext);
  const createPlaylist = libraryContext?.createPlaylist;
  const setGlobalTracks = libraryContext?.setGlobalTracks;

  const parseFallbackPlaylist = async (playlistId) => {
    // Direct RSS proxy fallback when piped instances hit rate limits
    const rssUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`)}`;
    const res = await fetch(rssUrl);
    if (!res.ok) throw new Error("Could not reach fallback parser.");
    const data = await res.json();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data.contents, "text/xml");
    const entries = Array.from(xmlDoc.querySelectorAll("entry"));

    if (entries.length === 0) {
      throw new Error("No tracks found in this playlist (ensure it is set to Public).");
    }

    const playlistTitle = xmlDoc.querySelector("title")?.textContent || "YouTube Playlist";

    const mapped = entries.map((entry) => {
      const videoId = entry.querySelector("videoId")?.textContent || entry.querySelector("id")?.textContent?.replace('yt:video:', '');
      const title = entry.querySelector("title")?.textContent || "Unknown Track";
      const author = entry.querySelector("author > name")?.textContent || "Unknown Artist";
      return {
        id: videoId,
        title: title,
        artist: author,
        album: playlistTitle,
        coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: 180000,
        youtubeId: videoId
      };
    });

    return { tracks: mapped, title: playlistTitle };
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setIsImporting(true);
    setErrorMsg('');

    try {
      const playlistIdMatch = inputUrl.match(/[&?]list=([^&]+)/);
      const playlistId = playlistIdMatch ? playlistIdMatch[1] : null;

      if (!playlistId) {
        throw new Error("Please enter a valid YouTube Playlist URL (must contain '?list=...').");
      }

      let tracks = [];
      let playlistName = "Imported Playlist";
      let success = false;

      // 1. Try Piped instances
      for (const baseUrl of PipedInstances) {
        try {
          const res = await fetch(`${baseUrl}/playlists/${playlistId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.relatedStreams && data.relatedStreams.length > 0) {
              tracks = data.relatedStreams.map((item) => ({
                id: item.url.replace('/watch?v=', ''),
                title: item.title,
                artist: item.uploaderName || 'Unknown Artist',
                album: data.name || 'YouTube Import',
                coverUrl: item.thumbnailUrl || `/default-cover.png`,
                duration: (item.duration || 180) * 1000,
                youtubeId: item.url.replace('/watch?v=', '')
              }));
              playlistName = data.name || 'Imported Playlist';
              success = true;
              break;
            }
          }
        } catch (e) {
          console.warn(`Mirror ${baseUrl} failed, trying next...`);
        }
      }

      // 2. Fallback to RSS XML direct fetch if Piped failed/empty
      if (!success || tracks.length === 0) {
        const fallbackData = await parseFallbackPlaylist(playlistId);
        tracks = fallbackData.tracks;
        playlistName = fallbackData.title;
      }

      if (onImportSuccess) {
        onImportSuccess(tracks, playlistName);
      } else {
        if (setGlobalTracks) {
          setGlobalTracks(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const filtered = tracks.filter(t => !existingIds.has(t.id));
            return [...prev, ...filtered];
          });
        }
        if (createPlaylist) {
          await createPlaylist(playlistName, 'Imported from YouTube', tracks.map(t => t.id));
        }
      }

      setInputUrl('');
      onClose();
    } catch (err) {
      console.error("YouTube Import Error:", err);
      setErrorMsg(err.message || "Import failed. Please check the URL.");
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-md w-full text-white shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-emerald-400">Import Playlist</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
        </div>
        
        <p className="text-xs text-gray-400 mb-5">
          Paste any public YouTube Playlist link below to import tracks directly into your library.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleImport} className="space-y-4">
          <input 
            type="url" 
            placeholder="https://www.youtube.com/playlist?list=..." 
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full bg-[#282828] text-white text-sm px-4 py-3 rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none transition"
            required
          />
          <button 
            type="submit" 
            disabled={isImporting}
            className="w-full bg-emerald-500 text-black font-semibold py-3 rounded-xl hover:bg-emerald-400 transition disabled:opacity-50"
          >
            {isImporting ? 'Processing Tracks...' : 'Import to Samify'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SpotifyImporterModal;
