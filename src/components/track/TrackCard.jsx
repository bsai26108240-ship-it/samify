import React, { useContext } from 'react';
import { Play, Pause, Heart, ListPlus } from 'lucide-react';
import { PlayerContext } from '../../contexts/PlayerContext';
import { MUSIC_CATALOGUE } from '../../data/catalogue';

export const TrackCard = ({ track, onToggleFavorite, isFavorite, onAddToPlaylist }) => {
  const { play, currentTrack, isPlaying } = useContext(PlayerContext);
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;

  return (
    <div className="bg-[#121212] rounded-2xl p-4 border border-white/5 hover:bg-[#1a1a1a] transition-all group">
      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-4">
        <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
        <button 
          onClick={() => play(track, MUSIC_CATALOGUE)}
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            {isThisPlaying ? <Pause className="w-5 h-5 text-black fill-black" /> : <Play className="w-5 h-5 text-black fill-black ml-1" />}
          </div>
        </button>
      </div>
      <h4 className="font-bold text-white text-base truncate mb-1">{track.title}</h4>
      <p className="text-xs text-zinc-500 truncate mb-4">{track.artist}</p>
      <div className="flex items-center justify-between text-zinc-400">
        <Heart 
          onClick={() => onToggleFavorite(track.id)}
          className={`w-4 h-4 cursor-pointer hover:text-emerald-400 transition ${isFavorite ? 'text-emerald-500 fill-emerald-500' : ''}`} 
        />
        <ListPlus 
          onClick={() => onAddToPlaylist(track.id)} 
          className="w-4 h-4 cursor-pointer hover:text-white transition" 
        />
      </div>
    </div>
  );
};

