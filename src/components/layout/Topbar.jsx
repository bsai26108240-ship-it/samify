import React, { useState } from 'react';
import { Search, X, Sparkles, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SamifyLogo } from '../common/SamifyLogo';

export const Topbar = ({ 
  searchQuery, 
  setSearchQuery, 
  currentView, 
  setCurrentView, 
  openAuthModal,
  openLoginModal,
  openSpotifyModal,
  onToggleMobileMenu
}) => {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleOpenLogin = openLoginModal || openAuthModal;

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-3 sm:py-4 md:py-6 sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/5 select-none">
      {/* Mobile Menu Toggle & Brand */}
      <div className="flex items-center space-x-3 md:hidden">
        <button 
          onClick={onToggleMobileMenu}
          className="p-2 -ml-2 text-zinc-400 hover:text-white transition rounded-lg"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div 
          onClick={() => setCurrentView('home')}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <SamifyLogo className="w-7 h-7" />
          <span className="font-black text-white text-lg tracking-wider">samify<span className="text-emerald-500">.</span></span>
        </div>
      </div>

      {/* Desktop Navigation Links */}
      <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
        <span 
          onClick={() => setCurrentView('home')} 
          className={`cursor-pointer transition ${currentView === 'home' ? 'text-white border-b-2 border-emerald-500 pb-1 font-bold' : 'text-zinc-400 hover:text-white'}`}
        >
          Explore
        </span>
        <span 
          onClick={() => setCurrentView('profile')} 
          className={`cursor-pointer transition ${currentView === 'profile' ? 'text-white border-b-2 border-emerald-500 pb-1 font-bold' : 'text-zinc-400 hover:text-white'}`}
        >
          Personal Portal
        </span>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-6 flex-1 justify-end">
        {/* Desktop Search Bar */}
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

        {/* Mobile Search Icon Toggle */}
        <button 
          onClick={() => {
            if (currentView !== 'search') setCurrentView('search');
            setMobileSearchOpen(!mobileSearchOpen);
          }}
          className="sm:hidden p-2 text-zinc-400 hover:text-white transition"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Spotify Importer Button */}
        <button
          onClick={openSpotifyModal}
          className="flex items-center space-x-1.5 bg-white/5 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full transition text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:shadow-[0_0_18px_rgba(16,185,129,0.4)]"
          title="Import Spotify Playlist"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="hidden xs:inline">Import Spotify</span>
          <span className="xs:hidden">Import</span>
        </button>

        {/* Dynamic User Profile Dropdown vs Log In Button */}
        <div className="relative">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)} 
                className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white p-1 pr-3 rounded-full border border-gray-700 transition"
              >
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center font-bold text-black uppercase">
                  {(user.name || user.email || 'U').charAt(0)}
                </div>
                <span className="hidden md:block text-sm font-medium truncate max-w-[100px]">
                  {user.name || user.email}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[#282828] rounded-md shadow-2xl z-50 border border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <div className="text-sm font-bold text-white truncate">{user.name || user.email}</div>
                    <div className="text-xs text-gray-400 truncate mt-1">{user.email}</div>
                  </div>
                  {setCurrentView && (
                    <button 
                      onClick={() => {
                        setCurrentView('profile');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-gray-700 transition border-b border-gray-700"
                    >
                      Personal Portal
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }} 
                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={handleOpenLogin} 
              className="bg-emerald-500 text-black px-6 py-2 rounded-full font-bold hover:bg-emerald-400 transition transform hover:scale-105"
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
