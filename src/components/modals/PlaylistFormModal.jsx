import React, { useState } from 'react';
import { ModalOverlay } from './ModalOverlay';

export const PlaylistFormModal = ({ onClose, onSubmit, initialData = null }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [desc, setDesc] = useState(initialData?.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), desc.trim());
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-2xl font-bold text-white mb-6">{initialData ? 'Edit Playlist' : 'Create Playlist'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Name</label>
          <input 
            type="text" 
            autoFocus
            value={title} 
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-[#1a1a1a] text-white px-4 py-3 rounded-xl border border-white/5 focus:outline-none focus:border-emerald-500 transition"
            placeholder="My Awesome Playlist"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Description</label>
          <textarea 
            value={desc} 
            onChange={e => setDesc(e.target.value)}
            className="w-full bg-[#1a1a1a] text-white px-4 py-3 rounded-xl border border-white/5 focus:outline-none focus:border-emerald-500 transition resize-none h-24"
            placeholder="Add an optional description"
          />
        </div>
        <button 
          type="submit" 
          disabled={!title.trim()}
          className="w-full bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {initialData ? 'Save Changes' : 'Create Playlist'}
        </button>
      </form>
    </ModalOverlay>
  );
};

