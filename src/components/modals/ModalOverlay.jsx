import React from 'react';
import { X } from 'lucide-react';

export const ModalOverlay = ({ onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
    <div className="absolute inset-0" onClick={onClose} />
    <div className="relative bg-[#121212] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl z-10" onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition">
        <X className="w-5 h-5" />
      </button>
      {children}
    </div>
  </div>
);

