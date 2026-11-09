import React, { useContext, useEffect, useRef, useState } from 'react';
import { Mic2, Music, Loader2 } from 'lucide-react';
import { PlayerContext } from '../contexts/PlayerContext';
import { useTrackLyrics, getActiveLyricIndex } from '../hooks/useTrackLyrics';
import { extractPalette, DEFAULT_GRADIENT_PALETTE } from '../utils/colorExtract';

export const LyricsView = () => {
  const { currentTrack, currentTime, seek } = useContext(PlayerContext);
  const { lyrics, loading: lyricsLoading } = useTrackLyrics(currentTrack);

  const activeLineRef = useRef(null);
  const [palette, setPalette] = useState(null);

  // Dynamic gradient mesh generated from the album cover colors.
  useEffect(() => {
    let cancelled = false;
    setPalette(null);
    extractPalette(currentTrack?.coverUrl || currentTrack?.coverArt).then((colors) => {
      if (!cancelled) setPalette(colors);
    });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.coverUrl, currentTrack?.coverArt]);

  const currentLineIndex = getActiveLyricIndex(lyrics, currentTime);

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
        <Music className="w-16 h-16 mb-4 opacity-40 text-cyan-300" />
        <h3 className="text-xl font-bold text-white mb-2">No Track Playing</h3>
        <p className="text-sm">Choose a song from your library or discovery view to view live karaoke lyrics.</p>
      </div>
    );
  }

  if (lyricsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-20 animate-fadeIn px-4 text-center">
        <Loader2 className="w-12 h-12 text-cyan-300 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-white mb-1">Fetching Synced Karaoke Lyrics...</h3>
        <p className="text-xs text-zinc-400">Searching global lyric databases for {currentTrack.title}</p>
      </div>
    );
  }

  const [c1, c2, c3] = palette || DEFAULT_GRADIENT_PALETTE;

  return (
    <div className="relative h-full min-h-[60vh] animate-fadeIn overflow-hidden select-none pb-36 md:pb-24">
      {/* Dynamic gradient color mesh from the album cover palette */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{ background: `linear-gradient(155deg, ${c1} 0%, ${c3} 60%, #050505 100%)` }}
        />
        <div
          className="absolute -top-1/3 -left-1/4 w-[60vmax] h-[60vmax] rounded-full opacity-60 blur-[110px]"
          style={{ background: c2 }}
        />
        <div
          className="absolute top-1/4 -right-1/4 w-[55vmax] h-[55vmax] rounded-full opacity-50 blur-[110px]"
          style={{ background: c1 }}
        />
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 px-4 sm:px-8 py-6 max-w-3xl mx-auto h-full flex flex-col">
        <div className="flex items-center space-x-4 sm:space-x-5 pb-4 border-b border-white/10 flex-shrink-0">
          <img
            src={currentTrack.coverUrl}
            alt="Cover"
            className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl object-cover border border-white/15 shadow-2xl flex-shrink-0"
          />
          <div className="truncate">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-cyan-300 flex items-center gap-1.5 mb-1">
              <Mic2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Lyrics
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-white truncate">{currentTrack.title}</h2>
            <p className="text-white/50 text-xs sm:text-sm font-medium truncate">
              {currentTrack.artist} — {currentTrack.album}
            </p>
          </div>
        </div>

        {/* Large center-aligned scrolling lyrics */}
        {(!lyrics || lyrics.length === 0) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/60 py-16 text-center">
            <Music className="w-14 h-14 mb-4 opacity-40 text-cyan-300" />
            <h3 className="text-xl font-bold text-white mb-2">No Lyrics Available</h3>
            <p className="text-sm">Enjoy the audio vibes of {currentTrack.title || 'this track'}.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide py-8">
            <div className="space-y-6 sm:space-y-8 text-center max-w-2xl mx-auto">
              {lyrics.map((line, idx) => {
                const isActive = idx === currentLineIndex;
                const isPassed = idx < currentLineIndex;

                return (
                  <button
                    type="button"
                    key={`${idx}-${line.time}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => seek(line.time)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`block w-full text-center font-black leading-snug tracking-tight transition-all duration-300 cursor-pointer py-1 ${
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
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LyricsView;
