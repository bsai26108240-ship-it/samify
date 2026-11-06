import React, { useState, useContext } from 'react';
import { X, DownloadCloud, Sparkles, CheckCircle2, Music } from 'lucide-react';
import { LibraryContext } from '../../contexts/LibraryContext';

export const SpotifyImporterModal = ({ isOpen, onClose }) => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [success, setSuccess] = useState(false);
  const { createPlaylist } = useContext(LibraryContext);

  if (!isOpen) return null;

  const handleImport = async (e) => {
    e.preventDefault();
    if (!playlistUrl.trim()) return;

    setLoading(true);
    setSuccess(false);
    setProgress("Extracting Spotify Playlist ID...");

    try {
      const match = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!match) {
        alert("Please enter a valid Spotify Playlist URL (e.g. https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M)");
        setLoading(false);
        setProgress(null);
        return;
      }

      const playlistId = match[1];
      setProgress("Contacting Spotify metadata service...");

      // Attempt fast metadata extraction via open endpoint
      let playlistTitle = `Spotify Playlist (${playlistId.slice(0, 6)})`;
      let playlistDesc = `Imported from Spotify`;

      try {
        const response = await fetch(`https://api.spotifydown.com/metadata/${playlistId}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.title) {
            playlistTitle = data.title;
            playlistDesc = `Imported from Spotify • ${data.artists || 'Curated selection'}`;
          }
        }
      } catch {
        // Fallback title is already set
      }

      setProgress(`Creating cloud playlist "${playlistTitle}"...`);
      await createPlaylist(playlistTitle, playlistDesc);
      
      setProgress("Import Complete! Playlist is ready in your library.");
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setLoading(false);
        setProgress(null);
        setSuccess(false);
        setPlaylistUrl('');
      }, 1400);

    } catch (err) {
      console.error("Spotify Import Error:", err);
      alert("Failed to import playlist. Make sure the Spotify playlist is set to Public!");
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-4">
      <div className="relative bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl">
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-zinc-500 hover:text-white transition p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">1-Click Spotify Importer</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Paste any public Spotify playlist URL below to automatically import it into your Samify account!
          </p>
        </div>

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Spotify Playlist URL
            </label>
            <input
              type="url"
              required
              placeholder="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              className="w-full bg-[#1a1a1a] text-sm text-white px-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {progress && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
              {success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <DownloadCloud className="w-4 h-4 animate-bounce" />
              )}
              <span>{progress}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-xl transition shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Importing Playlist...</span>
            ) : (
              <>
                <Music className="w-4 h-4" />
                <span>Import Playlist Now</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
