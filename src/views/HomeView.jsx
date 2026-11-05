import React, { useContext } from 'react';
import { PlayCircle } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';
import { TrackCard } from '../components/track/TrackCard';
import { TrackRow } from '../components/track/TrackRow';
import { MUSIC_CATALOGUE } from '../data/catalogue';

export const HomeView = ({ onAddToPlaylist }) => {
  const { favorites, toggleFavorite } = useContext(LibraryContext);
  
  return (
    <div className="px-10 pb-10 space-y-12 animate-fadeIn">
      <div className="relative w-full h-72 rounded-3xl overflow-hidden group cursor-pointer">
        <img src="https://images.unsplash.com/photo-1493225457124-a1a2a5956093?w=1200&auto=format&fit=crop&q=80" alt="Hero Artist" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 p-10 flex flex-col justify-center">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>
            <span className="text-xs font-semibold text-zinc-300 tracking-wide uppercase">Verified Artist</span>
          </div>
          <h2 className="text-6xl font-extrabold text-white mb-3 drop-shadow-lg">Aether Code</h2>
          <p className="text-zinc-300 text-sm flex items-center space-x-2">
            <PlayCircle className="w-4 h-4 text-emerald-400" />
            <span>82,736,050 monthly listeners</span>
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Trendy Songs</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {MUSIC_CATALOGUE.slice(0,4).map((track) => (
            <TrackCard key={track.id} track={track} onToggleFavorite={toggleFavorite} isFavorite={favorites.includes(track.id)} onAddToPlaylist={onAddToPlaylist} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Popular Releases</h3>
        </div>
        <div className="space-y-2">
          {MUSIC_CATALOGUE.slice(4).map((track, idx) => (
            <TrackRow key={track.id} track={track} index={idx} queue={MUSIC_CATALOGUE} onToggleFavorite={toggleFavorite} isFavorite={favorites.includes(track.id)} onAddToPlaylist={onAddToPlaylist} />
          ))}
        </div>
      </div>
    </div>
  );
};

