import React, { useContext } from 'react';
import { ListMusic, Plus, Play, Sparkles } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';

export const LibraryView = ({ setCurrentView, openCreatePlaylist, openSpotifyModal }) => {
  const { playlists } = useContext(LibraryContext);

  return (
    <div className="px-4 sm:px-6 md:px-10 pb-28 md:pb-10 space-y-6 sm:space-y-8 animate-fadeIn pt-2 sm:pt-4 select-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Your Library</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{playlists.length} custom playlists</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
          {openSpotifyModal && (
            <button
              onClick={openSpotifyModal}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 sm:px-4 py-2 rounded-full transition text-xs font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Import Spotify</span>
            </button>
          )}
          <button
            onClick={openCreatePlaylist}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-white/10 hover:bg-white/20 text-white px-3 sm:px-4 py-2 rounded-full transition text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> <span>New Playlist</span>
          </button>
        </div>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16 sm:py-20 text-zinc-500 flex flex-col items-center bg-[#121212] rounded-3xl border border-white/5 p-8">
          <ListMusic className="w-14 h-14 sm:w-16 sm:h-16 mb-4 opacity-40 text-emerald-400" />
          <h3 className="text-lg font-bold text-white mb-1">You haven't created any playlists yet</h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-6">
            Create your own playlist or import existing favorites directly from Spotify with 1-click!
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {openSpotifyModal && (
              <button
                onClick={openSpotifyModal}
                className="flex items-center space-x-2 bg-emerald-500 text-black px-5 py-2.5 rounded-full text-xs font-extrabold hover:bg-emerald-400 transition"
              >
                <Sparkles className="w-4 h-4" /> <span>Import Spotify Playlist</span>
              </button>
            )}
            <button
              onClick={openCreatePlaylist}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" /> <span>Create New Playlist</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6">
          {playlists.map(pl => (
            <div
              key={pl.id}
              onClick={() => setCurrentView(`playlist_${pl.id}`)}
              className="bg-[#121212] rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/5 hover:bg-[#1a1a1a] transition-all cursor-pointer group"
            >
              <div className="relative w-full aspect-square rounded-lg sm:rounded-xl overflow-hidden mb-3 sm:mb-4 shadow-lg">
                <img src={pl.coverUrl} alt={pl.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Play className="w-10 h-10 sm:w-12 sm:h-12 text-white fill-white shadow-xl" />
                </div>
              </div>
              <h4 className="font-bold text-white text-xs sm:text-base truncate mb-0.5 sm:mb-1">{pl.title}</h4>
              <p className="text-[10px] sm:text-xs text-zinc-500 truncate">{pl.tracks.length} tracks</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
