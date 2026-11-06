import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from './AuthContext';
import { MUSIC_CATALOGUE } from '../data/catalogue';

export const LibraryContext = createContext();

export const LibraryProvider = ({ children }) => {
  const { user } = useContext(AuthContext) || {};
  const userKey = user?.id || 'guest';

  // Dynamic Global Catalogue initialized with built-in catalogue + any imported tracks
  const [globalTracks, setGlobalTracks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`samify_tracks_${userKey}`));
      if (Array.isArray(saved) && saved.length > 0) {
        // Merge without duplicates by ID
        const existingIds = new Set(saved.map(t => t.id));
        const combined = [...saved, ...MUSIC_CATALOGUE.filter(t => !existingIds.has(t.id))];
        return combined;
      }
      return MUSIC_CATALOGUE;
    } catch {
      return MUSIC_CATALOGUE;
    }
  });

  const [favorites, setFavorites] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem(`samify_favorites_${userKey}`)) || ['1', '3']; 
    } catch { 
      return ['1', '3']; 
    }
  });

  const [playlists, setPlaylists] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem(`samify_playlists_${userKey}`)) || []; 
    } catch { 
      return []; 
    }
  });

  // User-specific listening history & listening statistics
  const [listeningStats, setListeningStats] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem(`samify_stats_${userKey}`)) || {
        minutesListened: 142,
        totalPlays: 38,
        weeklyData: [20, 35, 45, 15, 60, 80, 50],
        favoriteGenre: 'Synth-Pop'
      };
    } catch { 
      return { minutesListened: 142, totalPlays: 38, weeklyData: [20, 35, 45, 15, 60, 80, 50], favoriteGenre: 'Synth-Pop' };
    }
  });

  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // When user switches (login / logout), reload isolated state for that user
  useEffect(() => {
    try {
      const savedTracks = JSON.parse(localStorage.getItem(`samify_tracks_${userKey}`));
      if (Array.isArray(savedTracks) && savedTracks.length > 0) {
        const existingIds = new Set(savedTracks.map(t => t.id));
        setGlobalTracks([...savedTracks, ...MUSIC_CATALOGUE.filter(t => !existingIds.has(t.id))]);
      } else {
        setGlobalTracks(MUSIC_CATALOGUE);
      }

      const savedFavs = JSON.parse(localStorage.getItem(`samify_favorites_${userKey}`));
      setFavorites(Array.isArray(savedFavs) ? savedFavs : (user ? [] : ['1', '3']));

      const savedPls = JSON.parse(localStorage.getItem(`samify_playlists_${userKey}`));
      setPlaylists(Array.isArray(savedPls) ? savedPls : []);

      const savedStats = JSON.parse(localStorage.getItem(`samify_stats_${userKey}`));
      if (savedStats) setListeningStats(savedStats);
    } catch (e) {
      console.error("Error switching user state:", e);
    }
  }, [userKey]);

  // Fetch user-specific data from Supabase when user logs in
  useEffect(() => {
    if (!user || !supabase) return;

    const fetchUserData = async () => {
      try {
        // 1. Fetch User Liked Songs
        const { data: likedData } = await supabase
          .from('liked_songs')
          .select('track_id')
          .eq('user_id', user.id);

        if (likedData) {
          setFavorites(likedData.map(item => item.track_id));
        }

        // 2. Fetch User Playlists
        const { data: playlistData } = await supabase
          .from('playlists')
          .select(`
            id,
            title,
            description,
            cover_url,
            created_at,
            playlist_tracks(track_id)
          `)
          .eq('user_id', user.id);

        if (playlistData) {
          const formatted = playlistData.map(pl => ({
            id: pl.id,
            title: pl.title,
            description: pl.description,
            coverUrl: pl.cover_url || `https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80`,
            createdAt: pl.created_at,
            tracks: pl.playlist_tracks ? pl.playlist_tracks.map(pt => pt.track_id) : []
          }));
          setPlaylists(formatted);
        }
      } catch (err) {
        console.error("Supabase user sync error:", err);
      }
    };

    fetchUserData();
  }, [user]);

  // Persist user-isolated state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`samify_favorites_${userKey}`, JSON.stringify(favorites));
    } catch {}
  }, [favorites, userKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`samify_playlists_${userKey}`, JSON.stringify(playlists));
    } catch {}
  }, [playlists, userKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`samify_tracks_${userKey}`, JSON.stringify(globalTracks));
    } catch {}
  }, [globalTracks, userKey]);

  // Record playback to user's personalized listening graph
  const recordTrackPlay = useCallback((track) => {
    setListeningStats(prev => {
      const updated = {
        ...prev,
        totalPlays: prev.totalPlays + 1,
        minutesListened: prev.minutesListened + Math.round((track.duration || 180) / 60),
        favoriteGenre: track.genre || prev.favoriteGenre
      };
      try { 
        localStorage.setItem(`samify_stats_${userKey}`, JSON.stringify(updated)); 
      } catch {}
      return updated;
    });
  }, [userKey]);

  const toggleFavorite = async (trackId) => {
    const isFav = favorites.includes(trackId);
    const newFavs = isFav ? favorites.filter(id => id !== trackId) : [...favorites, trackId];
    setFavorites(newFavs);
    triggerToast(isFav ? 'Removed from Likes' : 'Added to Likes');

    if (user && supabase) {
      try {
        if (isFav) {
          await supabase
            .from('liked_songs')
            .delete()
            .eq('user_id', user.id)
            .eq('track_id', trackId);
        } else {
          await supabase
            .from('liked_songs')
            .insert({ user_id: user.id, track_id: trackId });
        }
      } catch (err) {
        console.error("Error updating liked song in cloud:", err);
      }
    }
  };

  const createPlaylist = async (title, description, initialTracks = []) => {
    const coverUrl = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*100000)}?w=500&auto=format&fit=crop&q=80`;

    if (user && supabase) {
      try {
        const { data, error } = await supabase
          .from('playlists')
          .insert({
            user_id: user.id,
            title,
            description,
            cover_url: coverUrl
          })
          .select()
          .single();

        if (data && !error) {
          // If initial tracks provided, insert them into playlist_tracks
          if (initialTracks.length > 0) {
            const trackInserts = initialTracks.map(tid => ({ playlist_id: data.id, track_id: tid }));
            await supabase.from('playlist_tracks').insert(trackInserts);
          }

          setPlaylists(prev => [...prev, {
            id: data.id,
            title: data.title,
            description: data.description,
            coverUrl: data.cover_url,
            createdAt: data.created_at,
            tracks: initialTracks
          }]);
          triggerToast('Playlist Saved to Cloud');
          return data.id;
        }
      } catch (err) {
        console.error("Cloud playlist creation failed, falling back to local:", err);
      }
    }

    const newId = Date.now().toString();
    const newPlaylist = {
      id: newId,
      title,
      description,
      tracks: initialTracks,
      createdAt: new Date().toISOString(),
      coverUrl
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    triggerToast('Playlist Created');
    return newId;
  };

  const updatePlaylist = async (id, title, description) => {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, title, description } : p));
    triggerToast('Playlist Updated');

    if (user && supabase) {
      try {
        await supabase
          .from('playlists')
          .update({ title, description })
          .eq('id', id)
          .eq('user_id', user.id);
      } catch {}
    }
  };

  const deletePlaylist = async (id) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    triggerToast('Playlist Deleted');

    if (user && supabase) {
      try {
        await supabase
          .from('playlists')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      } catch {}
    }
  };

  const addTrackToPlaylist = async (playlistId, trackId) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId && !p.tracks.includes(trackId)) {
        return { ...p, tracks: [...p.tracks, trackId] };
      }
      return p;
    }));
    triggerToast('Added to Playlist');

    if (user && supabase) {
      try {
        await supabase
          .from('playlist_tracks')
          .insert({ playlist_id: playlistId, track_id: trackId });
      } catch {}
    }
  };

  const removeTrackFromPlaylist = async (playlistId, trackId) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) return { ...p, tracks: p.tracks.filter(t => t !== trackId) };
      return p;
    }));
    triggerToast('Removed from Playlist');

    if (user && supabase) {
      try {
        await supabase
          .from('playlist_tracks')
          .delete()
          .eq('playlist_id', playlistId)
          .eq('track_id', trackId);
      } catch {}
    }
  };

  return (
    <LibraryContext.Provider value={{
      globalTracks, setGlobalTracks,
      favorites, toggleFavorite, toastMessage, triggerToast,
      playlists, createPlaylist, updatePlaylist, deletePlaylist, 
      addTrackToPlaylist, removeTrackFromPlaylist,
      listeningStats, recordTrackPlay
    }}>
      {children}
    </LibraryContext.Provider>
  );
};
