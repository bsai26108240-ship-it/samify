import React, { useContext } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';
import { TrackRow } from '../components/track/TrackRow';
import { MUSIC_CATALOGUE } from '../data/catalogue';
import { EmptyPlaceholderView } from './EmptyPlaceholderView';

export const SearchView = ({ searchQuery, onAddToPlaylist }) => {
  const { favorites, toggleFavorite } = useContext(LibraryContext);
  const query = searchQuery.toLowerCase().trim();

  const results = MUSIC_CATALOGUE.filter(track => track.title.toLowerCase().includes(query) || track.artist.toLowerCase().includes(query) || track.album.toLowerCase().includes(query));

  if (!query) return <EmptyPlaceholderView title="What do you want to listen to?" description="Search for artists, songs, or albums." icon={Search} />;
  if (results.length === 0) return <EmptyPlaceholderView title="No results found" description={`We couldn't find anything matching "${searchQuery}".`} icon={AlertCircle} />;

  return (
    <div className="px-10 pb-10 space-y-6 animate-fadeIn pt-4">
      <h2 className="text-2xl font-bold text-white mb-6">Search Results for "{searchQuery}"</h2>
      <div className="space-y-2">
        {results.map((track, idx) => (
          <TrackRow key={track.id} track={track} index={idx} queue={results} onToggleFavorite={toggleFavorite} isFavorite={favorites.includes(track.id)} onAddToPlaylist={onAddToPlaylist} />
        ))}
      </div>
    </div>
  );
};

