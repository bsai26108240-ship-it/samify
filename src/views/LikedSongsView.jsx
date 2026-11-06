import React, { useContext } from 'react';
import { Heart, Play } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';
import { PlayerContext } from '../contexts/PlayerContext';
import { TrackRow } from '../components/track/TrackRow';

export const LikedSongsView = ({ onAddToPlaylist }) => {
  const { favorites, toggleFavorite, globalTracks } = useContext(LibraryContext);
  const tracks = globalTracks || [];
  const likedTracks = tracks.filter(t => favorites.includes(t.id));
  const { play } = useContext(PlayerContext);

  return (
    <div className="px-4 sm:px-6 md:px-10 pb-28 md:pb-10 space-y-6 sm:space-y-8 animate-fadeIn pt-2 sm:pt-4 select-none">
      <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-6 mb-6 sm:mb-8 pt-4 sm:pt-6 text-center sm:text-left">
        <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-emerald-500 to-teal-900 rounded-2xl shadow-2xl flex items-center justify-center flex-shrink-0">
          <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-white fill-white" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1 sm:mb-2">Playlist</p>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-2 sm:mb-4">Liked Songs</h2>
          <p className="text-zinc-400 text-xs sm:text-sm mb-3 sm:mb-4">{likedTracks.length} songs</p>
          <button 
            onClick={() => likedTracks.length > 0 && play(likedTracks[0], likedTracks)} 
            disabled={likedTracks.length === 0}
            className="inline-flex items-center space-x-2 bg-emerald-500 text-black font-bold px-6 sm:px-8 py-2.5 sm:py-3 rounded-full hover:bg-emerald-400 transition transform hover:scale-105 disabled:opacity-50 text-xs sm:text-sm"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Play All</span>
          </button>
        </div>
      </div>
      
      {likedTracks.length === 0 ? (
        <div className="text-center py-16 sm:py-20 text-zinc-500 text-sm bg-[#121212] rounded-2xl border border-white/5 p-6">
          No liked songs yet. Go discover some music!
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          {likedTracks.map((track, idx) => (
            <TrackRow 
              key={track.id} 
              track={track} 
              index={idx} 
              queue={likedTracks} 
              onToggleFavorite={toggleFavorite} 
              isFavorite={true} 
              onAddToPlaylist={onAddToPlaylist} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
