import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import {
  getOfflineTrack,
  saveTrackOffline,
  deleteOfflineTrack,
  isTrackDownloaded,
  getAllOfflineTracks,
} from '@/services/offlineStorage';
import { extractStreamUrl, isSameOriginUrl, getFallbackStreamUrl } from '@/services/streamUtils';
import { recordPlay } from '@/utils/playHistory';
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [offlineTracks, setOfflineTracks] = useState([]);
  const [isOffline, setIsOffline] = useState(
    () => (typeof navigator !== 'undefined' ? !navigator.onLine : false)
  );
  const [isDragging, setIsDragging] = useState(false);

  // Playback recovery bookkeeping: which recovery URLs were already tried for
  // the current track so the error handler never loops.
  const retryRef = useRef({ trackId: null, attemptedUrls: [], busy: false });

  // Full-Screen Player Modal Expansion State
  const [isExpanded, setIsExpanded] = useState(false);

  // Latest transport controls for lock-screen handlers (avoids stale closures).
  const mediaControlsRef = useRef({});
  // Latest automatic playback recovery for the audio error handler.
  const recoveryRef = useRef(null);

  const refreshOfflineTracks = useCallback(async () => {
    const tracks = await getAllOfflineTracks();
    setOfflineTracks(tracks);
    return tracks;
  }, []);

  useEffect(() => {
    refreshOfflineTracks();
  }, [refreshOfflineTracks]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (setToastMessage) setToastMessage('Back online — streaming enabled');
    };

    const handleOffline = () => {
      setIsOffline(true);
      if (setToastMessage) setToastMessage('Offline mode — downloaded tracks only');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setToastMessage]);

  // Keep the download indicator in sync when the selected track changes.
  useEffect(() => {
    let isActive = true;

    if (!currentTrack?.id) {
      setIsDownloaded(false);
      return undefined;
    }

    isTrackDownloaded(currentTrack.id).then((downloaded) => {
      if (isActive) setIsDownloaded(downloaded);
    });

    return () => {
      isActive = false;
    };
  }, [currentTrack?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    // Keep audio alive while the PWA is backgrounded or the screen locks.
    audio.playsInline = true;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('x-webkit-airplay', 'allow');
    audio.preload = 'auto';
    audio.autoplay = false;

    // Attach a hidden element so iOS/Android treat playback as a real media
    // session instead of a detached JavaScript Audio object.
    audio.style.display = 'none';
    audio.setAttribute('aria-hidden', 'true');
    if (typeof document !== 'undefined' && !audio.parentNode) {
      document.body.appendChild(audio);
    }

    return () => {
      if (audio.parentNode) audio.parentNode.removeChild(audio);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }

      // Feed the OS lock-screen scrubber with precise position state.
      if (
        'mediaSession' in navigator &&
        typeof navigator.mediaSession.setPositionState === 'function'
      ) {
        const mediaDuration = audio.duration;
        if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: mediaDuration,
              playbackRate: audio.playbackRate || 1,
              position: Math.min(Math.max(audio.currentTime, 0), mediaDuration),
            });
          } catch {
            // Some browsers reject position state until playback starts.
          }
        }
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
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error('Playback error:', err);
            setIsPlaying(false);
          });
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
      // Attempt automatic recovery with the track's fallback stream.
      recoveryRef.current?.();
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

  const setupMediaSession = useCallback((track) => {
    if (!('mediaSession' in navigator) || !track) return;

    const artworkSrc =
      track.coverArt || track.coverUrl || '/pwa-512x512.png';
    const artworkType = /\.png(\?|$)/i.test(artworkSrc)
      ? 'image/png'
      : 'image/jpeg';

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown Track',
        artist: track.artist || 'Unknown Artist',
        album: track.album || 'Samify',
        artwork: [
          { src: artworkSrc, sizes: '512x512', type: artworkType },
          { src: artworkSrc, sizes: '192x192', type: artworkType },
        ],
      });
      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        mediaControlsRef.current.playPrevious?.();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        mediaControlsRef.current.playNext?.();
      });
    } catch (err) {
      console.warn('MediaSession metadata failed:', err);
    }
  }, []);

  // Register native lock-screen / hardware media controls once. Handlers read
  // the latest transport functions through a ref so they never act on a stale
  // queue or track index.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return undefined;

    const audio = audioRef.current;
    const handlers = {
      play: () => {
        audio.play().then(() => setIsPlaying(true)).catch((err) => console.error('Playback error:', err));
      },
      pause: () => {
        audio.pause();
        setIsPlaying(false);
      },
      previoustrack: () => mediaControlsRef.current.playPrevious?.(),
      nexttrack: () => mediaControlsRef.current.playNext?.(),
      seekto: (details) => {
        if (details?.seekTime != null) {
          mediaControlsRef.current.seek?.(details.seekTime);
        }
      },
    };

    Object.entries(handlers).forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Unsupported actions are safe to ignore.
      }
    });

    return () => {
      Object.keys(handlers).forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore unsupported actions during cleanup.
        }
      });
    };
  }, []);

  // Publish metadata as soon as a track is selected, and keep the OS playback
  // state in sync with the local audio element.
  useEffect(() => {
    if (currentTrack) setupMediaSession(currentTrack);
  }, [currentTrack, setupMediaSession]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

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

    const offlineNow = typeof navigator !== 'undefined' && navigator.onLine === false;
    let playbackUrl = '';
    let downloaded = false;

    try {
      // Offline-first: a downloaded blob always wins over the CDN stream.
      const offlineUrl = await getOfflineTrack(track.id);
      downloaded = Boolean(offlineUrl);

      const streamUrl = extractStreamUrl(track);
      const canStream = !offlineNow || isSameOriginUrl(streamUrl);
      playbackUrl = offlineUrl || (canStream ? streamUrl : '');
    } catch (error) {
      console.error('Offline lookup failed:', error);
      const streamUrl = extractStreamUrl(track);
      playbackUrl = !offlineNow || isSameOriginUrl(streamUrl) ? streamUrl : '';
    }

    setIsDownloaded(downloaded);

    if (!playbackUrl) {
      setAudioError(true);
      setIsPlaying(false);
      if (setToastMessage) {
        setToastMessage('Track not available offline. Download it first.');
      }
      return;
    }

    const audio = audioRef.current;
    if (audio.src !== playbackUrl) {
      audio.src = playbackUrl;
    }
    audio.volume = isMuted ? 0 : volume;
    retryRef.current = { trackId: track.id, attemptedUrls: [playbackUrl], busy: false };

    try {
      await audio.play();
      setIsPlaying(true);
      setupMediaSession(track);
      recordPlay(track);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Playback error:', err);
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
      return;
    }

    // The initial catalogue track has metadata but no loaded src yet.
    if (!audio.src || audioError) {
      playTrack(currentTrack);
      return;
    }

    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => console.error('Playback error:', err));
  };

  /**
   * Automatic fallback recovery: when the primary stream (or a local asset)
   * fails to load, retry the track's per-track fallback stream, then the
   * global demo stream, then the remote primary as a last resort.
   */
  const attemptPlayback = useCallback(
    async (track, url) => {
      const audio = audioRef.current;
      if (audio.src !== url) {
        audio.src = url;
      }
      audio.volume = isMuted ? 0 : volume;

      try {
        await audio.play();
        setIsPlaying(true);
        setAudioError(false);
        setupMediaSession(track);
        recordPlay(track);
        return true;
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Playback error:', err);
          setIsPlaying(false);
          setAudioError(true);
        }
        return false;
      }
    },
    [isMuted, volume, setupMediaSession]
  );

  const recoverPlayback = useCallback(() => {
    const track = currentTrack;
    if (!track || retryRef.current.busy) return;

    if (retryRef.current.trackId !== track.id) {
      retryRef.current = { trackId: track.id, attemptedUrls: [], busy: false };
    }

    const candidates = [getFallbackStreamUrl(track)];
    const primary = extractStreamUrl(track);
    // Same-origin local assets that already failed once are unlikely to
    // recover; remote candidates get priority.
    if (primary && !isSameOriginUrl(primary)) candidates.push(primary);

    const nextUrl = candidates.find(
      (url) => url && !retryRef.current.attemptedUrls.includes(url)
    );
    if (!nextUrl) return;

    retryRef.current.busy = true;
    retryRef.current.attemptedUrls.push(nextUrl);

    attemptPlayback(track, nextUrl).finally(() => {
      retryRef.current.busy = false;
    });
  }, [currentTrack, attemptPlayback]);

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
    if (!currentTrack || isDownloading) return;

    setIsDownloading(true);

    try {
      if (isDownloaded) {
        await deleteOfflineTrack(currentTrack.id);
        setIsDownloaded(false);
        if (setToastMessage) setToastMessage('Offline copy removed');
      } else {
        await saveTrackOffline(currentTrack);
        setIsDownloaded(true);
        if (setToastMessage) setToastMessage('Downloaded for offline playback');
      }

      await refreshOfflineTracks();
    } catch (error) {
      console.error('Download toggle failed:', error);
      if (setToastMessage) setToastMessage(error.message || 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  // Always expose the current transport functions to the media session handlers.
  mediaControlsRef.current = { playNext, playPrevious, seek };
  recoveryRef.current = recoverPlayback;

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
        isDownloading,
        offlineTracks,
        isOffline,
        refreshOfflineTracks,
        isDragging,
        setIsDragging,
        isExpanded,
        setIsExpanded,
        playTrack,
        play: playTrack,
        togglePlay,
        playNext,
        next: playNext,
        playPrevious,
        prev: playPrevious,
        seek,
        recoverPlayback,
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
