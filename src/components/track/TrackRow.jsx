import React, { useContext } from 'react';
import { Heart, Trash2, ListPlus } from 'lucide-react';
import { PlayerContext } from '../../contexts/PlayerContext';
import { formatTime } from '../../utils/formatTime';

export const TrackRow = ({ track, index, queue, onToggleFavorite, isFavorite, onAddToPlaylist, playlistId, onRemoveFromPlaylist }) => {
  const { play, currentTrack, isPlaying } = useContext(PlayerContext);
  const isThisPlaying = currentTrack?.id === track.id;

  return (
    <div 
      onDoubleClick={() => play(track, queue)}
      className={`flex items-center px-4 py-3 rounded-xl transition-all cursor-pointer border border-transparent group ${
        isThisPlaying ? 'bg-[#1a1a1a] border-white/5' : 'hover:bg-[#121212]'
      }`}
    >
      <div className="w-8 text-center text-sm text-zinc-600 font-medium">
        {isThisPlaying && isPlaying ? (
          <div className="flex items-end justify-center space-x-1 h-4">
            <div className="w-1 bg-emerald-500 h-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 bg-emerald-500 h-2/3 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 bg-emerald-500 h-4/5 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          `#${index + 1}`
        )}
      </div>
      <div className="flex items-center space-x-4 flex-1 ml-4 overflow-hidden">
        <img src={track.coverUrl} alt="cover" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
        <div className="flex flex-col truncate">
          <span className={`font-semibold text-sm truncate ${isThisPlaying ? 'text-emerald-400' : 'text-white'}`}>
            {track.title}
          </span>
          <span className="text-xs text-zinc-500 truncate sm:hidden">{track.artist}</span>
        </div>
      </div>
      <div className="flex-1 text-sm text-zinc-500 hidden sm:block truncate">{track.artist}</div>
      <div className="flex-1 text-sm text-zinc-500 hidden md:block truncate">{track.album}</div>
      <div className="flex items-center space-x-6">
        <span className="text-sm text-zinc-500 hidden lg:block">{formatTime(track.duration)}</span>
        <Heart 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(track.id); }}
          className={`w-4 h-4 cursor-pointer ${isFavorite ? 'text-emerald-500 fill-emerald-500' : 'text-zinc-500 hover:text-white'}`} 
        />
        {playlistId ? (
          <Trash2 
            onClick={(e) => { e.stopPropagation(); onRemoveFromPlaylist(playlistId, track.id); }}
            className="w-4 h-4 text-zinc-500 hover:text-red-400 cursor-pointer hidden sm:block opacity-0 group-hover:opacity-100 transition" 
          />
        ) : (
          <ListPlus 
            onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track.id); }}
            className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer hidden sm:block opacity-0 group-hover:opacity-100 transition" 
          />
        )}
      </div>
    </div>
  );
};

