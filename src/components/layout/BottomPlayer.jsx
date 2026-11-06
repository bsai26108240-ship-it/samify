import React, { useContext, useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Shuffle, Repeat, AlertCircle, Mic2 } from 'lucide-react';
import { PlayerContext } from '../../contexts/PlayerContext';
import { LibraryContext } from '../../contexts/LibraryContext';
import { formatTime } from '../../utils/formatTime';

export const BottomPlayer = ({ currentView, setCurrentView }) => {
  const { 
    currentTrack, isPlaying, togglePlay, next, prev, 
    currentTime, duration, seek, volume, setVolume, 
    isMuted, setIsMuted, isShuffle, setIsShuffle, 
    isRepeat, setIsRepeat, audioError
  } = useContext(PlayerContext);
  
  const { favorites, toggleFavorite } = useContext(LibraryContext);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState(0);
  const progressBarRef = useRef(null);
  const mobileProgressBarRef = useRef(null);

  if (!currentTrack) return null;
  const isFavorite = favorites.includes(currentTrack.id);
  const validDuration = duration && !isNaN(duration) && duration > 0 ? duration : currentTrack.duration || 100;

  const calculatePct = (e, ref) => {
    const targetRef = ref || progressBarRef;
    if (!targetRef.current) return 0;
    const rect = targetRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clickX = clientX - rect.left;
    return Math.max(0, Math.min(1, clickX / rect.width));
  };

  const handlePointerDown = (e, isMobileBar = false) => {
    setIsDragging(true);
    const pct = calculatePct(e, isMobileBar ? mobileProgressBarRef : progressBarRef);
    setDragPercent(pct);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (isDragging) {
        setDragPercent(calculatePct(e));
      }
    };

    const handlePointerUp = (e) => {
      if (isDragging) {
        const finalPct = calculatePct(e);
        seek(finalPct * validDuration);
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, seek, validDuration]);

  const currentPercent = isDragging ? dragPercent : (currentTime / validDuration);
  const displayTime = isDragging ? dragPercent * validDuration : currentTime;

  return (
    <footer className="fixed bottom-[50px] md:bottom-0 left-0 right-0 w-full h-16 md:h-24 bg-black/95 md:bg-black/90 backdrop-blur-2xl border-t border-white/10 z-30 flex items-center justify-between px-3 sm:px-6 shadow-[0_-10px_30px_rgba(0,0,0,0.9)] select-none">
      
      {/* Top Mobile Scrub Bar (Visible on mobile screens) */}
      <div 
        ref={mobileProgressBarRef}
        onPointerDown={(e) => handlePointerDown(e, true)}
        className="md:hidden absolute top-0 left-0 right-0 h-1 bg-white/10 cursor-pointer"
      >
        <div 
          className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
          style={{ width: `${Math.max(0, Math.min(100, currentPercent * 100))}%` }}
        />
      </div>

      {/* Left Track Display */}
      <div className="flex items-center space-x-2.5 sm:space-x-4 max-w-[55%] md:w-[30%] md:min-w-[200px]">
        <div 
          onClick={() => setCurrentView && setCurrentView('lyrics')}
          className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl overflow-hidden shadow-xl border border-white/10 flex-shrink-0 cursor-pointer group"
        >
          <img src={currentTrack.coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition" />
          {audioError && (
            <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
          )}
        </div>
        <div className="flex flex-col truncate">
          <span 
            onClick={() => setCurrentView && setCurrentView('lyrics')}
            className={`text-xs sm:text-sm font-bold truncate cursor-pointer hover:underline ${audioError ? 'text-red-400' : 'text-white'}`}
          >
            {currentTrack.title}
          </span>
          <span className="text-[10px] sm:text-xs text-zinc-400 truncate">{currentTrack.artist}</span>
        </div>
        <Heart 
          onClick={() => toggleFavorite(currentTrack.id)} 
          className={`w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2 cursor-pointer transition flex-shrink-0 ${isFavorite ? 'text-emerald-500 fill-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'text-zinc-500 hover:text-white'}`} 
        />
      </div>

      {/* Mobile Right Controls (Play/Pause, Next, Karaoke) */}
      <div className="flex items-center space-x-2 sm:space-x-3 md:hidden">
        {setCurrentView && (
          <button 
            onClick={() => setCurrentView(currentView === 'lyrics' ? 'home' : 'lyrics')}
            className={`p-1.5 rounded-full transition ${currentView === 'lyrics' ? 'text-emerald-400 bg-white/10' : 'text-zinc-400 hover:text-white'}`}
            title="Karaoke Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>
        )}
        <button 
          onClick={prev}
          className="p-1.5 text-zinc-300 hover:text-white transition"
          aria-label="Previous"
        >
          <SkipBack className="w-4 h-4 fill-current" />
        </button>
        <button 
          onClick={togglePlay}
          disabled={audioError}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-black transition-transform shadow-[0_0_15px_rgba(16,185,129,0.4)] ${audioError ? 'bg-zinc-700 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95'}`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
        </button>
        <button 
          onClick={next}
          className="p-1.5 text-zinc-300 hover:text-white transition"
          aria-label="Next"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>
      </div>

      {/* Desktop Center Controls & Timeline Slider */}
      <div className="hidden md:flex flex-col items-center justify-center w-[40%] max-w-[600px]">
        <div className="flex items-center space-x-6 mb-2">
          <Shuffle onClick={() => setIsShuffle(!isShuffle)} className={`w-4 h-4 cursor-pointer transition ${isShuffle ? 'text-emerald-500' : 'text-zinc-500 hover:text-white'}`} />
          <SkipBack onClick={prev} className="w-5 h-5 text-zinc-300 hover:text-white cursor-pointer transition fill-current" />
          <button 
            onClick={togglePlay}
            disabled={audioError}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-black transition-transform shadow-[0_0_20px_rgba(16,185,129,0.4)] ${audioError ? 'bg-zinc-700 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 hover:scale-105 active:scale-95'}`}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-1" />}
          </button>
          <SkipForward onClick={next} className="w-5 h-5 text-zinc-300 hover:text-white cursor-pointer transition fill-current" />
          <Repeat onClick={() => setIsRepeat(!isRepeat)} className={`w-4 h-4 cursor-pointer transition ${isRepeat ? 'text-emerald-500' : 'text-zinc-500 hover:text-white'}`} />
        </div>

        {/* Timeline Slider with Drag Lock */}
        <div className="w-full flex items-center space-x-3 group">
          <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">{formatTime(displayTime)}</span>
          <div 
            ref={progressBarRef}
            onPointerDown={(e) => handlePointerDown(e, false)}
            className="flex-1 relative h-2 bg-[#222] rounded-full overflow-hidden cursor-pointer flex items-center group-hover:h-2.5 transition-all"
          >
            <div 
              className={`h-full rounded-full transition-all pointer-events-none ${audioError ? 'bg-red-500' : 'bg-emerald-500 group-hover:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]'}`} 
              style={{ width: `${Math.max(0, Math.min(100, currentPercent * 100))}%` }} 
            />
          </div>
          <span className="text-[10px] text-zinc-500 font-mono w-8">{formatTime(validDuration)}</span>
        </div>
      </div>

      {/* Desktop Right Volume & Lyrics controls */}
      <div className="hidden md:flex items-center justify-end space-x-4 w-[30%] min-w-[150px]">
        {setCurrentView && (
          <button 
            onClick={() => setCurrentView(currentView === 'lyrics' ? 'home' : 'lyrics')}
            className={`p-2 rounded-full transition ${currentView === 'lyrics' ? 'text-emerald-400 bg-white/10 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'text-zinc-500 hover:text-white'}`}
            title="Karaoke Lyrics"
          >
            <Mic2 className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center space-x-2 group w-24">
          <button onClick={() => setIsMuted(!isMuted)}>
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-zinc-500 hover:text-white transition" /> : <Volume2 className="w-4 h-4 text-zinc-500 hover:text-white transition" />}
          </button>
          <div className="flex-1 relative h-1.5 bg-[#222] rounded-full overflow-hidden flex items-center">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={isMuted ? 0 : volume} 
              onChange={(e) => { setVolume(Number(e.target.value)); setIsMuted(false); }} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div className="h-full bg-white group-hover:bg-emerald-400 rounded-full pointer-events-none transition-colors" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
          </div>
        </div>
      </div>
    </footer>
  );
};
