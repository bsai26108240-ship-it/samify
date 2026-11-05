import React, { useContext } from 'react';
import { Heart } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';
import { PlayerContext } from '../contexts/PlayerContext';
import { TrackRow } from '../components/track/TrackRow';
import { MUSIC_CATALOGUE } from '../data/catalogue';

export const LikedSongsView = ({ onAddToPlaylist }) => {
  const { favorites, toggleFavorite } = useContext(LibraryContext);
  const likedTracks = MUSIC_CATALOGUE.filter(t => favorites.includes(t.id));
  const { play } = useContext(PlayerContext);

  return (
    <div className="px-10 pb-10 space-y-8 animate-fadeIn">
      <div className="flex items-end space-x-6 mb-8 pt-6">
        <div className="w-40 h-40 bg-gradient-to-br from-emerald-500 to-teal-900 rounded-2xl shadow-2xl flex items-center justify-center">
          <Heart className="w-16 h-16 text-white fill-white" />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-2">Playlist</p>
          <h2 className="text-5xl font-extrabold text-white mb-4">Liked Songs</h2>
          <p className="text-zinc-400 text-sm mb-4">{likedTracks.length} songs</p>
          <button onClick={() => likedTracks.length > 0 && play(likedTracks[0], likedTracks)} className="bg-emerald-500 text-black font-bold px-8 py-3 rounded-full hover:bg-emerald-400 transition transform hover:scale-105">
            Play All
          </button>
        </div>
      </div>
      
      {likedTracks.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">No liked songs yet. Go discover some music!</div>
      ) : (
        <div className="space-y-2">
          {likedTracks.map((track, idx) => (
             <TrackRow key={track.id} track={track} index={idx} queue={likedTracks} onToggleFavorite={toggleFavorite} isFavorite={true} onAddToPlaylist={onAddToPlaylist} />
          ))}
        </div>
      )}
    </div>
  );
};

