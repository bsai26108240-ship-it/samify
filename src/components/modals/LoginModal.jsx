import React, { useState } from 'react';
import { X, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginModal = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      login(email, password);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-8 w-[92vw] sm:w-full max-w-md shadow-2xl z-10 select-none">
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-zinc-500 hover:text-white transition p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Log In to Samify</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Access your personalized portal, saved favorites, and cloud playlists.
          </p>
        </div>

        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Email address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#333] text-white px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-[#333] text-white px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button 
            type="submit" 
            className="w-full bg-emerald-500 text-black font-bold py-3 rounded-full hover:bg-emerald-400 transition mt-4"
          >
            Log In Securely
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;

