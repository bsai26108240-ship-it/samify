import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Heart } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';

export const BottomPlayer = () => {
  const { 
    currentTrack, 
    isPlaying, 
    togglePlay, 
    playNext, 
    playPrevious, 
    currentTime, 
    duration, 
    setIsExpanded 
  } = usePlayer();

  if (!currentTrack) return null;

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-white/10 backdrop-blur-lg px-4 py-2.5 transition">
      {/* Mini Progress Bar Top Border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800">
        <div 
          className="h-full bg-emerald-400 transition-all duration-200" 
          style={{ width: `${progressPercent}%` }} 
        />
      </div>

      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Track Thumbnail & Title - Triggers Full Screen Modal */}
        <div 
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-3 cursor-pointer group max-w-[60%] sm:max-w-[40%]"
        >
          <img 
            src={currentTrack.coverUrl || '/default-cover.png'} 
            alt={currentTrack.title}
            className="w-11 h-11 rounded-md object-cover shadow-md group-hover:scale-105 transition"
          />
          <div className="flex flex-col truncate">
            <span className="text-sm font-semibold text-white truncate group-hover:text-emerald-400 transition">
              {currentTrack.title}
            </span>
            <span className="text-xs text-zinc-400 truncate">
              {currentTrack.artist}
            </span>
          </div>
        </div>

        {/* Mini Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={playPrevious}
            className="hidden sm:block text-zinc-400 hover:text-white transition"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button 
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button 
            onClick={playNext}
            className="text-zinc-400 hover:text-white transition"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setIsExpanded(true)}
            className="text-zinc-400 hover:text-white transition p-1"
            aria-label="Expand Full Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomPlayer;
