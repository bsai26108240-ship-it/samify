import React, { useContext, useState } from 'react';
import { Search, X, LogIn, LogOut } from 'lucide-react';
import { AuthContext } from '../../contexts/AuthContext';

export const Topbar = ({ searchQuery, setSearchQuery, currentView, setCurrentView, onOpenAuth }) => {
  const { user, signOut } = useContext(AuthContext) || {};
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-10 py-6 sticky top-0 z-20 bg-black/60 backdrop-blur-md">
      <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
        <span className="text-white border-b-2 border-emerald-500 pb-1 cursor-pointer">Explore</span>
      </div>
      <div className="flex items-center space-x-6 flex-1 justify-end">
        <div className="relative w-full max-w-xs group hidden sm:block">
          <Search className="w-4 h-4 absolute left-4 top-3 text-zinc-500 group-focus-within:text-emerald-500 transition" />
          <input
            type="text"
            placeholder="Search songs, artists, albums..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (currentView !== 'search') setCurrentView('search');
            }}
            className="w-full bg-[#121212] text-sm text-white pl-11 pr-10 py-2.5 rounded-full border border-white/5 focus:outline-none focus:border-emerald-500/50 focus:bg-[#1a1a1a] transition-all"
          />
          {searchQuery && (
            <X 
              onClick={() => setSearchQuery('')}
              className="w-4 h-4 absolute right-4 top-3 text-zinc-500 hover:text-white cursor-pointer transition" 
            />
          )}
        </div>

        {user ? (
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2.5 bg-[#181818] hover:bg-[#222] border border-white/10 rounded-full py-1 pl-1 pr-3 transition"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 p-0.5 border border-emerald-500/50 overflow-hidden flex items-center justify-center">
                <img 
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60" 
                  alt="User" 
                  className="w-full h-full rounded-full object-cover" 
                />
              </div>
              <span className="text-xs font-bold text-white max-w-[120px] truncate">
                {user.user_metadata?.username || user.email?.split('@')[0]}
              </span>
            </button>

            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-[#181818] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 animate-fadeIn"
                onClick={() => setDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Signed in as</p>
                  <p className="text-xs font-bold text-white truncate">{user.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold px-4 py-2 rounded-full transition shadow-[0_0_15px_rgba(16,185,129,0.3)] transform hover:scale-105"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
        )}
      </div>
    </header>
  );
};
