import React, { useContext, useEffect } from 'react';
import { Shuffle, Edit3, Trash2, ListPlus } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';
import { PlayerContext } from '../contexts/PlayerContext';
import { TrackRow } from '../components/track/TrackRow';
import { MUSIC_CATALOGUE } from '../data/catalogue';

export const PlaylistDetailView = ({ playlist, onEdit, onDelete, setCurrentView }) => {
  const { favorites, toggleFavorite, removeTrackFromPlaylist } = useContext(LibraryContext);
  const { play, setIsShuffle } = useContext(PlayerContext);

  useEffect(() => {
    if (!playlist) {
      setCurrentView('library');
    }
  }, [playlist, setCurrentView]);

  if (!playlist) {
    return null;
  }

  const playlistTracks = playlist.tracks.map(id => MUSIC_CATALOGUE.find(t => t.id === id)).filter(Boolean);

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
    <div className="px-10 pb-10 space-y-8 animate-fadeIn">
      <div className="flex items-end space-x-6 mb-8 pt-6">
        <div className="w-48 h-48 rounded-2xl shadow-2xl overflow-hidden flex-shrink-0 border border-white/10">
          <img src={playlist.coverUrl} alt={playlist.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-2">Public Playlist</p>
          <h2 className="text-5xl font-extrabold text-white mb-2 truncate">{playlist.title}</h2>
          {playlist.description && <p className="text-zinc-400 text-sm mb-4 truncate">{playlist.description}</p>}
          <p className="text-emerald-500 text-sm mb-6 font-medium">{playlist.tracks.length} songs</p>
          
          <div className="flex items-center space-x-4">
            <button onClick={handlePlayAll} className="bg-emerald-500 text-black font-bold px-8 py-3 rounded-full hover:bg-emerald-400 transition transform hover:scale-105 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              Play
            </button>
            <button onClick={handleShuffle} className="bg-white/10 text-white font-bold p-3 rounded-full hover:bg-white/20 transition">
              <Shuffle className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <button onClick={() => onEdit(playlist)} className="text-zinc-500 hover:text-white transition p-2"><Edit3 className="w-5 h-5" /></button>
            <button onClick={() => onDelete(playlist)} className="text-zinc-500 hover:text-red-400 transition p-2"><Trash2 className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
      
      {playlistTracks.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 border border-dashed border-white/10 rounded-3xl">
          <ListPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl text-white font-bold mb-2">It's a bit empty here...</h3>
          <p>Search for songs or browse your library to add them to this playlist.</p>
          <button onClick={() => setCurrentView('search')} className="mt-6 bg-white/10 text-white px-6 py-2 rounded-full hover:bg-white/20 transition text-sm font-bold">Find Songs</button>
        </div>
      ) : (
        <div className="space-y-2">
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

