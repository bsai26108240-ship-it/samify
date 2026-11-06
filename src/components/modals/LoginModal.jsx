import React, { useState } from 'react';
import { X, Lock, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginModal = ({ isOpen, onClose, onContinueAsGuest }) => {
  const { login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
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

  const handleGuest = () => {
    if (onContinueAsGuest) {
      onContinueAsGuest();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
      <div className="absolute inset-0" onClick={handleGuest} />
      <div className="relative bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-8 w-[92vw] sm:w-full max-w-md shadow-2xl z-10 select-none">
        <button 
          onClick={handleGuest} 
          className="absolute top-5 right-5 text-zinc-500 hover:text-white transition p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            {isSignUp ? 'Create your Samify Account' : 'Welcome to Samify'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Access your personalized portal, saved favorites, and cloud-synced playlists across all devices.
          </p>
        </div>

        {/* Login / Sign Up Toggle */}
        <div className="flex bg-[#252525] p-1 rounded-xl mb-5 border border-white/5">
          <button 
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${!isSignUp ? 'bg-emerald-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
          >
            Log In
          </button>
          <button 
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${isSignUp ? 'bg-emerald-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Email</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#262626] text-white text-xs px-4 py-3 rounded-xl border border-white/5 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#262626] text-white text-xs px-4 py-3 rounded-xl border border-white/5 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-500 text-black font-extrabold py-3 rounded-xl hover:bg-emerald-400 transition mt-2 shadow-[0_4px_15px_rgba(16,185,129,0.3)] text-sm flex items-center justify-center space-x-1.5"
          >
            <span>{isSignUp ? 'Create Free Account' : 'Log In Securely'}</span>
          </button>

          <button 
            type="button"
            onClick={handleGuest}
            className="w-full bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white font-semibold py-2.5 rounded-xl border border-white/10 transition text-xs flex items-center justify-center space-x-1.5"
          >
            <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Continue as Guest</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
