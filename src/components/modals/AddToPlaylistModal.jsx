import React from 'react';
import { ModalOverlay } from './ModalOverlay';
import { MUSIC_CATALOGUE } from '../../data/catalogue';

export const AddToPlaylistModal = ({ onClose, trackId, playlists, onAdd }) => {
  const track = MUSIC_CATALOGUE.find(t => t.id === trackId);
  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-2xl font-bold text-white mb-2">Add to Playlist</h2>
      <p className="text-sm text-zinc-400 mb-6 truncate">Adding "{track?.title}"</p>
      
      {playlists.length === 0 ? (
        <div className="text-center py-6 text-zinc-500">You don't have any playlists yet.</div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
          {playlists.map(pl => {
            const hasTrack = pl.tracks.includes(trackId);
            return (
              <div 
                key={pl.id}
                onClick={() => {
                  if (!hasTrack) {
                    onAdd(pl.id, trackId);
                    onClose();
                  }
                }}
                className={`flex items-center space-x-4 p-3 rounded-xl border transition ${hasTrack ? 'opacity-50 cursor-not-allowed border-transparent bg-transparent' : 'cursor-pointer hover:bg-[#1a1a1a] border-white/5 bg-[#121212]'}`}
              >
                <img src={pl.coverUrl} className="w-12 h-12 rounded-lg object-cover" alt="cover" />
                <div className="flex flex-col flex-1 truncate">
                  <span className="text-sm font-bold text-white truncate">{pl.title}</span>
                  <span className="text-xs text-zinc-500">{pl.tracks.length} tracks</span>
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

