import React, { useState, useContext } from 'react';
import { LibraryContext } from '../../contexts/LibraryContext';

export const SpotifyImporterModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const libraryContext = useContext(LibraryContext);
  const createPlaylist = libraryContext?.createPlaylist;
  const setGlobalTracks = libraryContext?.setGlobalTracks;

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

      const pipedInstances = [
        'https://pipedapi.kavin.rocks',
        'https://api.piped.private.coffee',
        'https://pipedapi.tokhmi.xyz',
        'https://piped-api.garudalinux.org'
      ];

      let res = null;
      for (const instance of pipedInstances) {
        try {
          const attempt = await fetch(`${instance}/playlists/${playlistId}`);
          if (attempt.ok) {
            res = attempt;
            break;
          }
        } catch {
          // Continue to next mirror if instance is unreachable
        }
      }

      if (!res || !res.ok) {
        throw new Error("Failed to fetch YouTube playlist. Ensure the playlist is public.");
      }

      const data = await res.json();
      
      if (!data.relatedStreams || data.relatedStreams.length === 0) {
        throw new Error("No tracks found in this playlist.");
      }

      const playlistTitle = data.name || 'YouTube Import';
      const mappedTracks = data.relatedStreams.map((item) => {
        const videoId = (item.url || '').replace('/watch?v=', '');
        return {
          id: videoId || `yt_${Math.random().toString(36).substring(2, 9)}`,
          title: item.title,
          artist: item.uploaderName || 'Unknown Artist',
          album: playlistTitle,
          coverUrl: item.thumbnailUrl || '/default-cover.png',
          duration: item.duration * 1000,
          youtubeId: videoId
        };
      });

      if (onImportSuccess) {
        onImportSuccess(mappedTracks, playlistTitle);
      } else {
        // Fallback library integration
        if (setGlobalTracks) {
          setGlobalTracks(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const filtered = mappedTracks.filter(t => !existingIds.has(t.id));
            return [...prev, ...filtered];
          });
        }
        if (createPlaylist) {
          await createPlaylist(playlistTitle, 'Imported from YouTube', mappedTracks.map(t => t.id));
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
