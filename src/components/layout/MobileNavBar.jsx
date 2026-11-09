import React from 'react';
import { Sparkles, Search, Library, Heart, User } from 'lucide-react';

export const MobileNavBar = ({ currentView, setCurrentView }) => {
  const tabs = [
    { id: 'discover', label: 'Discover', icon: Sparkles },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'liked', label: 'Liked', icon: Heart },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id || (tab.id === 'library' && currentView.startsWith('playlist_'));
        return (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              isActive
                ? 'text-emerald-400 font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5] drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'stroke-[1.75]'}`} />
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

