import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { getOfflineTrackUrl, saveTrackOffline, isTrackDownloaded } from '@/utils/offlineStorage';
import { MUSIC_CATALOGUE } from '@/data/catalogue';

export const PlayerContext = createContext();

export const PlayerProvider = ({ children, setToastMessage }) => {
  const audioRef = useRef(new Audio());
  const [queue, setQueue] = useState(MUSIC_CATALOGUE || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTrack, setCurrentTrack] = useState(() => (MUSIC_CATALOGUE && MUSIC_CATALOGUE[0]) || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Configure native HTML5 Audio element for mobile background playback
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playsInline = true;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.preload = 'auto';
    }
  }, []);

  // Update volume & mute states on audioRef
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Audio Event Listeners Setup
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
      } else {
        playNext();
      }
    };

    const handleError = () => {
      setAudioError(true);
      setIsPlaying(false);
      if (setToastMessage && currentTrack) {
        setToastMessage(`Failed to load audio: ${currentTrack.title}`);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [isDragging, isRepeat, currentIndex, queue, currentTrack, setToastMessage]);

  // Configure Web MediaSession API for Background & Lock Screen Playback Controls
  const setupMediaSession = useCallback((track) => {
    if ('mediaSession' in navigator && track) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || 'Unknown Track',
          artist: track.artist || 'Unknown Artist',
          album: track.album || 'Samify',
          artwork: [
            { src: track.coverUrl || '/default-cover.png', sizes: '96x96', type: 'image/png' },
            { src: track.coverUrl || '/default-cover.png', sizes: '128x128', type: 'image/png' },
            { src: track.coverUrl || '/default-cover.png', sizes: '192x192', type: 'image/png' },
            { src: track.coverUrl || '/default-cover.png', sizes: '256x256', type: 'image/png' },
            { src: track.coverUrl || '/default-cover.png', sizes: '384x384', type: 'image/png' },
            { src: track.coverUrl || '/default-cover.png', sizes: '512x512', type: 'image/png' },
          ],
        });

        navigator.mediaSession.setActionHandler('play', () => {
          const audio = audioRef.current;
          audio.play().then(() => setIsPlaying(true)).catch(console.error);
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          const audio = audioRef.current;
          audio.pause();
          setIsPlaying(false);
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
          playPrevious();
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
          playNext();
        });

        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime != null) {
            seek(details.seekTime);
          }
        });
      } catch (err) {
        console.warn('Error setting up MediaSession:', err);
      }
    }
  }, []);

  // Handle Play Track & Check Offline IndexedDB Storage
  const playTrack = async (track, newQueue = null) => {
    if (!track) return;
    setAudioError(false);

    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(t => t.id === track.id);
      setCurrentIndex(idx !== -1 ? idx : 0);
    } else if (queue && queue.length > 0) {
      const idx = queue.findIndex(t => t.id === track.id);
      if (idx !== -1) setCurrentIndex(idx);
    }

    setCurrentTrack(track);

    // Prioritize offline IndexedDB Blob URL over online network URL
    let playbackUrl = null;
    try {
      const localBlobUrl = await getOfflineTrackUrl(track.id);
      playbackUrl = localBlobUrl || track.audioUrl || track.streamUrl;
      const downloadedState = await isTrackDownloaded(track.id);
      setIsDownloaded(downloadedState);
    } catch {
      playbackUrl = track.audioUrl || track.streamUrl;
    }

    if (!playbackUrl) return;

    const audio = audioRef.current;
    if (audio.src !== playbackUrl) {
      audio.src = playbackUrl;
    }
    audio.volume = isMuted ? 0 : volume;
    audio.playsInline = true;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.preload = 'auto';

    try {
      await audio.play();
      setIsPlaying(true);
      setupMediaSession(track);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Audio playback error:', err);
        setIsPlaying(false);
        setAudioError(true);
      }
    }
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const playNext = () => {
    if (!queue || queue.length === 0) return;
    let nextIdx;
    if (isShuffle && queue.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * queue.length);
      } while (nextIdx === currentIndex);
    } else {
      nextIdx = (currentIndex + 1) % queue.length;
    }
    setCurrentIndex(nextIdx);
    playTrack(queue[nextIdx]);
  };

  const playPrevious = () => {
    if (!queue || queue.length === 0) return;
    const audio = audioRef.current;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prevIdx = (currentIndex - 1 + queue.length) % queue.length;
    setCurrentIndex(prevIdx);
    playTrack(queue[prevIdx]);
  };

  const seek = (time) => {
    const numericTime = Number(time);
    if (isNaN(numericTime) || !isFinite(numericTime)) return;
    const audio = audioRef.current;
    const maxDuration = audio.duration || currentTrack?.duration || 100;
    const validTarget = Math.max(0, Math.min(numericTime, maxDuration));
    audio.currentTime = validTarget;
    setCurrentTime(validTarget);
  };

  const changeVolume = (val) => {
    const numericVal = Math.max(0, Math.min(1, Number(val)));
    setVolume(numericVal);
    audioRef.current.volume = isMuted ? 0 : numericVal;
  };

  const handleDownloadToggle = async () => {
    if (!currentTrack) return;
    try {
      if (isDownloaded) {
        setIsDownloaded(false);
      } else {
        await saveTrackOffline(currentTrack);
        setIsDownloaded(true);
      }
    } catch (err) {
      console.error('Download toggle failed:', err);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        setVolume: changeVolume,
        changeVolume,
        isDownloaded,
        isDragging,
        setIsDragging,
        playTrack,
        play: playTrack,
        togglePlay,
        pause: () => {
          audioRef.current.pause();
          setIsPlaying(false);
        },
        playNext,
        next: playNext,
        playPrevious,
        prev: playPrevious,
        seek,
        handleDownloadToggle,
        queue,
        setQueue,
        currentIndex,
        setCurrentIndex,
        isMuted,
        setIsMuted,
        isShuffle,
        setIsShuffle,
        isRepeat,
        setIsRepeat,
        audioError,
        setAudioError,
        setCurrentTime,
        setDuration,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
export default PlayerContext;
