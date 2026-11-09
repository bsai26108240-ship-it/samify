import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronUp,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Headphones,
  Download,
  Check,
  Loader2,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';

const formatTime = (secs) => {
  if (isNaN(secs) || !isFinite(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const BottomPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    isShuffle,
    setIsShuffle,
    isRepeat,
    setIsRepeat,
    isDownloaded,
    isDownloading,
    handleDownloadToggle,
    audioError,
    recoverPlayback,
    setIsExpanded,
  } = usePlayer();

  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const scrubberRef = useRef(null);

  // Automatic fallback: whenever the loaded audio errors out, retry the
  // track's fallback stream (context handles the actual play + catch).
  useEffect(() => {
    if (audioError && currentTrack) {
      recoverPlayback();
    }
  }, [audioError, currentTrack?.id, recoverPlayback]);

  const openFullScreenPlayer = () => setIsExpanded(true);
  const handleKeyOpen = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFullScreenPlayer();
    }
  };

  const handleScrubberHover = useCallback((e) => {
    if (!scrubberRef.current || !duration) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    setHoverTime(pct * duration);
    setHoverX(x);
  }, [duration]);

  const handleScrubberClick = useCallback((e) => {
    if (!scrubberRef.current || !duration) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pct * duration);
  }, [duration, seek]);

  if (!currentTrack) return null;

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed left-0 right-0 z-40 bottom-[64px] md:bottom-0 bg-black/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.7)] transition-all">
      {/* Interactive Scrubber with hover tooltip */}
      <div
        ref={scrubberRef}
        className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-800 cursor-pointer group hover:h-2.5 transition-all"
        onMouseMove={handleScrubberHover}
        onMouseLeave={() => setHoverTime(null)}
        onClick={handleScrubberClick}
      >
        <div
          className="h-full bg-emerald-400 transition-all duration-150 relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {hoverTime !== null && (
          <div
            className="absolute -top-8 -translate-x-1/2 bg-zinc-800 text-white text-[10px] font-mono px-2 py-1 rounded-md shadow-lg pointer-events-none"
            style={{ left: `${hoverX}px` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto px-3 sm:px-4 py-2">
        {/* Track Thumbnail & Title — tapping opens full player */}
        <div
          role="button"
          tabIndex={0}
          onClick={openFullScreenPlayer}
          onKeyDown={handleKeyOpen}
          aria-label={`Open full player for ${currentTrack.title} by ${currentTrack.artist}`}
          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
        >
          <img
            src={currentTrack.coverUrl || '/default-cover.png'}
            alt={currentTrack.title}
            className="w-11 h-11 rounded-md object-cover shadow-md flex-shrink-0 group-hover:scale-105 transition"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white truncate group-hover:text-emerald-400 transition">
              {currentTrack.title}
            </span>
            <span className="text-xs text-zinc-400 truncate">
              {currentTrack.artist}
            </span>
          </div>
        </div>

        {/* Center Transport Controls */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`hidden md:flex p-1.5 transition ${isShuffle ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'}`}
            aria-label="Toggle Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={playPrevious}
            className="hidden sm:flex text-zinc-400 hover:text-white transition p-1"
            aria-label="Previous Track"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={playNext}
            className="text-zinc-400 hover:text-white transition p-1"
            aria-label="Next Track"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`hidden md:flex p-1.5 transition ${isRepeat ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'}`}
            aria-label="Toggle Repeat"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Right Section: Time, Volume, Quality Badge, Expand */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          {/* Time display */}
          <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 group/vol">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-400 hover:text-white transition p-0.5"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = Number(e.target.value);
                setVolume(val);
                if (val > 0 && isMuted) setIsMuted(false);
              }}
              className="w-20 h-1 bg-zinc-700 accent-emerald-400 rounded-lg cursor-pointer opacity-60 group-hover/vol:opacity-100 transition"
            />
          </div>

          {/* 320kbps Quality Badge */}
          <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400/70 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
            <Headphones className="w-3 h-3" />
            320k
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownloadToggle}
            disabled={isDownloading}
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition border ${
              isDownloaded
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-zinc-400 hover:text-white border-white/5 hover:border-white/20'
            } ${isDownloading ? 'opacity-70 cursor-wait' : ''}`}
            aria-label={isDownloaded ? 'Remove offline download' : 'Download for offline playback'}
            title={isDownloaded ? 'Offline track saved' : 'Download track for offline playback'}
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isDownloaded ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline text-[10px]">
              {isDownloading ? 'Saving…' : isDownloaded ? 'Offline' : 'Download'}
            </span>
          </button>
        </div>

        {/* Mobile Download & Expand Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={handleDownloadToggle}
            disabled={isDownloading}
            className={`md:hidden p-1.5 transition rounded-full ${
              isDownloaded ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
            }`}
            aria-label={isDownloaded ? 'Downloaded offline' : 'Download for offline'}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isDownloaded ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={openFullScreenPlayer}
            className="text-zinc-300 hover:text-emerald-400 transition p-1.5 flex-shrink-0"
            aria-label="Expand Full Player"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomPlayer;
