import React, { useContext } from 'react';
import { Search, AlertCircle, X } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';
import { TrackRow } from '../components/track/TrackRow';
import { EmptyPlaceholderView } from './EmptyPlaceholderView';

export const SearchView = ({ searchQuery, setSearchQuery, onAddToPlaylist }) => {
  const { favorites, toggleFavorite, globalTracks } = useContext(LibraryContext);
  const tracks = globalTracks || [];
  const query = (searchQuery || '').toLowerCase().trim();

  const results = tracks.filter(track => 
    track.title.toLowerCase().includes(query) || 
    track.artist.toLowerCase().includes(query) || 
    (track.album && track.album.toLowerCase().includes(query)) ||
    (track.genre && track.genre.toLowerCase().includes(query))
  );

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

      {!query ? (
        <EmptyPlaceholderView 
          title="What do you want to listen to?" 
          description="Search for artists, songs, or genres across the Samify catalogue." 
          icon={Search} 
        />
      ) : results.length === 0 ? (
        <EmptyPlaceholderView 
          title="No results found" 
          description={`We couldn't find anything matching "${searchQuery}". Try searching for another artist or song.`} 
          icon={AlertCircle} 
        />
      ) : (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
            Search Results for "{searchQuery}"
          </h2>
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
