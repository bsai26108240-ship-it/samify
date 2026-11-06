import React from 'react';
import { X } from 'lucide-react';

export const ModalOverlay = ({ onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
    <div className="absolute inset-0" onClick={onClose} />
    <div 
      className="relative bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 w-[92vw] sm:w-full max-w-md shadow-2xl z-10" 
      onClick={e => e.stopPropagation()}
    >
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 text-zinc-500 hover:text-white transition p-1"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
      {children}
    </div>
  </div>
);
