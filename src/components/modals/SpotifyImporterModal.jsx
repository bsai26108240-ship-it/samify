import React, { useState, useEffect, useContext } from 'react';
import { X, DownloadCloud, Sparkles } from 'lucide-react';
import { LibraryContext } from '../../contexts/LibraryContext';

export const SpotifyImporterModal = ({ isOpen, onClose }) => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('spotify_token'));
  
  const { createPlaylist, setGlobalTracks, addTrackToPlaylist } = useContext(LibraryContext);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const extractedToken = new URLSearchParams(hash.replace('#', '?')).get('access_token');
      if (extractedToken) {
        localStorage.setItem('spotify_token', extractedToken);
        setToken(extractedToken);
        window.location.hash = ''; 
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = window.location.origin + '/';
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=playlist-read-private%20playlist-read-collaborative`;
    window.location.href = authUrl;
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!playlistUrl || !token) return;

    setLoading(true);
    setProgress("Extracting Official Spotify ID...");

    try {
      const match = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!match) throw new Error("Invalid URL");
      
      setProgress("Fetching metadata from Official Spotify API...");
      const res = await fetch(`https://api.spotify.com/v1/playlists/${match[1]}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        localStorage.removeItem('spotify_token');
        setToken(null);
        throw new Error("Token expired, please reconnect.");
      }

      const data = await res.json();
      
      const newTracks = data.tracks.items.filter(i => i.track).map(item => ({
        id: item.track.id,
        title: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        album: item.track.album.name,
        coverUrl: item.track.album.images[0]?.url || '',
        duration: Math.floor(item.track.duration_ms / 1000),
        youtubeId: ''
      }));

      setProgress("Registering tracks to Global Library...");
      if (setGlobalTracks) {
        setGlobalTracks(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const filtered = newTracks.filter(t => !existingIds.has(t.id));
          return [...prev, ...filtered];
        });
      }

      setProgress(`Creating cloud playlist "${data.name}"...`);
      const trackIds = newTracks.map(t => t.id);
      await createPlaylist(data.name, data.description || 'Imported via Official API', trackIds);
      
      setProgress("Done! All real tracks imported.");
      setTimeout(() => { onClose(); setLoading(false); }, 1500);

    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to import. Make sure the link is correct.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-[#121212] border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl">
        <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition"><X className="w-5 h-5" /></button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white">Official Spotify Importer</h2>
          <p className="text-xs text-zinc-400 mt-1">Connect your account for flawless metadata import.</p>
        </div>

        {!token ? (
           <button onClick={handleConnect} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-xl transition shadow-[0_0_20px_rgba(16,185,129,0.4)]">
             Connect to Spotify
           </button>
        ) : (
          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Spotify Playlist URL</label>
              <input type="url" required placeholder="https://open.spotify.com/playlist/..." value={playlistUrl} onChange={(e) => setPlaylistUrl(e.target.value)} className="w-full bg-[#1a1a1a] text-sm text-white px-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500 transition" />
            </div>

            {progress && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 flex items-center space-x-2">
                <DownloadCloud className="w-4 h-4 animate-bounce" /><span>{progress}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-xl transition shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50">
              {loading ? 'Importing...' : 'Import Playlist'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
