import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Mic2, Play, Pause, Loader2 } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useTrackLyrics, getActiveLyricIndex } from '@/hooks/useTrackLyrics';
import { extractPalette, DEFAULT_GRADIENT_PALETTE } from '@/utils/colorExtract';

const formatTime = (secs) => {
  if (isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

/**
 * Dedicated full-screen karaoke window.
 *
 * Lyrics are provided by the caller when available; otherwise the component
 * falls back to the shared LRCLIB lookup so it can be used standalone.
 */
export const KaraokeLyricsModal = ({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  duration,
  lyrics: lyricsProp,
  loading: loadingProp,
  onSeek,
}) => {
  const {
    seek,
    togglePlay,
    isPlaying,
    currentTime: liveCurrentTime,
    duration: liveDuration,
  } = usePlayer() || {};

  const activeLineRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  const [palette, setPalette] = useState(null);

  // Dynamic gradient mesh from the album cover colors.
  useEffect(() => {
    let cancelled = false;
    setPalette(null);
    extractPalette(currentTrack?.coverUrl || currentTrack?.coverArt).then((colors) => {
      if (!cancelled) setPalette(colors);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentTrack?.coverUrl, currentTrack?.coverArt]);

  // Only fetch when the caller did not pass lyrics, to avoid duplicate requests.
  const shouldFetch = !Array.isArray(lyricsProp);
  const { lyrics: fallbackLyrics, loading: fallbackLoading } = useTrackLyrics(
    shouldFetch ? currentTrack : null
  );

  const lyrics = Array.isArray(lyricsProp) ? lyricsProp : fallbackLyrics;
  const loading = loadingProp ?? fallbackLoading;
  const position = currentTime ?? liveCurrentTime ?? 0;
  const totalDuration = duration || liveDuration || currentTrack?.duration || 0;

  const activeIndex = getActiveLyricIndex(lyrics, position);
  const activeLine = activeIndex >= 0 ? lyrics[activeIndex] : null;

  useEffect(() => {
    const container = lyricsContainerRef.current;
    const activeLine = activeLineRef.current;
    if (!container || !activeLine) return;

    // Center the active line inside the lyrics scroller without moving the
    // page or the fixed player chrome.
    const containerRect = container.getBoundingClientRect();
    const lineRect = activeLine.getBoundingClientRect();
    const target =
      container.scrollTop +
      (lineRect.top - containerRect.top) -
      container.clientHeight / 2 +
      lineRect.height / 2;

    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [activeIndex, isOpen, currentTrack?.id]);

  if (!isOpen || !currentTrack) return null;

  const handleSeek = (time) => {
    if (typeof onSeek === 'function') {
      onSeek(time);
      return;
    }

    if (typeof seek === 'function') {
      seek(time);
    }
  };

  const progressPercent =
    totalDuration > 0
      ? Math.min(100, Math.max(0, (position / totalDuration) * 100))
      : 0;

  const [c1, c2, c3] = palette || DEFAULT_GRADIENT_PALETTE;

  return (
    <div className="fixed inset-0 z-[60] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden text-white pt-safe pb-safe animate-fadeIn">
      {/* Dynamic gradient color mesh from the album cover palette */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{ background: `linear-gradient(155deg, ${c1} 0%, ${c3} 60%, #050505 100%)` }}
        />
        <div
          className="absolute -top-[30%] -left-[20%] w-[70vmax] h-[70vmax] rounded-full opacity-65 blur-[110px]"
          style={{ background: c2 }}
        />
        <div
          className="absolute top-[25%] -right-[25%] w-[60vmax] h-[60vmax] rounded-full opacity-55 blur-[110px]"
          style={{ background: c1 }}
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      {/* Karaoke header */}
      <div className="relative z-10 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition text-zinc-300 hover:text-white"
          aria-label="Close Karaoke"
        >
          <ChevronDown className="w-7 h-7" />
        </button>

        <div className="flex flex-col items-center max-w-[60%]">
          <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-300 font-extrabold flex items-center gap-1.5">
            <Mic2 className="w-3 h-3" /> Karaoke
          </span>
          <span className="text-xs font-bold text-white truncate w-full text-center">
            {currentTrack.title}
          </span>
          <span className="text-[10px] text-zinc-500 truncate w-full text-center">
            {currentTrack.artist}
          </span>
        </div>

        <button
          onClick={togglePlay}
          className="p-2 -mr-2 rounded-full hover:bg-white/10 transition text-zinc-300 hover:text-white"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current" />
          )}
        </button>
      </div>

      {/* Scrolling synced lyrics */}
      <div
        ref={lyricsContainerRef}
        className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide px-5 sm:px-10"
      >
        <div className="max-w-3xl mx-auto py-16 sm:py-24 space-y-5 sm:space-y-7 text-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/60">
              <Loader2 className="w-9 h-9 animate-spin text-cyan-300 mb-4" />
              <p className="text-sm font-semibold">Loading synced lyrics…</p>
            </div>
          ) : lyrics.length > 0 ? (
            lyrics.map((line, index) => {
              const isActive = index === activeIndex;
              const isPassed = index < activeIndex;

              return (
                <button
                  type="button"
                  key={`${index}-${line.time}`}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleSeek(line.time)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`block w-full text-center font-black leading-snug transition-all duration-300 cursor-pointer select-none py-1 ${
                    isActive
                      ? 'text-3xl sm:text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-[#00f2fe] to-[#00d2ff] scale-[1.03] drop-shadow-[0_0_26px_rgba(0,242,254,0.55)]'
                      : isPassed
                        ? 'text-xl sm:text-2xl text-white/30 hover:text-white/60'
                        : 'text-xl sm:text-2xl text-white/55 hover:text-white'
                  }`}
                >
                  {line.text}
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-white/55">
              <Mic2 className="w-14 h-14 mb-4 opacity-40 text-cyan-300" />
              <h3 className="text-lg font-bold text-white mb-1">No synced lyrics available</h3>
              <p className="text-sm">Enjoy the audio vibes of {currentTrack.title}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Playback position footer */}
      <div className="relative z-10 flex-shrink-0 px-6 pb-3 pt-2 border-t border-white/10 bg-black/40 backdrop-blur-md">
        <div className="h-1 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00f2fe] to-[#00d2ff] transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-3 mt-1.5 text-[11px] text-white/55">
          <span className="tabular-nums">{formatTime(position)}</span>
          <span className="truncate text-white/70">
            {activeLine ? activeLine.text : 'Tap any line to jump'}
          </span>
          <span className="tabular-nums">{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};

export default KaraokeLyricsModal;
