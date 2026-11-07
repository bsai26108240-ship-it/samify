import React, { useState } from 'react';
import { 
  ChevronDown, 
  MoreHorizontal, 
  Heart, 
  PlusCircle, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Volume2, 
  Share2, 
  ListMusic, 
  Check, 
  Clock,
  Sparkles
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';

export const FullScreenPlayerModal = ({ isOpen, onClose, onOpenAddToPlaylist }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    isShuffle,
    setIsShuffle,
    isRepeat,
    setIsRepeat,
    isDownloaded,
    handleDownloadToggle
  } = usePlayer();

  const [isLiked, setIsLiked] = useState(false);
  const [showLyricsTab, setShowLyricsTab] = useState(true);

  if (!isOpen || !currentTrack) return null;

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const remainingTime = duration ? duration - currentTime : 0;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTrack.title,
          text: `Listening to ${currentTrack.title} by ${currentTrack.artist} on Samify!`,
          url: window.location.href,
        });
      } catch (err) {
        console.warn('Share cancelled or failed:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-slate-900 via-zinc-900 to-black text-white transition-all duration-300 overflow-y-auto">
      {/* Top Bar Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-transparent backdrop-blur-md">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition text-slate-300 hover:text-white"
          aria-label="Collapse Player"
        >
          <ChevronDown className="w-7 h-7" />
        </button>

        <div className="flex flex-col items-center max-w-[60%]">
          <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
            PLAYING FROM PLAYLIST
          </span>
          <span className="text-xs font-bold text-white truncate w-full text-center">
            {currentTrack.album || 'Samify Radio'}
          </span>
        </div>

        <button 
          className="p-2 -mr-2 rounded-full hover:bg-white/10 transition text-slate-300 hover:text-white"
          aria-label="More Options"
        >
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      {/* Main Scrollable Canvas */}
      <div className="flex-1 flex flex-col px-6 pt-2 pb-8 max-w-md mx-auto w-full">
        {/* Cover Artwork Container */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl mb-6 group border border-white/5">
          <img 
            src={currentTrack.coverUrl || '/default-cover.png'} 
            alt={currentTrack.title}
            className="w-full h-full object-cover transform transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition" />
        </div>

        {/* Synced Lyrics Snippet Card */}
        {showLyricsTab && (
          <div className="w-full bg-emerald-950/40 border border-emerald-500/20 backdrop-blur-lg rounded-xl p-4 mb-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Lyrics
              </span>
              <button 
                onClick={() => setShowLyricsTab(false)} 
                className="text-[10px] text-zinc-400 hover:text-white transition"
              >
                Hide
              </button>
            </div>
            <p className="text-sm font-semibold text-emerald-100 leading-relaxed line-clamp-2">
              "{currentTrack.lyricsSnippet || `Me and ${currentTrack.artist} feel the same, too much pleasure is pain...`}"
            </p>
          </div>
        )}

        {/* Track Title & Quick Actions Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col pr-4 overflow-hidden">
            <h1 className="text-2xl font-bold text-white truncate leading-tight">
              {currentTrack.title}
            </h1>
            <p className="text-base text-zinc-400 font-medium truncate mt-1">
              {currentTrack.artist}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsLiked(!isLiked)} 
              className="p-1.5 text-zinc-400 hover:text-emerald-400 transition"
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-emerald-400 text-emerald-400' : ''}`} />
            </button>
            <button 
              onClick={() => onOpenAddToPlaylist && onOpenAddToPlaylist(currentTrack)} 
              className="p-1.5 text-zinc-400 hover:text-white transition"
            >
              <PlusCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Interactive Scrubbing Slider */}
        <div className="w-full mb-6">
          <input 
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime || 0}
            onChange={(e) => seek(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 accent-white hover:accent-emerald-400 rounded-lg cursor-pointer transition"
          />
          <div className="flex items-center justify-between mt-2 text-xs font-medium text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(remainingTime)}</span>
          </div>
        </div>

        {/* Primary Playback Controls */}
        <div className="flex items-center justify-between mb-8 px-2">
          <button 
            onClick={() => setIsShuffle(!isShuffle)} 
            className={`p-2 transition ${isShuffle ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button 
            onClick={playPrevious} 
            className="p-2 text-zinc-200 hover:text-white transition transform active:scale-90"
          >
            <SkipBack className="w-8 h-8 fill-current" />
          </button>

          <button 
            onClick={togglePlay} 
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform transition active:scale-95 hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          <button 
            onClick={playNext} 
            className="p-2 text-zinc-200 hover:text-white transition transform active:scale-90"
          >
            <SkipForward className="w-8 h-8 fill-current" />
          </button>

          <button 
            onClick={() => setIsRepeat(!isRepeat)} 
            className={`p-2 transition ${isRepeat ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
          >
            <Repeat className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Dock Action Row */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 text-zinc-400 mb-8">
          <button 
            onClick={handleDownloadToggle} 
            className={`flex items-center gap-1.5 text-xs font-semibold ${isDownloaded ? 'text-emerald-400' : 'hover:text-white'}`}
          >
            {isDownloaded ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {isDownloaded ? 'Downloaded' : 'Offline Save'}
          </button>

          <button onClick={handleShare} className="hover:text-white transition p-1">
            <Share2 className="w-5 h-5" />
          </button>

          <button className="hover:text-white transition p-1">
            <ListMusic className="w-5 h-5" />
          </button>
        </div>

        {/* Artist Exploration Discovery Card */}
        <div className="w-full bg-zinc-800/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              About the Artist
            </span>
            <span className="text-xs font-bold text-emerald-400 cursor-pointer hover:underline">
              Follow
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
              <img 
                src={currentTrack.coverUrl || '/default-cover.png'} 
                alt={currentTrack.artist} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-white">{currentTrack.artist}</h3>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                Explore popular tracks, albums, and similar radio stations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
