import React, { useContext } from 'react';
import { PlayerContext } from '../../contexts/PlayerContext';

export const RightSidebar = () => {
  const { currentTrack, isPlaying, queue } = useContext(PlayerContext);
  if (!currentTrack) return null;

  return (
    <aside className="w-80 hidden lg:flex flex-col z-10 bg-[#0a0a0a] border-l border-white/5 h-[calc(100vh-96px)] overflow-y-auto scrollbar-hide relative">
      <div className="p-6 pt-10">
         <h3 className="text-lg font-bold text-white mb-4">Now Playing Overview</h3>
         <div className="bg-[#121212] rounded-3xl p-4 border border-white/5">
           <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 shadow-2xl">
             <img src={currentTrack.coverUrl} alt={currentTrack.album} className={`w-full h-full object-cover ${isPlaying ? 'scale-105' : 'scale-100'} transition-transform duration-1000`} />
             {isPlaying && <div className="absolute inset-0 bg-black/20" />}
           </div>
           <div className="text-center mb-4">
             <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Queue • {queue.length} Tracks</p>
             <h4 className="text-xl font-bold text-white mb-1">{currentTrack.album}</h4>
             <p className="text-xs text-zinc-400">Enjoy vivid emotions with this stunning music selection.</p>
           </div>
         </div>
      </div>
    </aside>
  );
};

