import React from 'react';
import { ModalOverlay } from './ModalOverlay';

export const ConfirmDeleteModal = ({ onClose, onConfirm, title }) => (
  <ModalOverlay onClose={onClose}>
    <h2 className="text-2xl font-bold text-white mb-4">Delete Playlist?</h2>
    <p className="text-zinc-400 text-sm mb-6">Are you sure you want to delete "{title}"? This action cannot be undone.</p>
    <div className="flex space-x-4">
      <button onClick={onClose} className="flex-1 bg-[#1a1a1a] text-white font-bold py-3 rounded-xl hover:bg-[#222] transition">Cancel</button>
      <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 bg-red-500/20 text-red-500 font-bold py-3 rounded-xl hover:bg-red-500 hover:text-white transition">Delete</button>
    </div>
  </ModalOverlay>
);

