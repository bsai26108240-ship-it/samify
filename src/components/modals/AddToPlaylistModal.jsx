import React, { useContext } from 'react';
import { ModalOverlay } from './ModalOverlay';
import { LibraryContext } from '../../contexts/LibraryContext';

export const AddToPlaylistModal = ({ onClose, trackId, playlists, onAdd }) => {
  const { globalTracks } = useContext(LibraryContext);
  const track = (globalTracks || []).find(t => t.id === trackId);

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Add to Playlist</h2>
      <p className="text-xs sm:text-sm text-zinc-400 mb-6 truncate">Adding "{track?.title || 'Selected Track'}"</p>
      
      {playlists.length === 0 ? (
        <div className="text-center py-6 text-zinc-500 text-sm">You don't have any playlists yet.</div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
          {playlists.map(pl => {
            const hasTrack = (pl.tracks || []).includes(trackId);
            return (
              <div 
                key={pl.id}
                onClick={() => {
                  if (!hasTrack) {
                    onAdd(pl.id, trackId);
                    onClose();
                  }
                }}
                className={`flex items-center space-x-3 sm:space-x-4 p-2.5 sm:p-3 rounded-xl border transition ${hasTrack ? 'opacity-50 cursor-not-allowed border-transparent bg-transparent' : 'cursor-pointer hover:bg-[#1a1a1a] border-white/5 bg-[#121212]'}`}
              >
                <img src={pl.coverUrl} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0" alt="cover" />
                <div className="flex flex-col flex-1 truncate">
                  <span className="text-xs sm:text-sm font-bold text-white truncate">{pl.title}</span>
                  <span className="text-[10px] sm:text-xs text-zinc-500">{(pl.tracks || []).length} tracks</span>
                </div>
                {hasTrack && <span className="text-xs text-emerald-500 font-bold">Added</span>}
              </div>
            );
          })}
        </div>
      )}
    </ModalOverlay>
  );
};
