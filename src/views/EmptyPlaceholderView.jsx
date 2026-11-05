import React from 'react';

export const EmptyPlaceholderView = ({ title, description, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-10 animate-fadeIn opacity-70 pt-20">
    <Icon className="w-20 h-20 text-emerald-500/50 mb-6" />
    <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
    <p className="text-zinc-400">{description}</p>
  </div>
);

