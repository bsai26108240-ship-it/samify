export const setupMediaSession = ({ track, playerRef, onPlay, onPause, onNext, onPrev, onSeek }) => {
  if (!('mediaSession' in navigator) || !track) return;

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
        { src: track.coverUrl || '/default-cover.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    // Playback state
    navigator.mediaSession.playbackState = 'playing';

    // System notification shade play/pause/seek controls
    navigator.mediaSession.setActionHandler('play', () => {
      navigator.mediaSession.playbackState = 'playing';
      onPlay?.();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      navigator.mediaSession.playbackState = 'paused';
      onPause?.();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      onPrev?.();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      onNext?.();
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) {
        if (onSeek) {
          onSeek(details.seekTime);
        } else if (playerRef?.current) {
          playerRef.current.currentTime = details.seekTime;
        }
      }
    });
  } catch (err) {
    console.warn('Error setting up MediaSession:', err);
  }
};

export const updateMediaSession = setupMediaSession;


