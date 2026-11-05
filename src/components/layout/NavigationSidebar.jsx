import React, { useContext } from 'react';
import { Compass, Search, Heart, Library, Plus } from 'lucide-react';
import { LibraryContext } from '../../contexts/LibraryContext';
import { SamifyLogo } from '../common/SamifyLogo';

export const NavigationSidebar = ({ currentView, setCurrentView, openCreatePlaylist }) => {
  const { playlists } = useContext(LibraryContext);
  
  return (
    <aside className="w-64 flex flex-col z-10 bg-black/70 backdrop-blur-2xl border-r border-white/5 p-6 h-[calc(100vh-96px)]">
      <div className="flex items-center space-x-3 mb-10 cursor-pointer group" onClick={() => setCurrentView('home')}>
        <SamifyLogo className="w-9 h-9" />
        <h1 className="text-2xl font-black tracking-wider text-white group-hover:text-emerald-400 transition">
          samify<span className="text-emerald-500 animate-pulse">.</span>
        </h1>
      </div>

      <div className="space-y-1 mb-10">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 px-3">Menu</p>
        <button onClick={() => setCurrentView('home')} className={`w-full flex items-center space-x-4 px-3 py-2.5 rounded-xl transition-all ${currentView === 'home' ? 'text-emerald-400 bg-white/10 font-medium relative before:absolute before:left-0 before:w-1 before:h-6 before:bg-emerald-500 before:rounded-r-full shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
          <Compass className="w-5 h-5" />
          <span className="text-sm font-semibold">Discover</span>
        </button>
        <button onClick={() => setCurrentView('search')} className={`w-full flex items-center space-x-4 px-3 py-2.5 rounded-xl transition-all ${currentView === 'search' ? 'text-emerald-400 bg-white/10 font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
          <Search className="w-5 h-5" />
          <span className="text-sm font-semibold">Search</span>
        </button>
      </div>

      <div className="space-y-1 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 mb-3">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">My Library</p>
          <Plus onClick={openCreatePlaylist} className="w-4 h-4 text-zinc-500 hover:text-emerald-400 cursor-pointer transition transform hover:scale-125" />
        </div>
        <button onClick={() => setCurrentView('liked')} className={`w-full flex items-center space-x-4 px-3 py-2.5 rounded-xl transition-all ${currentView === 'liked' ? 'text-emerald-400 bg-white/10 font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
          <Heart className="w-5 h-5" />
          <span className="text-sm font-semibold">Liked Songs</span>
        </button>
        <button onClick={() => setCurrentView('library')} className={`w-full flex items-center space-x-4 px-3 py-2.5 rounded-xl transition-all ${currentView === 'library' ? 'text-emerald-400 bg-white/10 font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
          <Library className="w-5 h-5" />
          <span className="text-sm font-semibold">Your Library</span>
        </button>
        
        <div className="mt-4 flex-1 overflow-y-auto scrollbar-hide space-y-1 border-t border-white/5 pt-4">
          {playlists.map(pl => {
            const viewId = `playlist_${pl.id}`;
            return (
              <button 
                key={pl.id}
                onClick={() => setCurrentView(viewId)} 
                className={`w-full flex items-center space-x-4 px-3 py-2 rounded-xl transition-all ${currentView === viewId ? 'text-emerald-400 bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-sm truncate text-left">{pl.title}</span>
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  );
};
