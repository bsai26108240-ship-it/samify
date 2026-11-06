import React, { createContext, useState, useEffect, useRef, useCallback, useContext } from 'react';
import { MUSIC_CATALOGUE } from '../data/catalogue';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../contexts/AuthContext';
import { setupMediaSession, updateMediaSession } from '../utils/mediaSession';
import { getDirectAudioUrl } from '../services/audioStreamService';

export const PlayerContext = createContext();

export const PlayerProvider = ({ children, setToastMessage }) => {
  const { user } = useContext(AuthContext) || {};
  const audioRef = useRef(null);
  const [queue, setQueue] = useState(MUSIC_CATALOGUE);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [audioError, setAudioError] = useState(false);
  
  // Track seeking state to prevent React state fighting HTML5 audio events
  const isSeekingRef = useRef(false);

  // Critical attributes for Mobile Background Playback
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playsInline = true;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.preload = 'auto';
    }
  }, []);

  const currentTrack = (queue && queue[currentIndex]) ? queue[currentIndex] : (queue && queue[0]) || MUSIC_CATALOGUE[0];

  const playTrack = useCallback(async (track, newQueue = null) => {
    if (newQueue) setQueue(newQueue);
    const targetQueue = newQueue || queue;
    if (track) {
      const index = targetQueue.findIndex(t => t.id === track.id);
      setCurrentIndex(index !== -1 ? index : 0);
    }

    const trackToPlay = track || currentTrack;
    if (!trackToPlay) return;

    try {
      // Extract direct stream if only youtubeId or id exists
      let streamUrl = trackToPlay.audioUrl || trackToPlay.streamUrl;
      if (!streamUrl && (trackToPlay.youtubeId || trackToPlay.id)) {
        const targetId = trackToPlay.youtubeId || trackToPlay.id;
        streamUrl = await getDirectAudioUrl(targetId);
      }

      if (audioRef.current && streamUrl) {
        if (audioRef.current.src !== streamUrl) {
          audioRef.current.src = streamUrl;
        }
        audioRef.current.playsInline = true;
        audioRef.current.setAttribute('playsinline', 'true');
        audioRef.current.setAttribute('webkit-playsinline', 'true');
        audioRef.current.preload = 'auto';

        await audioRef.current.play();
        setIsPlaying(true);
      } else {
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Failed to play direct audio stream:', err);
      setIsPlaying(false);
    }
  }, [queue, currentTrack]);

  const play = playTrack;

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((prev) => {
      if (isShuffle && queue.length > 1) {
        let nextIdx;
        do { nextIdx = Math.floor(Math.random() * queue.length); } while (nextIdx === prev);
        return nextIdx;
      }
      return (prev + 1) % queue.length;
    });
    setIsPlaying(true);
  }, [isShuffle, queue.length]);

  const prev = useCallback(() => {
    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      return;
    }
    setCurrentIndex((prev) => (prev - 1 + queue.length) % queue.length);
    setIsPlaying(true);
  }, [currentTime, queue.length, currentTrack?.youtubeId]);

  // Robust Seek Implementation (HTML5 Audio + YouTube Audio)
  const seek = useCallback((targetTime) => {
    const numericTime = Number(targetTime);
    if (isNaN(numericTime) || !isFinite(numericTime)) return;

    const maxDuration = (audioRef.current && audioRef.current.duration) || currentTrack.duration || 100;
    const validTarget = Math.max(0, Math.min(numericTime, maxDuration));

    isSeekingRef.current = true;
    setCurrentTime(validTarget);

    if (audioRef.current) {
      try {
        audioRef.current.currentTime = validTarget;
      } catch (err) {
        console.error("Seek error:", err);
      }
      isSeekingRef.current = false;
    }
  }, [currentTrack]);

  // Ensure streamUrl is loaded whenever currentTrack changes
  useEffect(() => {
    let isCancelled = false;
    const syncTrackStream = async () => {
      if (!currentTrack) return;
      try {
        let streamUrl = currentTrack.audioUrl || currentTrack.streamUrl;
        if (!streamUrl && (currentTrack.youtubeId || currentTrack.id)) {
          const targetId = currentTrack.youtubeId || currentTrack.id;
          streamUrl = await getDirectAudioUrl(targetId);
        }

        if (audioRef.current && streamUrl && !isCancelled) {
          if (audioRef.current.src !== streamUrl) {
            audioRef.current.src = streamUrl;
            if (isPlaying) {
              audioRef.current.play().catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load direct track stream:", err);
      }
    };

    syncTrackStream();

    return () => {
      isCancelled = true;
    };
  }, [currentTrack]);
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    setAudioError(false); 

    // Mobile background playback / lock-screen notification hook
    setupMediaSession({
      track: currentTrack,
      playerRef: audioRef,
      onPlay: () => setIsPlaying(true),
      onPause: pause,
      onNext: next,
      onPrev: prev,
      onSeek: seek
    });

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name !== 'AbortError') {
            console.error("Playback error:", err);
            setIsPlaying(false);
            setAudioError(true);
          }
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack, pause, seek]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Broadcast current listening presence to Supabase user_profiles
  useEffect(() => {
    if (!user || !currentTrack || !supabase) return;

    const broadcastPresence = async () => {
      try {
        const username = user.name || (user.email ? user.email.split('@')[0] : 'Music Fan');
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let userId = user.id;
        if (!uuidRegex.test(userId)) {
          let hex = '';
          for (let i = 0; i < String(userId).length; i++) {
            hex += String(userId).charCodeAt(i).toString(16);
          }
          hex = hex.padEnd(32, '0').slice(0, 32);
          userId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
        }

        await supabase.from('user_profiles').upsert({
          id: userId,
          username,
          avatar_url: user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          current_track: { 
            title: currentTrack.title, 
            artist: currentTrack.artist, 
            coverUrl: currentTrack.coverUrl,
            isPlaying
          },
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        // Silently catch if table not yet migrated
      }
    };

    broadcastPresence();
  }, [user, currentTrack?.id, isPlaying]);

  const handleEnded = () => {
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    } else {
      next();
    }
  };

  const handleError = () => {
    if (!currentTrack) return;
    setAudioError(true);
    setIsPlaying(false);
    if (setToastMessage) setToastMessage(`Failed to load audio: ${currentTrack.title}`);
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying, currentTime, duration, volume, isMuted, isShuffle, isRepeat, audioError,
      play, pause, togglePlay, next, prev, seek, setVolume, setIsMuted, setIsShuffle, setIsRepeat, queue,
      setCurrentTime, setDuration, setAudioError,
      playTrack: play
    }}>
      <audio
        ref={audioRef} 
        src={currentTrack?.audioUrl || undefined}
        preload="auto"
        playsInline
        webkit-playsinline="true"
        onTimeUpdate={() => {
          if (audioRef.current && !isSeekingRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setupMediaSession({
              track: currentTrack,
              playerRef: audioRef,
              onPlay: () => setIsPlaying(true),
              onPause: pause,
              onNext: next,
              onPrev: prev,
              onSeek: seek
            });
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onSeeking={() => {
          isSeekingRef.current = true;
        }}
        onSeeked={() => {
          isSeekingRef.current = false;
        }}
        onEnded={handleEnded}
        onError={handleError}
      />
      {children}
    </PlayerContext.Provider>
  );
};
