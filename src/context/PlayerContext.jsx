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
  const isSeekingRef = useRef(false);

  const currentTrack = (queue && queue[currentIndex]) ? queue[currentIndex] : MUSIC_CATALOGUE[0];

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    setAudioError(false); 
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name !== 'AbortError') {
            console.error("Playback failed:", err);
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

  // Robust seek method with HTML5 audio seekable range check
  const seek = useCallback((targetTime) => {
    if (!audioRef.current) return;
    const validTarget = Math.max(0, Math.min(Number(targetTime) || 0, audioRef.current.duration || 1000));
    
    try {
      isSeekingRef.current = true;
      audioRef.current.currentTime = validTarget;
      setCurrentTime(validTarget);
      
      // Delay releasing seek lock so timeupdate doesn't overwrite it mid-frame
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    } catch (err) {
      console.error("Direct HTML5 Seek Error:", err);
      isSeekingRef.current = false;
    }
  }, []);

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
    if (setToastMessage) setToastMessage(`Failed to load: ${currentTrack.title}`);
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying, currentTime, duration, volume, isMuted, isShuffle, isRepeat, audioError,
      play, togglePlay, next, prev, seek, setVolume, setIsMuted, setIsShuffle, setIsRepeat, queue
    }}>
      <audio
        ref={audioRef} 
        src={currentTrack?.audioUrl}
        onTimeUpdate={() => {
          if (audioRef.current && !isSeekingRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && !isNaN(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={handleEnded}
        onError={handleError}
      />
      {children}
    </PlayerContext.Provider>
  );
};
