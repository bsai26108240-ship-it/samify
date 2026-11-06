import React, { useState, useEffect, useContext } from 'react';
import { X, DownloadCloud, Sparkles, CheckCircle2 } from 'lucide-react';
import { LibraryContext } from '../../contexts/LibraryContext';

// PKCE Helper Functions
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

export const SpotifyImporterModal = ({ isOpen, onClose }) => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('spotify_token'));
  
  const { createPlaylist, setGlobalTracks } = useContext(LibraryContext);

  // Authorization Code with PKCE token exchange listener
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('Spotify Auth error:', error);
      localStorage.removeItem('spotify_code_verifier');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      const exchangeToken = async () => {
        const codeVerifier = localStorage.getItem('spotify_code_verifier');
        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
        const redirectUri = window.location.origin + '/';

        if (!codeVerifier) {
          console.error('Spotify code_verifier missing from storage');
          return;
        }

        try {
          const body = new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier
          });

          const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
          });

          const data = await res.json();
          if (data.access_token) {
            localStorage.setItem('spotify_token', data.access_token);
            if (data.refresh_token) {
              localStorage.setItem('spotify_refresh_token', data.refresh_token);
            }
            setToken(data.access_token);
            localStorage.removeItem('spotify_code_verifier');
          } else {
            console.error('Failed to exchange code for token:', data);
          }
        } catch (err) {
          console.error('Token exchange error:', err);
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      exchangeToken();
    }
  }, []);

  if (!isOpen) return null;

  const handleConnect = async () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = window.location.origin + '/';
    const scope = 'playlist-read-private playlist-read-collaborative';

    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    localStorage.setItem('spotify_code_verifier', codeVerifier);

    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: scope,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      redirect_uri: redirectUri
    });

    window.location.href = `https://accounts.spotify.com/authorize?${authParams.toString()}`;
  };

  const handleDisconnect = () => {
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_refresh_token');
    setToken(null);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!playlistUrl || !token) return;

    setLoading(true);
    setProgress("Extracting Official Spotify ID...");

    try {
      const match = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!match) throw new Error("Invalid Spotify Playlist URL");
      
      setProgress("Fetching metadata from Official Spotify API...");
      const res = await fetch(`https://api.spotify.com/v1/playlists/${match[1]}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        handleDisconnect();
        throw new Error("Token expired, please reconnect to Spotify.");
      }

      const data = await res.json();
      
      const newTracks = (data.tracks?.items || [])
        .filter(i => i.track)
        .map(item => ({
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
      setTimeout(() => { 
        onClose(); 
        setLoading(false); 
      }, 1500);

    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to import. Make sure the link is correct.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-4">
      <div className="relative bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl">
        <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition p-1" aria-label="Close">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Official Spotify Importer</h2>
          <p className="text-xs text-zinc-400 mt-1">Connect your account for flawless metadata import via PKCE.</p>
        </div>

        {!token ? (
          <button 
            onClick={handleConnect} 
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-xl transition shadow-[0_0_20px_rgba(16,185,129,0.4)] text-sm"
          >
            Connect to Spotify
          </button>
        ) : (
          <form onSubmit={handleImport} className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Spotify Connected
              </span>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-zinc-500 hover:text-red-400 transition underline text-[11px]"
              >
                Disconnect
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Spotify Playlist URL</label>
              <input 
                type="url" 
                required 
                placeholder="https://open.spotify.com/playlist/..." 
                value={playlistUrl} 
                onChange={(e) => setPlaylistUrl(e.target.value)} 
                className="w-full bg-[#1a1a1a] text-sm text-white px-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500 transition" 
              />
            </div>

            {progress && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 flex items-center space-x-2">
                <DownloadCloud className="w-4 h-4 animate-bounce" />
                <span>{progress}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-xl transition shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 text-sm"
            >
              {loading ? 'Importing...' : 'Import Playlist'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
