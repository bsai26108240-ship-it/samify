import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from './AuthContext';
import { MUSIC_CATALOGUE } from '../data/catalogue';

export const LibraryContext = createContext();

// Helper to guarantee valid RFC4122 UUID for postgres compatibility
const toValidUuid = (id) => {
  if (!id || id === 'guest') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  let hex = '';
  for (let i = 0; i < id.length; i++) {
    hex += id.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

export const LibraryProvider = ({ children }) => {
  const { user } = useContext(AuthContext) || {};
  const userKey = user?.id || 'guest';
  const supabaseUserId = useMemo(() => toValidUuid(user?.id), [user?.id]);

  // Dynamic Global Catalogue initialized with built-in catalogue + any imported tracks
  const [globalTracks, setGlobalTracks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`samify_tracks_${userKey}`));
      if (Array.isArray(saved) && saved.length > 0) {
        const catalogueById = new Map(MUSIC_CATALOGUE.map(t => [String(t.id), t]));
        // Built-in tracks always adopt the freshest stream URLs so a stale
        // local-storage copy (e.g. dead /audio paths or old mirrors) never
        // shadow the working fallbackAudioUrl chain.
        const revivedSaved = saved.map(t => {
          const fresh = catalogueById.get(String(t.id));
          return fresh ? { ...fresh, ...t, audioUrl: fresh.audioUrl, streamUrl: fresh.audioUrl, fallbackAudioUrl: fresh.fallbackAudioUrl, fallbackStreamUrl: fresh.fallbackStreamUrl || '' } : t;
        });
        const existingIds = new Set(revivedSaved.map(t => String(t.id)));
        return [...revivedSaved, ...MUSIC_CATALOGUE.filter(t => !existingIds.has(String(t.id)))];
      }
      return MUSIC_CATALOGUE;
    } catch {
      return MUSIC_CATALOGUE;
    }
  });

  // Liked songs / Favorites state
  const [favorites, setFavorites] = useState(() => {
    try { 
      const local = JSON.parse(localStorage.getItem(`samify_favorites_${userKey}`));
      if (Array.isArray(local)) return local;
      return user ? [] : ['1', '3']; 
    } catch { 
      return user ? [] : ['1', '3']; 
    }
  });

  // Custom playlists state
  const [playlists, setPlaylists] = useState(() => {
    try { 
      const local = JSON.parse(localStorage.getItem(`samify_playlists_${userKey}`));
      return Array.isArray(local) ? local : []; 
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

  // Sync isolated state from LocalStorage on user switch
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

  // Persist local state to LocalStorage
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

  // Authenticated Session Handling & Clean Merge with Cloud Data
  useEffect(() => {
    if (!supabaseUserId || !supabase) return;

    let isSubscribed = true;

    const fetchAndMergeCloudData = async () => {
      try {
        // 1. Fetch Cloud Liked Songs (user_likes)
        const { data: cloudLikes, error: likesError } = await supabase
          .from('user_likes')
          .select('track_id, track_data')
          .eq('user_id', supabaseUserId);

        if (!likesError && cloudLikes && isSubscribed) {
          const cloudTrackIds = cloudLikes.map(item => item.track_id);
          const guestFavs = JSON.parse(localStorage.getItem('samify_favorites_guest') || '[]');

          // Merge local guest likes with cloud likes cleanly
          const mergedLikes = Array.from(new Set([...cloudTrackIds, ...guestFavs]));
          setFavorites(mergedLikes);

          // Register any cloud track metadata into global catalogue
          const newCloudTracks = cloudLikes
            .filter(item => item.track_data && item.track_data.id)
            .map(item => item.track_data);

          if (newCloudTracks.length > 0) {
            setGlobalTracks(prev => {
              const existingMap = new Map(prev.map(t => [t.id, t]));
              newCloudTracks.forEach(t => existingMap.set(t.id, t));
              return Array.from(existingMap.values());
            });
          }

          // If guest had local likes not yet in cloud, sync them up
          const uncommittedGuestLikes = guestFavs.filter(id => !cloudTrackIds.includes(id));
          if (uncommittedGuestLikes.length > 0) {
            const guestUpserts = uncommittedGuestLikes.map(id => {
              const trackData = globalTracks.find(t => t.id === id) || { id };
              return {
                user_id: supabaseUserId,
                track_id: id,
                track_data: trackData
              };
            });
            await supabase.from('user_likes').upsert(guestUpserts, { onConflict: 'user_id,track_id' });
          }
        }

        // 2. Fetch Cloud Playlists (user_playlists)
        const { data: cloudPlaylists, error: plsError } = await supabase
          .from('user_playlists')
          .select('id, name, tracks, updated_at')
          .eq('user_id', supabaseUserId);

        if (!plsError && cloudPlaylists && isSubscribed) {
          const formattedCloud = cloudPlaylists.map(pl => {
            const trackList = Array.isArray(pl.tracks) 
              ? pl.tracks.map(t => typeof t === 'object' && t !== null ? t.id : String(t))
              : [];
            return {
              id: pl.id,
              name: pl.name,
              title: pl.name,
              tracks: trackList,
              coverUrl: `https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80`,
              updatedAt: pl.updated_at
            };
          });

          // Merge guest playlists if they don't already exist in cloud
          const guestPls = JSON.parse(localStorage.getItem('samify_playlists_guest') || '[]');
          const cloudIds = new Set(formattedCloud.map(p => p.id));
          const uncommittedGuestPls = guestPls.filter(p => !cloudIds.has(p.id));

          const combined = [...formattedCloud, ...uncommittedGuestPls];
          setPlaylists(combined);

          if (uncommittedGuestPls.length > 0) {
            const plUpserts = uncommittedGuestPls.map(p => ({
              id: p.id.length > 30 ? p.id : undefined,
              user_id: supabaseUserId,
              name: p.name || p.title || 'My Playlist',
              tracks: p.tracks || []
            }));
            await supabase.from('user_playlists').upsert(plUpserts);
          }
        }
      } catch (err) {
        console.error("Supabase user session sync error:", err);
      }
    };

    fetchAndMergeCloudData();

    // Real-Time Cross-Device Sync Listening
    const fetchUserLikes = async (uid) => {
      try {
        const { data: cloudLikes, error } = await supabase
          .from('user_likes')
          .select('track_id, track_data')
          .eq('user_id', uid);

        if (!error && cloudLikes && isSubscribed) {
          const cloudTrackIds = cloudLikes.map(item => item.track_id);
          setFavorites(cloudTrackIds);

          const newCloudTracks = cloudLikes
            .filter(item => item.track_data && item.track_data.id)
            .map(item => item.track_data);

          if (newCloudTracks.length > 0) {
            setGlobalTracks(prev => {
              const existingMap = new Map(prev.map(t => [t.id, t]));
              newCloudTracks.forEach(t => existingMap.set(t.id, t));
              return Array.from(existingMap.values());
            });
          }
        }
      } catch (err) {
        console.error("fetchUserLikes error:", err);
      }
    };

    const fetchUserPlaylists = async (uid) => {
      try {
        const { data: cloudPlaylists, error } = await supabase
          .from('user_playlists')
          .select('id, name, tracks, updated_at')
          .eq('user_id', uid);

        if (!error && cloudPlaylists && isSubscribed) {
          const formattedCloud = cloudPlaylists.map(pl => {
            const trackList = Array.isArray(pl.tracks) 
              ? pl.tracks.map(t => typeof t === 'object' && t !== null ? t.id : String(t))
              : [];
            return {
              id: pl.id,
              name: pl.name,
              title: pl.name,
              tracks: trackList,
              coverUrl: `https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80`,
              updatedAt: pl.updated_at
            };
          });
          setPlaylists(formattedCloud);
        }
      } catch (err) {
        console.error("fetchUserPlaylists error:", err);
      }
    };

    const likesChannel = supabase
      .channel(`public:user_likes:${supabaseUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_likes',
          filter: `user_id=eq.${supabaseUserId}`
        },
        (payload) => {
          if (!isSubscribed) return;
          fetchUserLikes(supabaseUserId);
        }
      )
      .subscribe();

    const playlistsChannel = supabase
      .channel(`public:user_playlists:${supabaseUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_playlists',
          filter: `user_id=eq.${supabaseUserId}`
        },
        (payload) => {
          if (!isSubscribed) return;
          fetchUserPlaylists(supabaseUserId);
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(playlistsChannel);
    };
  }, [supabaseUserId]);

  // Action Methods

  // toggleLikeSong: Optimistic update, LocalStorage write, Supabase user_likes sync
  const toggleLikeSong = useCallback(async (trackOrId) => {
    const trackId = typeof trackOrId === 'object' && trackOrId !== null ? trackOrId.id : String(trackOrId);
    const trackData = typeof trackOrId === 'object' && trackOrId !== null 
      ? trackOrId 
      : (globalTracks.find(t => t.id === trackId) || { id: trackId });

    // Register streamed tracks locally so they survive in the liked library.
    if (typeof trackOrId === 'object' && trackOrId !== null && trackOrId.title) {
      setGlobalTracks(prev => {
        if (prev.some(t => t.id === trackId)) return prev;
        return [...prev, trackOrId];
      });
    }

    const isFav = favorites.includes(trackId);
    const newFavs = isFav ? favorites.filter(id => id !== trackId) : [...favorites, trackId];

    // Optimistically update React State and LocalStorage
    setFavorites(newFavs);
    try {
      localStorage.setItem(`samify_favorites_${userKey}`, JSON.stringify(newFavs));
    } catch {}

    triggerToast(isFav ? 'Removed from Likes' : 'Added to Likes');

    // Sync to Supabase user_likes if authenticated
    if (supabaseUserId && supabase) {
      try {
        if (isFav) {
          await supabase
            .from('user_likes')
            .delete()
            .match({ user_id: supabaseUserId, track_id: trackId });
        } else {
          await supabase
            .from('user_likes')
            .upsert({
              user_id: supabaseUserId,
              track_id: trackId,
              track_data: trackData
            }, { onConflict: 'user_id,track_id' });
        }
      } catch (err) {
        console.error("Cloud like synchronization error:", err);
      }
    }
  }, [favorites, globalTracks, userKey, supabaseUserId, triggerToast]);

  // Alias for backward compatibility
  const toggleFavorite = toggleLikeSong;

  // createPlaylist: Optimistic update, LocalStorage write, Supabase user_playlists sync
  const createPlaylist = useCallback(async (nameOrTitle, description = '', initialTracks = []) => {
    const name = typeof nameOrTitle === 'object' && nameOrTitle !== null ? (nameOrTitle.name || nameOrTitle.title) : (nameOrTitle || 'My Playlist');
    const trackIds = Array.isArray(initialTracks) 
      ? initialTracks.map(t => typeof t === 'object' && t !== null ? t.id : String(t))
      : [];

    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `pl_${Date.now()}`;
    const coverUrl = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*100000)}?w=500&auto=format&fit=crop&q=80`;

    const newPlaylist = {
      id: newId,
      name,
      title: name,
      description,
      tracks: trackIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      coverUrl
    };

    // Optimistically update UI State & LocalStorage
    setPlaylists(prev => {
      const updated = [...prev, newPlaylist];
      try { localStorage.setItem(`samify_playlists_${userKey}`, JSON.stringify(updated)); } catch {}
      return updated;
    });

    triggerToast('Playlist Created');

    // Sync to Supabase user_playlists if authenticated
    if (supabaseUserId && supabase) {
      try {
        const payload = {
          user_id: supabaseUserId,
          name,
          tracks: trackIds
        };
        // If newId is valid UUID, persist identical ID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(newId)) {
          payload.id = newId;
        }

        const { data, error } = await supabase
          .from('user_playlists')
          .insert(payload)
          .select()
          .single();

        if (data && !error && data.id !== newId) {
          // Reconcile ID if server generated an alternative uuid
          setPlaylists(prev => prev.map(p => p.id === newId ? { ...p, id: data.id } : p));
          return data.id;
        }
      } catch (err) {
        console.error("Cloud playlist creation sync error:", err);
      }
    }

    return newId;
  }, [userKey, supabaseUserId, triggerToast]);

  // addTrackToPlaylist: Optimistic update, LocalStorage write, Supabase sync
  const addTrackToPlaylist = useCallback(async (playlistId, trackOrId) => {
    const trackId = typeof trackOrId === 'object' && trackOrId !== null ? trackOrId.id : String(trackOrId);

    // If track object provided, ensure it's registered into global tracks
    if (typeof trackOrId === 'object' && trackOrId !== null && trackOrId.title) {
      setGlobalTracks(prev => {
        if (prev.some(t => t.id === trackId)) return prev;
        return [...prev, trackOrId];
      });
    }

    let updatedPlaylistTracks = [];
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId && !p.tracks.includes(trackId)) {
        updatedPlaylistTracks = [...p.tracks, trackId];
        return { ...p, tracks: updatedPlaylistTracks, updatedAt: new Date().toISOString() };
      }
      return p;
    }));

    triggerToast('Added to Playlist');

    // Sync payload to Supabase user_playlists
    if (supabaseUserId && supabase && updatedPlaylistTracks.length > 0) {
      try {
        await supabase
          .from('user_playlists')
          .update({ 
            tracks: updatedPlaylistTracks, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', playlistId)
          .eq('user_id', supabaseUserId);
      } catch (err) {
        console.error("Cloud playlist track addition sync error:", err);
      }
    }
  }, [supabaseUserId, triggerToast]);

  // removeTrackFromPlaylist: Optimistic update, LocalStorage write, Supabase sync
  const removeTrackFromPlaylist = useCallback(async (playlistId, trackId) => {
    let updatedPlaylistTracks = [];
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        updatedPlaylistTracks = p.tracks.filter(t => t !== trackId);
        return { ...p, tracks: updatedPlaylistTracks, updatedAt: new Date().toISOString() };
      }
      return p;
    }));

    triggerToast('Removed from Playlist');

    // Sync payload to Supabase user_playlists
    if (supabaseUserId && supabase) {
      try {
        await supabase
          .from('user_playlists')
          .update({ 
            tracks: updatedPlaylistTracks, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', playlistId)
          .eq('user_id', supabaseUserId);
      } catch (err) {
        console.error("Cloud playlist track removal sync error:", err);
      }
    }
  }, [supabaseUserId, triggerToast]);

  // deletePlaylist: Optimistic update, LocalStorage write, Supabase sync
  const deletePlaylist = useCallback(async (playlistId) => {
    setPlaylists(prev => {
      const filtered = prev.filter(p => p.id !== playlistId);
      try { localStorage.setItem(`samify_playlists_${userKey}`, JSON.stringify(filtered)); } catch {}
      return filtered;
    });

    triggerToast('Playlist Deleted');

    // Sync payload to Supabase user_playlists
    if (supabaseUserId && supabase) {
      try {
        await supabase
          .from('user_playlists')
          .delete()
          .eq('id', playlistId)
          .eq('user_id', supabaseUserId);
      } catch (err) {
        console.error("Cloud playlist deletion sync error:", err);
      }
    }
  }, [userKey, supabaseUserId, triggerToast]);

  // updatePlaylist
  const updatePlaylist = useCallback(async (playlistId, titleOrName, description = '') => {
    const name = typeof titleOrName === 'object' && titleOrName !== null ? (titleOrName.name || titleOrName.title) : titleOrName;
    setPlaylists(prev => prev.map(p => (p.id === playlistId ? { ...p, name, title: name, description } : p)));
    triggerToast('Playlist Updated');

    if (supabaseUserId && supabase) {
      try {
        await supabase
          .from('user_playlists')
          .update({ name, updated_at: new Date().toISOString() })
          .eq('id', playlistId)
          .eq('user_id', supabaseUserId);
      } catch (err) {
        console.error("Cloud playlist update sync error:", err);
      }
    }
  }, [supabaseUserId, triggerToast]);

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

  return (
    <LibraryContext.Provider value={{
      globalTracks, 
      setGlobalTracks,
      favorites, 
      likedSongs: favorites,
      toggleFavorite, 
      toggleLikeSong,
      toastMessage, 
      triggerToast,
      playlists, 
      customPlaylists: playlists,
      createPlaylist, 
      updatePlaylist, 
      deletePlaylist, 
      addTrackToPlaylist, 
      removeTrackFromPlaylist,
      listeningStats, 
      recordTrackPlay
    }}>
      {children}
    </LibraryContext.Provider>
  );
};
