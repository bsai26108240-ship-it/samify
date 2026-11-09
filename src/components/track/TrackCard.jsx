import React, { useContext } from 'react';
import { Play, Pause, Heart, ListPlus } from 'lucide-react';
import { PlayerContext } from '../../contexts/PlayerContext';
import { LibraryContext } from '../../contexts/LibraryContext';

export const TrackCard = ({ track, queue, onToggleFavorite, isFavorite, onAddToPlaylist }) => {
  const { play, currentTrack, isPlaying } = useContext(PlayerContext);
  const { globalTracks } = useContext(LibraryContext);
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
  const effectiveQueue = queue || globalTracks || [track];

  return (
    <div 
      onClick={() => play(track, effectiveQueue)}
      className="bg-[#121212] rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/5 hover:bg-[#1a1a1a] transition-all group cursor-pointer"
    >
      <div className="relative w-full aspect-square rounded-lg sm:rounded-xl overflow-hidden mb-3 sm:mb-4">
        <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
        <div 
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
            {isThisPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-black fill-black" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 text-black fill-black ml-0.5 sm:ml-1" />}
          </div>
        </div>
      </div>
      <h4 className="font-bold text-white text-xs sm:text-base truncate mb-0.5 sm:mb-1">{track.title}</h4>
      <p className="text-[10px] sm:text-xs text-zinc-500 truncate mb-2 sm:mb-4">{track.artist}</p>
      <div className="flex items-center justify-between text-zinc-400">
        <Heart 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(track); }}
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer hover:text-emerald-400 transition ${isFavorite ? 'text-emerald-500 fill-emerald-500' : ''}`} 
        />
        <ListPlus 
          onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track.id); }} 
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer hover:text-white transition" 
        />
      </div>
    </div>
  );
};
