import React, { useContext } from 'react';
import { ListMusic, Plus, Play } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';

export const LibraryView = ({ setCurrentView, openCreatePlaylist }) => {
  const { playlists } = useContext(LibraryContext);

  return (
    <div className="px-10 pb-10 space-y-8 animate-fadeIn pt-4">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-white">Your Library</h2>
        <button onClick={openCreatePlaylist} className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition text-sm font-bold">
          <Plus className="w-4 h-4" /> <span>New Playlist</span>
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 flex flex-col items-center">
          <ListMusic className="w-16 h-16 mb-4 opacity-50" />
          <p>You haven't created any playlists yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {playlists.map(pl => (
            <div key={pl.id} onClick={() => setCurrentView(`playlist_${pl.id}`)} className="bg-[#121212] rounded-2xl p-4 border border-white/5 hover:bg-[#1a1a1a] transition-all cursor-pointer group">
              <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-4 shadow-lg">
                <img src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Play className="w-12 h-12 text-white fill-white shadow-xl" />
                </div>
              </div>
              <h4 className="font-bold text-white text-base truncate mb-1">{pl.title}</h4>
              <p className="text-xs text-zinc-500 truncate">{pl.tracks.length} tracks</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

