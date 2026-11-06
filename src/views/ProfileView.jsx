import React, { useContext } from 'react';
import { User, LogOut, BarChart3, Clock, Flame, Music2, Heart } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { LibraryContext } from '../contexts/LibraryContext';
import { MUSIC_CATALOGUE } from '../data/catalogue';
import { TrackRow } from '../components/track/TrackRow';

export const ProfileView = ({ onAddToPlaylist }) => {
  const { user, signOut } = useContext(AuthContext);
  const { favorites, toggleFavorite, listeningStats } = useContext(LibraryContext);

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Music Fan';
  const email = user?.email || 'Guest User (Not logged in)';

  const likedTracks = MUSIC_CATALOGUE.filter(t => favorites.includes(t.id));

  // Days for listening chart
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartData = listeningStats?.weeklyData || [20, 35, 45, 15, 60, 80, 50];
  const maxMins = Math.max(...chartData, 1);

  return (
    <div className="px-10 pb-12 space-y-10 animate-fadeIn pt-4 select-none">
      {/* Profile Header */}
      <div className="flex items-center space-x-6 bg-gradient-to-r from-emerald-950/40 via-[#121212] to-black p-8 rounded-3xl border border-white/10 shadow-2xl">
        <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
          <img 
            src={`https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80`} 
            alt="User Avatar" 
            className="w-full h-full rounded-full object-cover" 
          />
        </div>
        <div className="flex-1">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Personal Music Account</span>
          <h1 className="text-4xl font-black text-white mt-1">{username}</h1>
          <p className="text-zinc-400 text-sm mt-1">{email}</p>
          
          <div className="flex items-center space-x-6 mt-4 text-xs text-zinc-300 font-semibold">
            <span className="flex items-center space-x-1.5"><Heart className="w-4 h-4 text-emerald-500 fill-emerald-500" /> <span>{favorites.length} Liked Tracks</span></span>
            <span className="flex items-center space-x-1.5"><Clock className="w-4 h-4 text-emerald-400" /> <span>{listeningStats.minutesListened} Mins Streamed</span></span>
          </div>
        </div>

        {user && (
          <button 
            onClick={signOut}
            className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-5 py-2.5 rounded-2xl transition font-bold text-sm border border-red-500/20"
          >
            <LogOut className="w-4 h-4" /> <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* User Listening Analytics & Graph */}
      <div className="bg-[#121212] rounded-3xl p-8 border border-white/5 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center space-x-1.5">
              <BarChart3 className="w-4 h-4" /> <span>Listening Analytics</span>
            </span>
            <h3 className="text-2xl font-extrabold text-white mt-1">Weekly Activity Graph</h3>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-4 py-2 rounded-xl border border-emerald-500/20">
            Top Genre: {listeningStats.favoriteGenre}
          </div>
        </div>

        {/* Listening Bar Graph */}
        <div className="h-44 flex items-end justify-between space-x-4 pt-6 px-4 border-b border-white/5 pb-4">
          {days.map((day, idx) => {
            const val = chartData[idx] || 10;
            const heightPct = Math.round((val / maxMins) * 100);
            return (
              <div key={day} className="flex-1 flex flex-col items-center space-y-2 group">
                <span className="text-[10px] text-emerald-400 font-mono opacity-0 group-hover:opacity-100 transition">{val}m</span>
                <div className="w-full bg-[#1a1a1a] rounded-t-xl h-32 flex items-end overflow-hidden">
                  <div 
                    className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-xl transition-all duration-500 group-hover:brightness-125" 
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 font-medium group-hover:text-white transition">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Saved Audio & Personal Recommendations */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <Music2 className="w-5 h-5 text-emerald-400" />
          <span>Saved Audio & Favorites</span>
        </h3>
        
        {likedTracks.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-[#121212] rounded-3xl border border-white/5">
            You haven't liked any songs yet. Browse discovering tracks to populate your personal account library!
          </div>
        ) : (
          <div className="space-y-2">
            {likedTracks.map((track, idx) => (
              <TrackRow 
                key={track.id} 
                track={track} 
                index={idx} 
                queue={likedTracks} 
                onToggleFavorite={toggleFavorite} 
                isFavorite={true} 
                onAddToPlaylist={onAddToPlaylist} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

