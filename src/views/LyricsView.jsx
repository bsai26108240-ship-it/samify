import React, { useContext, useEffect, useRef } from 'react';
import { Mic2, Music, Loader2 } from 'lucide-react';
import { PlayerContext } from '../contexts/PlayerContext';
import { useSyncedLyrics } from '../hooks/useSyncedLyrics';

export const LyricsView = () => {
  const { currentTrack, currentTime, seek } = useContext(PlayerContext);
  const activeLineRef = useRef(null);

  // Dynamic online lyrics fetch if track doesn't contain hardcoded lyrics
  const hasLocalLyrics = currentTrack?.lyrics && currentTrack.lyrics.length > 0;
  const { lyrics: fetchedLyrics, loading: lyricsLoading } = useSyncedLyrics(
    hasLocalLyrics ? null : currentTrack?.title,
    hasLocalLyrics ? null : currentTrack?.artist
  );

  const lyrics = hasLocalLyrics ? currentTrack.lyrics : fetchedLyrics;

  // Accurate line determination with timestamp tolerance
  const currentLineIndex = lyrics.reduce((acc, line, idx) => {
    return currentTime >= line.time ? idx : acc;
  }, 0);

  // Smooth centering animation
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLineIndex]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-20 animate-fadeIn px-4 text-center">
        <Music className="w-16 h-16 mb-4 opacity-40 text-emerald-400" />
        <h3 className="text-xl font-bold text-white mb-2">No Track Playing</h3>
        <p className="text-sm">Choose a song from your library or discovery view to view live karaoke lyrics.</p>
      </div>
    );
  }

  if (lyricsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-20 animate-fadeIn px-4 text-center">
        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-white mb-1">Fetching Synced Karaoke Lyrics...</h3>
        <p className="text-xs text-zinc-400">Searching global lyric databases for {currentTrack.title}</p>
      </div>
    );
  }

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-20 animate-fadeIn px-4 text-center">
        <Music className="w-16 h-16 mb-4 opacity-40 text-emerald-400" />
        <h3 className="text-xl font-bold text-white mb-2">No Lyrics Available</h3>
        <p className="text-sm">Enjoy the audio vibes of {currentTrack?.title || 'this track'}.</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-10 max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn select-none">
      <div className="flex items-center space-x-4 sm:space-x-5 mb-6 sm:mb-8 border-b border-white/10 pb-4 sm:pb-6">
        <img 
          src={currentTrack.coverUrl} 
          alt="Cover" 
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-white/10 flex-shrink-0" 
        />
        <div className="truncate">
          <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 mb-1">
            <Mic2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Live Karaoke Lyrics
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white truncate">{currentTrack.title}</h2>
          <p className="text-zinc-400 text-xs sm:text-sm font-medium truncate">{currentTrack.artist} — {currentTrack.album}</p>
        </div>
      </div>

      <div className="space-y-5 sm:space-y-6 text-center md:text-left py-4">
        {lyrics.map((line, idx) => {
          const isActive = idx === currentLineIndex;
          const isPassed = idx < currentLineIndex;

          return (
            <p
              key={`${idx}-${line.time}`}
              ref={isActive ? activeLineRef : null}
              onClick={() => seek(line.time)}
              className={`text-xl sm:text-2xl md:text-4xl font-black transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                isActive
                  ? 'text-emerald-400 scale-105 drop-shadow-[0_0_25px_rgba(16,185,129,0.7)]'
                  : isPassed
                  ? 'text-zinc-500 opacity-60 hover:opacity-100'
                  : 'text-zinc-600 hover:text-zinc-300'
              }`}
            >
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
};
