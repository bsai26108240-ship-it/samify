import React, { useContext, useState } from 'react';
import { Search, X, LogIn, User, LogOut, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../../contexts/AuthContext';

export const Topbar = ({ searchQuery, setSearchQuery, currentView, setCurrentView, openAuthModal }) => {
  const { user, signOut } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'My Account';

  return (
    <header className="flex items-center justify-between px-10 py-6 sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/5 select-none">
      <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
        <span onClick={() => setCurrentView('home')} className={`cursor-pointer transition ${currentView === 'home' ? 'text-white border-b-2 border-emerald-500 pb-1 font-bold' : 'text-zinc-400 hover:text-white'}`}>Explore</span>
        <span onClick={() => setCurrentView('profile')} className={`cursor-pointer transition ${currentView === 'profile' ? 'text-white border-b-2 border-emerald-500 pb-1 font-bold' : 'text-zinc-400 hover:text-white'}`}>Personal Portal</span>
      </div>

      <div className="flex items-center space-x-6 flex-1 justify-end">
        {/* Search Bar */}
        <div className="relative w-full max-w-xs group hidden sm:block">
          <Search className="w-4 h-4 absolute left-4 top-3 text-zinc-500 group-focus-within:text-emerald-500 transition" />
          <input
            type="text"
            placeholder="Search songs, artists..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (currentView !== 'search') setCurrentView('search');
            }}
            className="w-full bg-[#121212] text-sm text-white pl-11 pr-10 py-2.5 rounded-full border border-white/10 focus:outline-none focus:border-emerald-500/50 focus:bg-[#1a1a1a] transition-all"
          />
          {searchQuery && (
            <X 
              onClick={() => setSearchQuery('')}
              className="w-4 h-4 absolute right-4 top-3 text-zinc-500 hover:text-white cursor-pointer transition" 
            />
          )}
        </div>

        {/* User Account State (Log In vs Profile Menu) */}
        {!user ? (
          <button 
            onClick={openAuthModal}
            className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-5 py-2.5 rounded-full transition shadow-[0_0_15px_rgba(16,185,129,0.4)] text-sm"
          >
            <LogIn className="w-4 h-4" /> <span>Log In</span>
          </button>
        ) : (
          <div className="relative">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-3 bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full transition"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500/30 p-0.5 border border-emerald-500">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60" alt="Avatar" className="w-full h-full rounded-full object-cover" />
              </div>
              <span className="text-xs font-bold text-white max-w-[100px] truncate">{username}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-3 w-52 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn">
                <div className="px-4 py-2 border-b border-white/5">
                  <p className="text-xs font-bold text-white truncate">{username}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                </div>
                <button 
                  onClick={() => { setCurrentView('profile'); setMenuOpen(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition text-left"
                >
                  <User className="w-4 h-4 text-emerald-400" /> <span>Personal Portal</span>
                </button>
                <button 
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition text-left border-t border-white/5"
                >
                  <LogOut className="w-4 h-4" /> <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
