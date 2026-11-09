import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  BarChart2,
  Loader2,
  AlertCircle,
  Users,
  X,
} from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';
import { AuthContext } from '../contexts/AuthContext';
import { TrackCard } from '../components/track/TrackCard';
import { TrackRow } from '../components/track/TrackRow';
import { ListeningStatsCard } from '../components/dashboard/ListeningStatsCard';
import { getTrendingCharts, getArtistSongs } from '../services/musicApi';

const CURATED_ARTISTS = [
  { name: 'The Weeknd', tagline: 'Synth-pop icon', gradient: 'from-amber-500/50 to-rose-900/70' },
  { name: 'Drake', tagline: 'OVO hitmaker', gradient: 'from-sky-500/50 to-indigo-900/70' },
  { name: 'Travis Scott', tagline: 'Astroworld', gradient: 'from-orange-500/50 to-stone-900/70' },
  { name: 'Don Toliver', tagline: 'Psycho R&B', gradient: 'from-fuchsia-500/50 to-purple-950/70' },
  { name: 'PARTYNEXTDOOR', tagline: 'PND vibes', gradient: 'from-teal-500/50 to-emerald-950/70' },
  { name: 'Metro Boomin', tagline: 'Super producer', gradient: 'from-red-500/50 to-zinc-950/70' },
  { name: 'SZA', tagline: 'SOS songstress', gradient: 'from-lime-500/50 to-green-950/70' },
  { name: '21 Savage', tagline: 'Savage mode', gradient: 'from-slate-400/50 to-slate-950/80' },
];

const mergeUniqueTracks = (tracks) => {
  const seen = new Set();
  return tracks.filter((track) => {
    if (!track?.id || seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
};

const getInitials = (name) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const HomeView = ({ onAddToPlaylist }) => {
  const { user } = useContext(AuthContext);
  const { favorites, toggleFavorite, listeningStats, globalTracks } = useContext(LibraryContext);

  const tracks = globalTracks || [];
  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Music Explorer';

  const [trendingTracks, setTrendingTracks] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistTracks, setArtistTracks] = useState([]);
  const [artistLoading, setArtistLoading] = useState(false);
  const [artistError, setArtistError] = useState('');
  const artistSectionRef = useRef(null);

  // Pull the live JioSaavn charts once on mount.
  useEffect(() => {
    let isActive = true;
    setTrendingLoading(true);

    getTrendingCharts()
      .then(({ tracks: chartTracks }) => {
        if (isActive && Array.isArray(chartTracks) && chartTracks.length > 0) {
          setTrendingTracks(chartTracks);
        }
      })
      .catch(() => {
        // Local catalogue remains the fallback.
      })
      .finally(() => {
        if (isActive) setTrendingLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  // Use a local cover for artists that exist in the library, otherwise the
  // gradient/initial card acts as the artwork.
  const artistImages = useMemo(() => {
    const images = {};

    tracks.forEach((track) => {
      const artistName = (track.artist || '').toLowerCase();
      CURATED_ARTISTS.forEach((artist) => {
        if (!images[artist.name] && artistName.includes(artist.name.toLowerCase())) {
          images[artist.name] = track.coverUrl || track.coverArt;
        }
      });
    });

    return images;
  }, [tracks]);

  // Personalized Recommendation Logic (tailored per user)
  const userLikedGenres = tracks
    .filter((track) => favorites.includes(track.id))
    .map((track) => track.genre);

  const recommendedTracks = tracks.filter((track) =>
    userLikedGenres.length > 0 ? userLikedGenres.includes(track.genre) : true
  );

  const popularHits = trendingTracks.length > 0 ? trendingTracks : tracks;

  const openArtist = async (artist) => {
    const artistName = artist.name;
    setSelectedArtist(artistName);
    setArtistError('');
    setArtistLoading(true);

    const localMatches = tracks.filter((track) =>
      (track.artist || '').toLowerCase().includes(artistName.toLowerCase())
    );
    setArtistTracks(localMatches);

    try {
      const apiTracks = await getArtistSongs(artistName, {
        limit: 50,
        withLyrics: false,
        throwOnError: false,
      });

      const merged = mergeUniqueTracks([...localMatches, ...(apiTracks || [])]);
      setArtistTracks(merged);

      if (merged.length === 0) {
        setArtistError(`No tracks found for ${artistName} right now.`);
      } else {
        setArtistError('');
      }
    } catch {
      if (localMatches.length === 0) {
        setArtistError(`No tracks found for ${artistName} right now.`);
      }
    } finally {
      setArtistLoading(false);
    }
  };

  useEffect(() => {
    if (selectedArtist && artistSectionRef.current) {
      artistSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedArtist]);

  return (
    <div className="px-4 sm:px-6 md:px-10 pb-28 md:pb-10 space-y-6 sm:space-y-8 md:space-y-10 animate-fadeIn select-none pt-2 sm:pt-4">
      {/* Personalized Welcome & Listening Activity Banner */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950 via-[#121212] to-black border border-white/10 p-5 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalized Portal</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
              Welcome Back, {username}!
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-lg">
              Here are your custom song recommendations, listening activity graph, and top trending streams.
            </p>
          </div>

          {/* User Mini Listening Graph Card */}
          <ListeningStatsCard />
        </div>
      </div>

      {/* Personalized Recommendations for Logged-In User */}
      <div>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-xl sm:text-2xl font-extrabold text-white">
            Recommended For You
          </h3>
          <span className="text-[10px] sm:text-xs text-emerald-400 font-bold uppercase tracking-widest">
            Tailored to you
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6">
          {recommendedTracks.slice(0, 4).map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              queue={tracks}
              onToggleFavorite={toggleFavorite}
              isFavorite={favorites.includes(track.id)}
              onAddToPlaylist={onAddToPlaylist}
            />
          ))}
        </div>
      </div>

      {/* Curated Artist Shelves */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Curated Artists</span>
          </h3>
          <span className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest">
            Tap for Top 50
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {CURATED_ARTISTS.map((artist) => {
            const image = artistImages[artist.name];

            return (
              <button
                type="button"
                key={artist.name}
                onClick={() => openArtist(artist)}
                className="group relative flex-shrink-0 w-28 sm:w-32 rounded-2xl overflow-hidden border border-white/10 bg-[#121212] hover:border-emerald-500/40 transition text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
              >
                <div className="relative aspect-square w-full overflow-hidden">
                  {image ? (
                    <img
                      src={image}
                      alt={artist.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${artist.gradient} flex items-center justify-center`}>
                      <span className="text-2xl font-black text-white/90">
                        {getInitials(artist.name)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <span className="absolute bottom-2 left-2 right-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                    Top 50
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition">
                    {artist.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">{artist.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Artist Catalogue */}
      {selectedArtist && (
        <div
          ref={artistSectionRef}
          className="scroll-mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Artist Catalogue
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">{selectedArtist}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {artistLoading
                  ? 'Loading JioSaavn catalogue…'
                  : `${artistTracks.length} tracks · Top hits`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedArtist(null)}
              className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition px-2 py-1 rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>

          {artistLoading && (
            <div className="flex items-center gap-2 text-xs text-emerald-300 mb-3">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching 50+ songs from JioSaavn…
            </div>
          )}

          {artistError && artistTracks.length === 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{artistError}</span>
            </div>
          )}

          {artistTracks.length > 0 ? (
            <div className="space-y-1.5 sm:space-y-2">
              {artistTracks.map((track, idx) => (
                <TrackRow
                  key={`${selectedArtist}-${track.id}`}
                  track={track}
                  index={idx}
                  queue={artistTracks}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes(track.id)}
                  onAddToPlaylist={onAddToPlaylist}
                />
              ))}
            </div>
          ) : (
            !artistLoading && (
              <p className="text-sm text-zinc-500 py-6 text-center">
                No tracks available for this artist yet.
              </p>
            )
          )}
        </div>
      )}

      {/* Trending & Popular Releases */}
      <div>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span>Popular Hits</span>
          </h3>
          {trendingTracks.length > 0 && (
            <span className="text-[10px] sm:text-xs text-emerald-400 font-bold uppercase tracking-widest">
              Live charts
            </span>
          )}
        </div>

        {trendingLoading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400 py-6">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            Loading JioSaavn charts…
          </div>
        ) : (
          <>
            {trendingTracks.length === 0 && (
              <p className="text-[10px] text-zinc-500 mb-2">
                Live JioSaavn charts are offline — showing your local catalogue.
              </p>
            )}
            <div className="space-y-1.5 sm:space-y-2">
              {popularHits.slice(0, 30).map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={idx}
                  queue={popularHits}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes(track.id)}
                  onAddToPlaylist={onAddToPlaylist}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
