import React, { useEffect, useRef, useContext } from 'react';
import { PlayerContext } from '../../contexts/PlayerContext';

export const YouTubeAudioEngine = () => {
  const { 
    currentTrack, 
    isPlaying, 
    volume, 
    isMuted, 
    seek, 
    currentTime, 
    setCurrentTime, 
    setDuration,
    next 
  } = useContext(PlayerContext);
  
  const playerRef = useRef(null);
  const isReadyRef = useRef(false);

  // Dynamically load YouTube iFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  }, []);

  // Initialize or update YouTube Player when track changes
  useEffect(() => {
    if (!currentTrack || !currentTrack.youtubeId) {
      if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
        try { playerRef.current.stopVideo(); } catch {}
      }
      return;
    }

    const initOrLoad = () => {
      if (window.YT && window.YT.Player) {
        if (!playerRef.current) {
          playerRef.current = new window.YT.Player('youtube-hidden-player', {
            height: '1',
            width: '1',
            videoId: currentTrack.youtubeId,
            playerVars: {
              autoplay: isPlaying ? 1 : 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              playsinline: 1
            },
            events: {
              onReady: (event) => {
                isReadyRef.current = true;
                try {
                  event.target.setVolume((isMuted ? 0 : volume) * 100);
                  if (isPlaying) event.target.playVideo();
                  if (setDuration && event.target.getDuration) {
                    const dur = event.target.getDuration();
                    if (dur && dur > 0) setDuration(dur);
                  }
                } catch {}
              },
              onStateChange: (event) => {
                // YT.PlayerState.ENDED is 0
                if (event.data === 0) {
                  if (next) next();
                }
              }
            }
          });
        } else {
          try {
            playerRef.current.loadVideoById(currentTrack.youtubeId);
            if (!isPlaying && typeof playerRef.current.pauseVideo === 'function') {
              playerRef.current.pauseVideo();
            }
          } catch (e) {
            console.error("YouTube loadVideoById error:", e);
          }
        }
      }
    };

    if (window.YT && window.YT.Player) {
      initOrLoad();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        initOrLoad();
      };
    }
  }, [currentTrack?.id, currentTrack?.youtubeId]);

  // Sync Play / Pause
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current || !currentTrack?.youtubeId) return;
    try {
      if (isPlaying && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      } else if (!isPlaying && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    } catch {}
  }, [isPlaying, currentTrack?.youtubeId]);

  // Sync Volume
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current) return;
    try {
      if (typeof playerRef.current.setVolume === 'function') {
        playerRef.current.setVolume((isMuted ? 0 : volume) * 100);
      }
    } catch {}
  }, [volume, isMuted]);

  // High-frequency 200ms polling for microsecond-precise karaoke lyrics synchronization
  useEffect(() => {
    if (!isPlaying || !currentTrack?.youtubeId) return;
    const interval = setInterval(() => {
      if (playerRef.current && isReadyRef.current) {
        try {
          if (typeof playerRef.current.getCurrentTime === 'function' && setCurrentTime) {
            const time = playerRef.current.getCurrentTime();
            if (!isNaN(time) && isFinite(time)) setCurrentTime(time);
          }
          if (typeof playerRef.current.getDuration === 'function' && setDuration) {
            const dur = playerRef.current.getDuration();
            if (!isNaN(dur) && isFinite(dur) && dur > 0) setDuration(dur);
          }
        } catch {}
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.youtubeId, setCurrentTime, setDuration]);

  return (
    <div className="absolute top-0 left-0 opacity-0 pointer-events-none w-1 h-1 overflow-hidden z-[-9999]" aria-hidden="true">
      <div id="youtube-hidden-player" />
    </div>
  );
};
