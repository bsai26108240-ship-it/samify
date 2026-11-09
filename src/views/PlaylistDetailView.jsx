import React, { useContext, useEffect } from 'react';
import { Shuffle, Edit3, Trash2, ListPlus, Play } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';
import { PlayerContext } from '../contexts/PlayerContext';
import { TrackRow } from '../components/track/TrackRow';

export const PlaylistDetailView = ({ playlist, onEdit, onDelete, setCurrentView }) => {
  const { favorites, toggleFavorite, removeTrackFromPlaylist, globalTracks } = useContext(LibraryContext);
  const { play, setIsShuffle } = useContext(PlayerContext);

  useEffect(() => {
    if (!playlist) {
      setCurrentView('library');
    }
  }, [playlist, setCurrentView]);

  if (!playlist) {
    return null;
  }

  const tracks = globalTracks || [];
  const playlistTracks = (playlist.tracks || []).map(id => tracks.find(t => t.id === id)).filter(Boolean);

  const handlePlayAll = () => {
    if (playlistTracks.length > 0) {
      setIsShuffle(false);
      play(playlistTracks[0], playlistTracks);
    }
  };

  const handleShuffle = () => {
    if (playlistTracks.length > 0) {
      setIsShuffle(true);
      play(playlistTracks[Math.floor(Math.random() * playlistTracks.length)], playlistTracks);
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-10 pb-36 md:pb-24 space-y-6 sm:space-y-8 animate-fadeIn pt-2 sm:pt-4 select-none">
      <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-6 mb-6 sm:mb-8 pt-4 sm:pt-6 text-center sm:text-left">
        <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl shadow-2xl overflow-hidden flex-shrink-0 border border-white/10">
          <img src={playlist.coverUrl} alt={playlist.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1 sm:mb-2">Public Playlist</p>
          <h2 className="text-2xl sm:text-5xl font-extrabold text-white mb-1 sm:mb-2 truncate">{playlist.title}</h2>
          {playlist.description && (
            <p className="text-zinc-400 text-xs sm:text-sm mb-2 sm:mb-4 truncate max-w-xl">{playlist.description}</p>
          )}
          <p className="text-emerald-400 text-xs sm:text-sm mb-4 font-semibold">{playlistTracks.length} songs</p>
          
          <div className="flex items-center justify-center sm:justify-start space-x-3 sm:space-x-4">
            <button 
              onClick={handlePlayAll} 
              disabled={playlistTracks.length === 0}
              className="flex items-center space-x-2 bg-emerald-500 text-black font-extrabold px-6 sm:px-8 py-2.5 sm:py-3 rounded-full hover:bg-emerald-400 transition transform hover:scale-105 shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 text-xs sm:text-sm"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Play</span>
            </button>
            <button 
              onClick={handleShuffle} 
              disabled={playlistTracks.length === 0}
              className="bg-white/10 text-white font-bold p-2.5 sm:p-3 rounded-full hover:bg-white/20 transition disabled:opacity-50"
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="hidden sm:block flex-1" />
            <button 
              onClick={() => onEdit(playlist)} 
              className="text-zinc-500 hover:text-white transition p-2"
              title="Edit Playlist"
            >
              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={() => onDelete(playlist)} 
              className="text-zinc-500 hover:text-red-400 transition p-2"
              title="Delete Playlist"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {playlistTracks.length === 0 ? (
        <div className="text-center py-16 sm:py-20 text-zinc-500 border border-dashed border-white/10 rounded-2xl sm:rounded-3xl p-6">
          <ListPlus className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50 text-emerald-400" />
          <h3 className="text-lg sm:text-xl text-white font-bold mb-1 sm:mb-2">It's a bit empty here...</h3>
          <p className="text-xs sm:text-sm max-w-sm mx-auto">Search for songs or browse your library to add them to this playlist.</p>
          <button 
            onClick={() => setCurrentView('search')} 
            className="mt-4 sm:mt-6 bg-white/10 hover:bg-white/20 text-white px-5 sm:px-6 py-2 rounded-full transition text-xs sm:text-sm font-bold"
          >
            Find Songs
          </button>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          {playlistTracks.map((track, idx) => (
             <TrackRow 
               key={`${playlist.id}-${track.id}`} 
               track={track} 
               index={idx} 
               queue={playlistTracks} 
               onToggleFavorite={toggleFavorite} 
               isFavorite={favorites.includes(track.id)} 
               playlistId={playlist.id}
               onRemoveFromPlaylist={removeTrackFromPlaylist}
             />
          ))}
        </div>
      )}
    </div>
  );
};
