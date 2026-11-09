import React, { useContext, useState, useEffect } from 'react';
import { Heart, Trash2, ListPlus, Download, Check, Loader2 } from 'lucide-react';
import { PlayerContext } from '../../contexts/PlayerContext';
import { formatTime } from '../../utils/formatTime';
import { isTrackDownloaded, saveTrackOffline, deleteOfflineTrack } from '../../utils/offlineStorage';

export const TrackRow = ({
  track,
  index,
  queue,
  onToggleFavorite,
  isFavorite,
  onAddToPlaylist,
  playlistId,
  onRemoveFromPlaylist,
}) => {
  const { play, currentTrack, isPlaying } = useContext(PlayerContext);
  const isThisPlaying = currentTrack?.id === track.id;

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    if (track?.id) {
      isTrackDownloaded(track.id).then((res) => {
        if (active) setIsDownloaded(res);
      });
    }
    return () => {
      active = false;
    };
  }, [track?.id]);

  const handleDownloadClick = async (e) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      if (isDownloaded) {
        await deleteOfflineTrack(track.id);
        setIsDownloaded(false);
      } else {
        await saveTrackOffline(track);
        setIsDownloaded(true);
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      onClick={() => play(track, queue)}
      className={`flex items-center px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all cursor-pointer border border-transparent group ${
        isThisPlaying ? 'bg-[#1a1a1a] border-white/5' : 'hover:bg-[#121212]'
      }`}
    >
      <div className="w-6 sm:w-8 text-center text-xs sm:text-sm text-zinc-600 font-medium flex-shrink-0">
        {isThisPlaying && isPlaying ? (
          <div className="flex items-end justify-center space-x-1 h-3.5 sm:h-4">
            <div className="w-1 bg-emerald-500 h-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 bg-emerald-500 h-2/3 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 bg-emerald-500 h-4/5 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          `#${index + 1}`
        )}
      </div>
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 ml-2 sm:ml-4 overflow-hidden">
        <img src={track.coverUrl || track.coverArt} alt="cover" className="w-9 h-9 sm:w-10 sm:h-10 rounded-md object-cover flex-shrink-0" />
        <div className="flex flex-col truncate pr-2">
          <span className={`font-semibold text-xs sm:text-sm truncate ${isThisPlaying ? 'text-emerald-400' : 'text-white'}`}>
            {track.title}
          </span>
          <span className="text-[10px] sm:text-xs text-zinc-500 truncate sm:hidden">{track.artist}</span>
        </div>
      </div>
      <div className="flex-1 text-xs sm:text-sm text-zinc-500 hidden sm:block truncate">{track.artist}</div>
      <div className="flex-1 text-xs sm:text-sm text-zinc-500 hidden md:block truncate">{track.album}</div>
      <div className="flex items-center space-x-2.5 sm:space-x-5 flex-shrink-0">
        <span className="text-xs sm:text-sm text-zinc-500 hidden lg:block">{formatTime(track.duration)}</span>
        
        {/* Offline Download Button */}
        <button
          type="button"
          onClick={handleDownloadClick}
          disabled={isDownloading}
          title={isDownloaded ? 'Remove offline download' : 'Download track offline'}
          aria-label={isDownloaded ? 'Downloaded' : 'Download track'}
          className={`p-1 rounded-full transition sm:opacity-0 group-hover:opacity-100 ${
            isDownloaded ? '!opacity-100 text-emerald-400' : 'text-zinc-500 hover:text-white'
          }`}
        >
          {isDownloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isDownloaded ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
        </button>

        <Heart 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(track); }}
          className={`w-4 h-4 cursor-pointer transition ${isFavorite ? 'text-emerald-500 fill-emerald-500' : 'text-zinc-500 hover:text-white'}`} 
        />
        {playlistId ? (
          <Trash2 
            onClick={(e) => { e.stopPropagation(); onRemoveFromPlaylist(playlistId, track.id); }}
            className="w-4 h-4 text-zinc-500 hover:text-red-400 cursor-pointer sm:opacity-0 group-hover:opacity-100 transition" 
          />
        ) : (
          <ListPlus 
            onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track.id); }}
            className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer sm:opacity-0 group-hover:opacity-100 transition" 
          />
        )}
      </div>
    </div>
  );
};
