import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { MUSIC_CATALOGUE } from '../data/catalogue';

export const PlayerContext = createContext();

export const PlayerProvider = ({ children, setToastMessage }) => {
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

  const currentTrack = (queue && queue[currentIndex]) ? queue[currentIndex] : MUSIC_CATALOGUE[0];

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    setAudioError(false); 

    // If track has a YouTube stream ID, let the YouTubeAudioEngine handle playback
    if (currentTrack.youtubeId) {
      audioRef.current.pause();
      return;
    }

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
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const play = useCallback((track, newQueue = null) => {
    if (newQueue) setQueue(newQueue);
    const targetQueue = newQueue || queue;
    const index = targetQueue.findIndex(t => t.id === track.id);
    
    setCurrentIndex(index !== -1 ? index : 0);
    setIsPlaying(true);
  }, [queue]);

  const togglePlay = () => setIsPlaying(!isPlaying);

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
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    setCurrentIndex((prev) => (prev - 1 + queue.length) % queue.length);
    setIsPlaying(true);
  }, [currentTime, queue.length]);

  // Robust HTML5 Seek Implementation
  const seek = useCallback((targetTime) => {
    const numericTime = Number(targetTime);
    if (isNaN(numericTime) || !isFinite(numericTime)) return;

    const maxDuration = (audioRef.current && audioRef.current.duration) || currentTrack.duration || 100;
    const validTarget = Math.max(0, Math.min(numericTime, maxDuration));

    isSeekingRef.current = true;
    setCurrentTime(validTarget);

    if (audioRef.current && !currentTrack.youtubeId) {
      try {
        audioRef.current.currentTime = validTarget;
      } catch (err) {
        console.error("Seek error:", err);
        isSeekingRef.current = false;
      }
    } else {
      isSeekingRef.current = false;
    }
  }, [currentTrack]);

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
    if (!currentTrack || currentTrack.youtubeId) return;
    setAudioError(true);
    setIsPlaying(false);
    if (setToastMessage) setToastMessage(`Failed to load audio: ${currentTrack.title}`);
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying, currentTime, duration, volume, isMuted, isShuffle, isRepeat, audioError,
      play, togglePlay, next, prev, seek, setVolume, setIsMuted, setIsShuffle, setIsRepeat, queue,
      setCurrentTime, setDuration, setAudioError
    }}>
      <audio
        ref={audioRef} 
        src={currentTrack?.youtubeId ? undefined : currentTrack?.audioUrl}
        preload="metadata"
        onTimeUpdate={() => {
          if (audioRef.current && !isSeekingRef.current && !currentTrack?.youtubeId) {
            setCurrentTime(audioRef.current.currentTime);
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
