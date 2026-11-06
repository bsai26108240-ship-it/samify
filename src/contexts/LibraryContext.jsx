import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from './AuthContext';

export const LibraryContext = createContext();

export const LibraryProvider = ({ children }) => {
  const { user } = useContext(AuthContext) || {};

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('samify_favorites')) || ['1', '3']; }
    catch { return ['1', '3']; }
  });

  const [playlists, setPlaylists] = useState(() => {
    try { return JSON.parse(localStorage.getItem('samify_playlists')) || []; }
    catch { return []; }
  });

  // User-specific listening history & listening statistics
  const [listeningStats, setListeningStats] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem('samify_stats')) || {
        minutesListened: 142,
        totalPlays: 38,
        weeklyData: [20, 35, 45, 15, 60, 80, 50], // Minutes per day (Mon-Sun)
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

  // Fetch user-specific data from Supabase when user logs in
  useEffect(() => {
    if (!user || !supabase) return;

    const fetchUserData = async () => {
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
    };

    fetchUserData();
  }, [user]);

  // Record playback to user's personalized listening graph
  const recordTrackPlay = useCallback((track) => {
    setListeningStats(prev => {
      const updated = {
        ...prev,
        totalPlays: prev.totalPlays + 1,
        minutesListened: prev.minutesListened + Math.round(track.duration / 60),
        favoriteGenre: track.genre || prev.favoriteGenre
      };
      try { localStorage.setItem(`samify_stats_${user?.id || 'guest'}`, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [user]);

  // Local Storage fallback for guest mode
  useEffect(() => {
    if (!user) {
      try { localStorage.setItem('samify_favorites', JSON.stringify(favorites)); } catch {}
    }
  }, [favorites, user]);

  useEffect(() => {
    if (!user) {
      try { localStorage.setItem('samify_playlists', JSON.stringify(playlists)); } catch {}
    }
  }, [playlists, user]);

  const toggleFavorite = async (trackId) => {
    const isFav = favorites.includes(trackId);
    const newFavs = isFav ? favorites.filter(id => id !== trackId) : [...favorites, trackId];
    setFavorites(newFavs);
    triggerToast(isFav ? 'Removed from Likes' : 'Added to Likes');

    if (user && supabase) {
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
    }
  };

  const createPlaylist = async (title, description) => {
    const coverUrl = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*100000)}?w=500&auto=format&fit=crop&q=80`;

    if (user && supabase) {
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
        setPlaylists(prev => [...prev, {
          id: data.id,
          title: data.title,
          description: data.description,
          coverUrl: data.cover_url,
          createdAt: data.created_at,
          tracks: []
        }]);
        triggerToast('Playlist Saved to Cloud');
        return;
      }
    }

    const newPlaylist = {
      id: Date.now().toString(),
      title,
      description,
      tracks: [],
      createdAt: new Date().toISOString(),
      coverUrl
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    triggerToast('Playlist Created');
  };

  const updatePlaylist = async (id, title, description) => {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, title, description } : p));
    triggerToast('Playlist Updated');

    if (user && supabase) {
      await supabase
        .from('playlists')
        .update({ title, description })
        .eq('id', id)
        .eq('user_id', user.id);
    }
  };

  const deletePlaylist = async (id) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    triggerToast('Playlist Deleted');

    if (user && supabase) {
      await supabase
        .from('playlists')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
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
      await supabase
        .from('playlist_tracks')
        .insert({ playlist_id: playlistId, track_id: trackId });
    }
  };

  const removeTrackFromPlaylist = async (playlistId, trackId) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) return { ...p, tracks: p.tracks.filter(t => t !== trackId) };
      return p;
    }));
    triggerToast('Removed from Playlist');

    if (user && supabase) {
      await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId);
    }
  };

  return (
    <LibraryContext.Provider value={{
      favorites, toggleFavorite, toastMessage, triggerToast,
      playlists, createPlaylist, updatePlaylist, deletePlaylist, 
      addTrackToPlaylist, removeTrackFromPlaylist,
      listeningStats, recordTrackPlay
    }}>
      {children}
    </LibraryContext.Provider>
  );
};
