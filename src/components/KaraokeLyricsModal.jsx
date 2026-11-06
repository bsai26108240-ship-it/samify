import React, { useEffect, useState, useRef } from 'react';
import { fetchSyncedLyrics } from '../services/lyricsService';

export const KaraokeLyricsModal = ({ isOpen, onClose, currentTrack, currentTime }) => {
  const [lyrics, setLyrics] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const activeLineRef = useRef(null);

  useEffect(() => {
    if (currentTrack && isOpen) {
      setLoading(true);
      fetchSyncedLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration)
        .then((data) => {
          setLyrics(data || []);
          setLoading(false);
        });
    }
  }, [currentTrack, isOpen]);

  // Synchronize active karaoke line with currentTime audio playback
  useEffect(() => {
    if (!lyrics || lyrics.length === 0) return;
    const index = lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    });
    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
      activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, lyrics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col p-6 text-white overflow-hidden animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">{currentTrack?.title}</h2>
          <p className="text-sm text-gray-400">{currentTrack?.artist}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl p-1" aria-label="Close">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 py-12 px-4 no-scrollbar">
        {loading ? (
          <div className="text-center text-gray-500 animate-pulse mt-20">Loading Karaoke Lyrics...</div>
        ) : lyrics && lyrics.length > 0 ? (
          lyrics.map((line, idx) => (
            <p
              key={idx}
              ref={idx === activeIndex ? activeLineRef : null}
              className={`text-2xl md:text-4xl font-extrabold transition-all duration-300 transform ${
                idx === activeIndex
                  ? 'text-emerald-400 scale-105 opacity-100 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                  : 'text-gray-500 opacity-40 hover:opacity-70'
              }`}
            >
              {line.text}
            </p>
          ))
        ) : (
          <div className="text-center text-gray-500 mt-20">No synchronized lyrics available for this track.</div>
        )}
      </div>
    </div>
  );
};

export default KaraokeLyricsModal;

