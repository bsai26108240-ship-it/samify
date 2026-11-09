import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Search, AlertCircle, X, Loader2 } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';
import { TrackRow } from '../components/track/TrackRow';
import { EmptyPlaceholderView } from './EmptyPlaceholderView';
import { searchSongs } from '../services/musicApi';

export const SearchView = ({ searchQuery, setSearchQuery, onAddToPlaylist }) => {
  const { favorites, toggleFavorite, globalTracks } = useContext(LibraryContext);
  const [onlineResults, setOnlineResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const requestIdRef = useRef(0);

  const query = (searchQuery || '').trim();
  const normalizedQuery = query.toLowerCase();

  const localResults = useMemo(() => {
    if (!normalizedQuery) return [];

    return (globalTracks || []).filter(track =>
      track.title?.toLowerCase().includes(normalizedQuery) ||
      track.artist?.toLowerCase().includes(normalizedQuery) ||
      track.album?.toLowerCase().includes(normalizedQuery) ||
      track.genre?.toLowerCase().includes(normalizedQuery)
    );
  }, [globalTracks, normalizedQuery]);

  useEffect(() => {
    if (!normalizedQuery) {
      setOnlineResults([]);
      setIsSearching(false);
      setSearchError('');
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    // Debounce live keystroke searches so we browse the catalogue fluidly.
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');

      try {
        const results = await searchSongs(normalizedQuery, {
          limit: 30,
          withLyrics: false,
          throwOnError: true,
        });

        if (requestIdRef.current === requestId) {
          setOnlineResults(results);
        }
      } catch (error) {
        if (requestIdRef.current === requestId) {
          // Keep any previously cached online results so we don't flash
          // an empty screen on a transient network hiccup.
          setOnlineResults((prev) => prev.length > 0 ? prev : []);
          setSearchError(
            'Online search is unavailable right now. Showing local library matches instead.'
          );
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [normalizedQuery]);

  const results = useMemo(() => {
    const seen = new Set();

    return [...localResults, ...onlineResults].filter((track) => {
      if (!track?.id || seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    });
  }, [localResults, onlineResults]);

  return (
    <div className="px-4 sm:px-6 md:px-10 pb-28 md:pb-10 space-y-4 sm:space-y-6 animate-fadeIn pt-2 sm:pt-4 select-none">
      {/* Mobile Search Bar */}
      <div className="sm:hidden relative w-full mb-4">
        <Search className="w-4 h-4 absolute left-4 top-3.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search songs, artists, genres..."
          value={searchQuery}
          onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
          className="w-full bg-[#161616] text-sm text-white pl-11 pr-10 py-3 rounded-full border border-white/10 focus:outline-none focus:border-emerald-500 transition"
        />
        {searchQuery && (
          <X 
            onClick={() => setSearchQuery && setSearchQuery('')}
            className="w-4 h-4 absolute right-4 top-3.5 text-zinc-400 hover:text-white cursor-pointer" 
          />
        )}
      </div>

      {!normalizedQuery ? (
        <EmptyPlaceholderView 
          title="What do you want to listen to?" 
          description="Search JioSaavn's full catalogue and your local library for songs, artists, albums, and genres." 
          icon={Search} 
        />
      ) : isSearching && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
          <p className="text-sm font-semibold">Searching JioSaavn...</p>
        </div>
      ) : results.length === 0 ? (
        <EmptyPlaceholderView 
          title="No results found" 
          description={`We couldn't find anything matching "${searchQuery}". Try searching for another artist or song.`} 
          icon={AlertCircle} 
        />
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Search Results for "{searchQuery}"
            </h2>
            {isSearching && <Loader2 className="w-4 h-4 animate-spin text-emerald-400 flex-shrink-0" />}
          </div>

          {searchError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{searchError}</span>
            </div>
          )}

          <div className="space-y-1.5 sm:space-y-2">
            {results.map((track, idx) => (
              <TrackRow 
                key={track.id} 
                track={track} 
                index={idx} 
                queue={results} 
                onToggleFavorite={toggleFavorite} 
                isFavorite={favorites.includes(track.id)} 
                onAddToPlaylist={onAddToPlaylist} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
