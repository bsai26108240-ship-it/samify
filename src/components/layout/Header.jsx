import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Menu, Play, Sparkles, Compass, Home, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { useSearch } from '../../contexts/SearchContext';
import { SamifyLogo } from '../common/SamifyLogo';
import { searchSongs } from '../../services/musicApi';

export const Header = ({
  searchQuery,
  setSearchQuery,
  currentView,
  setCurrentView,
  openAuthModal,
  openLoginModal,
  onToggleMobileMenu,
}) => {
  const { user, logout } = useAuth();
  const { playTrack, queue } = usePlayer();
  const searchState = useSearch() || {};

  // The App-level props and SearchContext point at the same shared state. The
  // context fallback keeps the Header usable when rendered in isolation.
  const activeSearchQuery =
    searchQuery !== undefined ? searchQuery : searchState.searchQuery || '';
  const updateSearchQuery =
    setSearchQuery || searchState.setSearchQuery || (() => {});

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const handleOpenLogin = openLoginModal || openAuthModal;

  // Live autocomplete suggestion fetching
  useEffect(() => {
    const term = (activeSearchQuery || '').trim();
    if (!term || term.length < 2) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }

    let active = true;
    setIsSuggesting(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchSongs(term, { limit: 5, withLyrics: false, throwOnError: false });
        if (active && Array.isArray(results) && results.length > 0) {
          setAutocompleteResults(results.slice(0, 5));
          setShowAutocomplete(true);
        } else if (active) {
          setAutocompleteResults([]);
        }
      } catch {
        if (active) setAutocompleteResults([]);
      } finally {
        if (active) setIsSuggesting(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeSearchQuery]);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTrack = (track) => {
    if (playTrack) {
      playTrack(track, queue ? [track, ...queue] : [track]);
    }
    setShowAutocomplete(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    updateSearchQuery(val);
    if (currentView !== 'search' && setCurrentView) {
      setCurrentView('search');
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    setShowAutocomplete(false);
    if (currentView !== 'search' && setCurrentView) {
      setCurrentView('search');
    }
  };

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-3 sm:py-4 sticky top-0 z-30 bg-black/40 backdrop-blur-md border-b border-white/10 select-none shadow-md">
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
          onClick={() => setCurrentView && setCurrentView('home')}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <SamifyLogo className="w-7 h-7" />
          <span className="font-black text-white text-lg tracking-wider">
            samify<span className="text-emerald-500">.</span>
          </span>
        </div>
      </div>

      {/* Desktop Navigation Links — Explore / Personal Portal Tabs */}
      <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
        <button
          type="button"
          onClick={() => setCurrentView && setCurrentView('discover')}
          className={`relative flex items-center gap-1.5 transition pb-1 focus:outline-none ${
            currentView === 'discover'
              ? 'text-white font-extrabold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${currentView === 'discover' ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <span>Explore</span>
          {currentView === 'discover' && (
            <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setCurrentView && setCurrentView('home')}
          className={`relative flex items-center gap-1.5 transition pb-1 focus:outline-none ${
            currentView === 'home'
              ? 'text-white font-extrabold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Home className={`w-4 h-4 ${currentView === 'home' ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <span>Home</span>
          {currentView === 'home' && (
            <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setCurrentView && setCurrentView('profile')}
          className={`relative flex items-center gap-1.5 transition pb-1 focus:outline-none ${
            currentView === 'profile'
              ? 'text-white font-extrabold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <UserCheck className={`w-4 h-4 ${currentView === 'profile' ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <span>Personal Portal</span>
          {currentView === 'profile' && (
            <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
          )}
        </button>
      </div>

      {/* Central Search Bar with Live Autocomplete */}
      <div className="relative flex-1 max-w-sm sm:max-w-md mx-3 sm:mx-6">
        <div className="relative w-full group">
          <Search className="w-4 h-4 absolute left-4 top-3 text-zinc-500 group-focus-within:text-emerald-400 transition" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search songs, artists, genres..."
            value={activeSearchQuery}
            onChange={handleInputChange}
            onKeyDown={handleSearchSubmit}
            onFocus={() => {
              if (autocompleteResults.length > 0) setShowAutocomplete(true);
            }}
            className="w-full bg-zinc-900/80 text-sm text-white pl-11 pr-10 py-2.5 rounded-full border border-white/10 focus:outline-none focus:border-emerald-500/60 focus:bg-zinc-900 transition-all shadow-inner"
          />
          {activeSearchQuery && (
            <button
              onClick={() => {
                updateSearchQuery('');
                setShowAutocomplete(false);
              }}
              className="absolute right-3.5 top-3 text-zinc-500 hover:text-white transition"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Autocomplete Dropdown */}
        {showAutocomplete && autocompleteResults.length > 0 && (
          <div
            ref={autocompleteRef}
            className="absolute left-0 right-0 top-12 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5 animate-fadeIn"
          >
            <div className="px-3 py-1.5 bg-zinc-950/60 flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              <span>Instant Suggestions</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Tap to play
              </span>
            </div>

            {autocompleteResults.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectTrack(item)}
                className="flex items-center gap-3 p-2.5 hover:bg-emerald-500/10 hover:border-l-2 hover:border-emerald-400 transition cursor-pointer group"
              >
                <img
                  src={item.coverUrl || '/default-cover.png'}
                  alt={item.title}
                  className="w-9 h-9 rounded-md object-cover flex-shrink-0 group-hover:scale-105 transition"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {item.artist}
                  </p>
                </div>
                <button
                  className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md"
                  aria-label="Play song"
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls: User Profile Dropdown vs Log In Button */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-800 text-white p-1 pr-3 rounded-full border border-white/10 transition shadow-sm"
            >
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center font-bold text-black uppercase text-xs">
                {(user.name || user.email || 'U').charAt(0)}
              </div>
              <span className="hidden md:block text-sm font-medium truncate max-w-[100px]">
                {user.name || user.email}
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-zinc-900/95 backdrop-blur-xl rounded-xl shadow-2xl z-50 border border-white/10 overflow-hidden divide-y divide-white/5 animate-fadeIn">
                <div className="px-4 py-3">
                  <div className="text-sm font-bold text-white truncate">{user.name || user.email}</div>
                  <div className="text-xs text-zinc-400 truncate mt-0.5">{user.email}</div>
                </div>
                {setCurrentView && (
                  <button
                    onClick={() => {
                      setCurrentView('profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition"
                  >
                    Personal Portal
                  </button>
                )}
                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleOpenLogin}
            className="bg-emerald-500 text-black px-5 py-2 rounded-full font-bold text-xs sm:text-sm hover:bg-emerald-400 transition transform hover:scale-105 shadow-md"
          >
            Log In
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;

