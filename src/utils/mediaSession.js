export const updateMediaSession = ({ track, onPlay, onPause, onSeek }) => {
  if (!('mediaSession' in navigator) || !track) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title || 'Unknown Track',
    artist: track.artist || 'Unknown Artist',
    album: track.album || 'Samify',
    artwork: [
      { src: track.coverUrl || '/default-cover.png', sizes: '96x96', type: 'image/png' },
      { src: track.coverUrl || '/default-cover.png', sizes: '512x512', type: 'image/png' }
    ]
  });

  // System notification shade play/pause/seek controls
  navigator.mediaSession.setActionHandler('play', () => onPlay?.());
  navigator.mediaSession.setActionHandler('pause', () => onPause?.());
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime && onSeek) onSeek(details.seekTime);
  });
};

