import React, { useContext } from 'react';
import { Sparkles, TrendingUp, BarChart2 } from 'lucide-react';
import { LibraryContext } from '../contexts/LibraryContext';
import { AuthContext } from '../contexts/AuthContext';
import { TrackCard } from '../components/track/TrackCard';
import { TrackRow } from '../components/track/TrackRow';
import { MUSIC_CATALOGUE } from '../data/catalogue';

export const HomeView = ({ onAddToPlaylist }) => {
  const { user } = useContext(AuthContext);
  const { favorites, toggleFavorite, listeningStats } = useContext(LibraryContext);
  
  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Music Explorer';

  // Personalized Recommendation Logic (tailored per user)
  const userLikedGenres = MUSIC_CATALOGUE
    .filter(t => favorites.includes(t.id))
    .map(t => t.genre);

  const recommendedTracks = MUSIC_CATALOGUE.filter(t => 
    userLikedGenres.length > 0 ? userLikedGenres.includes(t.genre) : true
  );

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
          <div className="bg-black/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 w-full md:w-auto md:min-w-[240px] space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
              <span className="flex items-center space-x-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-400" /> 
                <span>Listening Time</span>
              </span>
              <span className="text-emerald-400 font-mono">{listeningStats?.minutesListened || 142}m</span>
            </div>
            <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ width: '68%' }} />
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-500 font-medium">
              Top Genre: <span className="text-zinc-300 font-bold">{listeningStats?.favoriteGenre || 'Synth-Pop'}</span>
            </p>
          </div>
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
              onToggleFavorite={toggleFavorite} 
              isFavorite={favorites.includes(track.id)} 
              onAddToPlaylist={onAddToPlaylist} 
            />
          ))}
        </div>
      </div>

      {/* Trending & Popular Releases */}
      <div>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span>Popular Hits</span>
          </h3>
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          {MUSIC_CATALOGUE.slice(4).map((track, idx) => (
            <TrackRow 
              key={track.id} 
              track={track} 
              index={idx} 
              queue={MUSIC_CATALOGUE} 
              onToggleFavorite={toggleFavorite} 
              isFavorite={favorites.includes(track.id)} 
              onAddToPlaylist={onAddToPlaylist} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};
