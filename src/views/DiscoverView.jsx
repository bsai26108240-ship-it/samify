import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Flame, Sparkles, SlidersHorizontal, Music2, Compass, Loader2 } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';
import { PlayerContext } from '../contexts/PlayerContext';
import { TrackCard } from '../components/track/TrackCard';
import { TrackRow } from '../components/track/TrackRow';
import { EmptyPlaceholderView } from './EmptyPlaceholderView';
import { getTopPlayed, getTopGenres } from '../utils/playHistory';

const GENRE_CHIPS = ['Hip-Hop', 'Synth-Pop', 'R&B', 'Pop', 'Trap', 'Electro'];

const genreMatches = (track, genre) =>
  Boolean(track?.genre) &&
  track.genre
    .toLowerCase()
    .split('/')
    .some((part) => part.trim().includes(genre.toLowerCase()));

export const DiscoverView = ({ onAddToPlaylist }) => {
  const { favorites, toggleFavorite, globalTracks } = useContext(LibraryContext) || {};
  const { currentTrack } = useContext(PlayerContext) || {};
  const catalogTracks = globalTracks || [];

  // Re-read persisted play history whenever a new track starts so the
  // "Most Played" shelf reflects the freshest listening session.
  const [historyTick, setHistoryTick] = useState(0);
  useEffect(() => {
    setHistoryTick((tick) => tick + 1);
  }, [currentTrack?.id]);

  const [activeGenre, setActiveGenre] = useState('All');

  const mostPlayed = useMemo(
    () => getTopPlayed(12).filter((entry) => entry.id),
    [historyTick]
  );

  const topGenres = useMemo(() => getTopGenres(3), [historyTick]);

  const tailoredTracks = useMemo(() => {
    if (topGenres.length === 0) return [];
    return catalogTracks.filter((track) =>
      topGenres.some((genre) => genreMatches(track, genre))
    );
  }, [catalogTracks, topGenres, historyTick]);

  const genreCatalogue = useMemo(() => {
    if (activeGenre === 'All') return catalogTracks;
    return catalogTracks.filter((track) => genreMatches(track, activeGenre));
  }, [catalogTracks, activeGenre]);

  return (
    <div className="px-4 sm:px-6 md:px-10 pb-28 md:pb-10 space-y-6 sm:space-y-8 animate-fadeIn pt-2 sm:pt-4 select-none">
      {/* Header */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-sky-950 via-[#0b1220] to-black border border-white/10 p-5 sm:p-7 shadow-2xl">
        <div className="absolute -top-14 -right-10 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg flex-shrink-0">
            <Compass className="w-6 h-6 text-black" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[10px] sm:text-xs font-bold mb-1.5">
              <Sparkles className="w-3 h-3" /> Personalized Discovery Engine
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              Discover Your Next Favorite
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Shelves built from your real play history, favorite genres, and the live JioSaavn catalogue.
            </p>
          </div>
        </div>
      </div>

      {/* Genre filter chips */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
            <span>Browse the Catalogue</span>
          </h3>
          <span className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest">
            {genreCatalogue.length} track{genreCatalogue.length === 1 ? '' : 's'} · instant filter
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {['All', ...GENRE_CHIPS].map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => setActiveGenre(genre)}
              aria-pressed={activeGenre === genre}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                activeGenre === genre
                  ? 'bg-sky-500 text-black border-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.5)]'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:border-sky-400/50 hover:text-white'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {genreCatalogue.length === 0 ? (
          <p className="text-sm text-zinc-500 bg-[#121212] border border-white/5 rounded-xl px-4 py-6 text-center">
            Nothing in your catalogue matches “{activeGenre}” yet — search JioSaavn to pull fresh tracks in.
          </p>
        ) : (
          <div className="space-y-1.5 sm:space-y-2">
            {genreCatalogue.slice(0, 30).map((track, idx) => (
              <TrackRow
                key={`genre-${track.id}`}
                track={track}
                index={idx}
                queue={genreCatalogue}
                onToggleFavorite={toggleFavorite}
                isFavorite={favorites?.includes(track.id)}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </div>
        )}
      </div>

      {/* Most Played shelf */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span>Most Played</span>
          </h3>
          <span className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest">
            By play frequency
          </span>
        </div>

        {mostPlayed.length === 0 ? (
          <div className="flex flex-col items-center text-center text-zinc-500 bg-[#121212] border border-white/5 rounded-2xl px-6 py-8 space-y-2">
            <Music2 className="w-8 h-8 text-orange-400/60" />
            <p className="text-sm font-semibold text-zinc-300">No listening history yet</p>
            <p className="text-xs">Play a few tracks and your most replayed songs will land here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {mostPlayed.slice(0, 8).map((track) => (
              <TrackCard
                key={`most-${track.id}`}
                track={track}
                queue={mostPlayed}
                onToggleFavorite={toggleFavorite}
                isFavorite={favorites?.includes(track.id)}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tailored To You shelf */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-fuchsia-400" />
            <span>Tailored To You</span>
          </h3>
          {topGenres.length > 0 && (
            <span className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest">
              {topGenres.join(' · ')}
            </span>
          )}
        </div>

        {tailoredTracks.length === 0 ? (
          <div className="flex flex-col items-center text-center text-zinc-500 bg-[#121212] border border-white/5 rounded-2xl px-6 py-8 space-y-2">
            <Loader2 className="w-7 h-7 text-fuchsia-400/60" />
            <p className="text-sm font-semibold text-zinc-300">Learning your taste…</p>
            <p className="text-xs">
              Your top 3 listened genres will shape this shelf once you've played a few tracks.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2">
            {tailoredTracks.slice(0, 20).map((track, idx) => (
              <TrackRow
                key={`tailored-${track.id}`}
                track={track}
                index={idx}
                queue={tailoredTracks}
                onToggleFavorite={toggleFavorite}
                isFavorite={favorites?.includes(track.id)}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverView;
