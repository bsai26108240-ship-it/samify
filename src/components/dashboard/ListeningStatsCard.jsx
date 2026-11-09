import React, { useEffect, useRef, useState, useContext } from 'react';
import { BarChart2, Radio } from 'lucide-react';
import { LibraryContext } from '../../contexts/LibraryContext';
import { usePlayer } from '../../contexts/PlayerContext';

const STORAGE_KEY = 'samify_listening_seconds';

// Deterministic neon equalizer bars, so the visualizer is stable across
// renders but still looks organic while audio is playing.
const VISUALIZER_BARS = Array.from({ length: 28 }, (_, index) => {
  const wave = Math.sin(index * 0.85) * 0.5 + 0.5;
  const jitter = ((index * 37) % 23) / 23;
  return Math.round(24 + wave * 46 + jitter * 30);
});

export const ListeningStatsCard = ({ className = '' }) => {
  const { listeningStats } = useContext(LibraryContext) || {};
  const { isPlaying, currentTrack, currentTime } = usePlayer();

  // Load accumulated playback seconds from localStorage.
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return parseInt(saved, 10) || 0;
      return (listeningStats?.minutesListened || 142) * 60;
    } catch {
      return 142 * 60;
    }
  });

  const [topGenre, setTopGenre] = useState(() => {
    try {
      return localStorage.getItem('samify_top_genre') || listeningStats?.favoriteGenre || 'Synth-Pop';
    } catch {
      return 'Synth-Pop';
    }
  });

  const lastTimeRef = useRef(currentTime);
  const accumulatedRef = useRef(accumulatedSeconds);

  useEffect(() => {
    accumulatedRef.current = accumulatedSeconds;
  }, [accumulatedSeconds]);

  // Track real playback progress only. Seek jumps and track changes produce a
  // larger delta and are intentionally ignored.
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = currentTime;
      return;
    }

    const delta = currentTime - lastTimeRef.current;
    if (delta > 0.2 && delta < 2.5) {
      setAccumulatedSeconds((prev) => prev + delta);
    }

    lastTimeRef.current = currentTime;
  }, [currentTime, isPlaying]);

  // Persist periodically and on unmount/page hide without writing on every
  // timeupdate tick.
  useEffect(() => {
    const persist = () => {
      try {
        localStorage.setItem(STORAGE_KEY, String(Math.floor(accumulatedRef.current)));
      } catch {}
    };

    const interval = setInterval(persist, 5000);
    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', persist);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', persist);
      document.removeEventListener('visibilitychange', persist);
      persist();
    };
  }, []);

  // Dynamically record current track genre to history.
  useEffect(() => {
    if (currentTrack?.genre) {
      setTopGenre(currentTrack.genre);
      try {
        localStorage.setItem('samify_top_genre', currentTrack.genre);
      } catch {}
    }
  }, [currentTrack]);

  const minutesListened = Math.floor(accumulatedSeconds / 60);
  const formattedTime =
    minutesListened >= 60
      ? `${Math.floor(minutesListened / 60)}h ${minutesListened % 60}m`
      : `${minutesListened}m`;

  return (
    <div className={`bg-black/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 w-full md:w-auto md:min-w-[260px] space-y-3 relative overflow-hidden group shadow-lg ${className}`}>
      {/* Background glow orb */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
        <span className="flex items-center space-x-1.5 text-zinc-300">
          <BarChart2 className="w-4 h-4 text-emerald-400" />
          <span>Listening Time</span>
        </span>
        <span className="text-emerald-400 font-mono text-sm font-black">
          {formattedTime}
        </span>
      </div>

      {/* Animated Neon Visualizer (replaces the static progress bar) */}
      <div
        className="relative h-11 flex items-end gap-[3px] px-0.5"
        role="img"
        aria-label={isPlaying ? 'Live playback visualizer' : 'Playback visualizer paused'}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-teal-400/0 rounded-lg pointer-events-none" />
        {VISUALIZER_BARS.map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-full bg-gradient-to-t from-emerald-700 via-emerald-400 to-teal-200 origin-bottom"
            style={{
              height: isPlaying ? `${height}%` : '16%',
              opacity: isPlaying ? 1 : 0.35,
              animation: isPlaying
                ? `equalizer ${0.62 + (index % 5) * 0.11}s ease-in-out ${(index % 9) * 55}ms infinite alternate`
                : 'none',
              boxShadow: isPlaying
                ? '0 0 8px rgba(16, 185, 129, 0.65)'
                : 'none',
              transition: 'height 300ms ease, opacity 300ms ease',
            }}
          />
        ))}
      </div>

      {/* Live status & Top Genre */}
      <div className="flex items-center justify-between pt-0.5">
        <p className="text-[10px] sm:text-[11px] text-zinc-500 font-medium truncate pr-2">
          Top Genre: <span className="text-emerald-300 font-bold">{topGenre}</span>
        </p>

        <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${isPlaying ? 'text-emerald-400' : 'text-zinc-500'}`}>
          <Radio className={`w-3 h-3 ${isPlaying ? 'animate-pulse' : ''}`} />
          {isPlaying ? 'Live' : 'Paused'}
        </span>
      </div>
    </div>
  );
};

export default ListeningStatsCard;
