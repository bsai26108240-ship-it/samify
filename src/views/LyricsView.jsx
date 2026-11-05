import React, { useContext, useEffect, useRef } from 'react';
import { Mic2, Music } from 'lucide-react';
import { PlayerContext } from '../contexts/PlayerContext';

export const LyricsView = () => {
  const { currentTrack, currentTime, seek } = useContext(PlayerContext);
  const activeLineRef = useRef(null);

  const lyrics = currentTrack?.lyrics || [];

  // Find the index of the line that corresponds to the current playback time
  const currentLineIndex = lyrics.reduce((acc, line, idx) => {
    return currentTime >= line.time ? idx : acc;
  }, 0);

  // Auto-scroll to keep active lyric line centered
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLineIndex]);

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-20 animate-fadeIn">
        <Music className="w-16 h-16 mb-4 opacity-40" />
        <h3 className="text-xl font-bold text-white mb-2">No Lyrics Available</h3>
        <p className="text-sm">Enjoy the instrumental vibes of {currentTrack?.title}.</p>
      </div>
    );
  }

  return (
    <div className="px-10 py-12 max-w-4xl mx-auto space-y-8 animate-fadeIn select-none">
      <div className="flex items-center space-x-4 mb-8 border-b border-white/5 pb-6">
        <img src={currentTrack.coverUrl} alt="Cover" className="w-16 h-16 rounded-xl object-cover shadow-lg" />
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
            <Mic2 className="w-4 h-4" /> Live Karaoke Lyrics
          </span>
          <h2 className="text-3xl font-extrabold text-white">{currentTrack.title}</h2>
          <p className="text-zinc-400 text-sm">{currentTrack.artist}</p>
        </div>
      </div>

      <div className="space-y-6 text-center md:text-left">
        {lyrics.map((line, idx) => {
          const isActive = idx === currentLineIndex;
          const isPassed = idx < currentLineIndex;

          return (
            <p
              key={idx}
              ref={isActive ? activeLineRef : null}
              onClick={() => seek(line.time)}
              className={`text-2xl md:text-4xl font-black transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                isActive
                  ? 'text-emerald-400 scale-105 drop-shadow-[0_0_25px_rgba(16,185,129,0.5)]'
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

