import React from 'react';
import { Users, Music } from 'lucide-react';

export const RightSidebar = () => {
  const friends = [
    { name: 'Alex', track: 'Blinding Lights', artist: 'The Weeknd', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' },
    { name: 'Jordan', track: 'God\'s Plan', artist: 'Drake', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100' },
    { name: 'Taylor', track: 'Passionfruit', artist: 'Drake', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' }
  ];

  return (
    <aside className="w-80 hidden lg:flex flex-col z-10 bg-[#0a0a0a] border-l border-white/5 h-[calc(100vh-96px)] overflow-y-auto scrollbar-hide relative">
      <div className="p-6 pt-10">
        <div className="flex items-center space-x-2 mb-6 text-zinc-400">
          <Users className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-bold text-white">Friend Activity</h3>
        </div>
        <div className="space-y-4">
          {friends.map((f, i) => (
            <div key={i} className="flex items-center space-x-4 p-3 rounded-2xl bg-[#121212] border border-white/5 hover:bg-[#1a1a1a] transition">
              <div className="relative w-12 h-12 rounded-full">
                <img src={f.avatar} alt={f.name} className="w-full h-full rounded-full object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#121212]"></div>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white truncate">{f.name}</h4>
                  <div className="flex items-end space-x-0.5 h-3">
                    <div className="w-1 bg-emerald-500 h-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 bg-emerald-500 h-2/3 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 bg-emerald-500 h-4/5 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <p className="text-xs text-zinc-400 truncate">{f.track}</p>
                <p className="text-[10px] text-zinc-500 truncate flex items-center gap-1"><Music className="w-3 h-3"/> {f.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
