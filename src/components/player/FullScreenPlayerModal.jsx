import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Heart,
  PlusCircle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Share2,
  ListMusic,
  Check,
  Download,
  Loader2,
  Mic2,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { KaraokeLyricsModal } from '@/components/KaraokeLyricsModal';
import { useTrackLyrics, getActiveLyricIndex } from '@/hooks/useTrackLyrics';
import { extractPalette, DEFAULT_GRADIENT_PALETTE } from '@/utils/colorExtract';

const ARTIST_FOLLOWS_KEY = 'samify_artist_follows';

const readArtistFollows = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ARTIST_FOLLOWS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const FullScreenPlayerModal = ({
  isOpen,
  onClose,
  onOpenAddToPlaylist,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    isShuffle,
    setIsShuffle,
    isRepeat,
    setIsRepeat,
    isDownloaded,
    isDownloading,
    handleDownloadToggle,
  } = usePlayer();

  const [liked, setLiked] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);
  const [isKaraokeOpen, setIsKaraokeOpen] = useState(false);
  const [followingArtist, setFollowingArtist] = useState(() =>
    readArtistFollows().includes(currentTrack?.artist)
  );
  const [palette, setPalette] = useState(null);

  const lyricsScrollRef = useRef(null);
  const activeLineRef = useRef(null);

  // Resolve synced lyrics once and reuse them for the overlay + karaoke window.
  const { lyrics, loading: lyricsLoading } = useTrackLyrics(currentTrack);
  const activeLyricIndex = getActiveLyricIndex(lyrics, currentTime);
  const activeLyric = activeLyricIndex >= 0 ? lyrics[activeLyricIndex] : lyrics[0] || null;
  const nextLyric = activeLyricIndex >= 0 ? lyrics[activeLyricIndex + 1] || null : null;

  // Regenerate the gradient mesh whenever the artwork changes.
  useEffect(() => {
    if (!isOpen || !currentTrack) return undefined;
    let cancelled = false;
    setPalette(null);
    extractPalette(currentTrack.coverUrl || currentTrack.coverArt).then((colors) => {
      if (!cancelled) setPalette(colors);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentTrack?.coverUrl, currentTrack?.coverArt]);

  const artist = currentTrack?.artist || '';
  useEffect(() => {
    setFollowingArtist(readArtistFollows().includes(artist));
  }, [artist]);

  const toggleArtistFollow = () => {
    if (!artist) return;
    setFollowingArtist((prev) => {
      const next = !prev;
      const follows = new Set(readArtistFollows());
      if (next) follows.add(artist);
      else follows.delete(artist);
      try {
        localStorage.setItem(ARTIST_FOLLOWS_KEY, JSON.stringify(Array.from(follows)));
      } catch {}
      return next;
    });
  };

  // Keep the active lyric line centered in the overlay's scroll viewport.
  useEffect(() => {
    if (!showLyrics || !isOpen) return undefined;
    if (!activeLineRef.current) return undefined;

    const raf = requestAnimationFrame(() => {
      activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    return () => cancelAnimationFrame(raf);
  }, [activeLyricIndex, showLyrics, isOpen, currentTrack?.id]);

  if (!isOpen || !currentTrack) return null;

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const remainingTime = duration ? duration - currentTime : 0;
  const colors = palette || DEFAULT_GRADIENT_PALETTE;
  const [c1, c2, c3] = colors;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTrack.title,
          text: `Listening to ${currentTrack.title} by ${currentTrack.artist} on Samify!`,
          url: window.location.href,
        });
      } catch (err) {
        console.warn('Share cancelled or failed:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden text-white transition-all duration-300 pt-safe pb-safe">
      {/* Dynamic gradient color mesh generated from the album cover palette */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{ background: `linear-gradient(155deg, ${c1} 0%, ${c3} 55%, #050505 100%)` }}
        />
        <div
          className="absolute -top-[30%] -left-[20%] w-[70vmax] h-[70vmax] rounded-full opacity-70 blur-[110px] transition-all duration-700"
          style={{ background: c2 }}
        />
        <div
          className="absolute top-[25%] -right-[25%] w-[60vmax] h-[60vmax] rounded-full opacity-60 blur-[110px] transition-all duration-700"
          style={{ background: c1 }}
        />
        <div
          className="absolute -bottom-[30%] left-[15%] w-[65vmax] h-[65vmax] rounded-full opacity-55 blur-[120px] transition-all duration-700"
          style={{ background: c3 }}
        />
        {/* Readability scrim */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      {/* Top Bar Header */}
      <div className="flex-shrink-0 relative z-10 flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-4">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition text-white/70 hover:text-white"
          aria-label="Collapse Player"
        >
          <ChevronDown className="w-7 h-7" />
        </button>

        <div className="flex flex-col items-center max-w-[60%]">
          <span className="text-[10px] uppercase tracking-widest text-white/55 font-semibold">
            PLAYING FROM ALBUM
          </span>
          <span className="text-xs font-bold text-white truncate w-full text-center">
            {currentTrack.album || 'Samify Radio'}
          </span>
        </div>

        <button
          className="p-2 -mr-2 rounded-full hover:bg-white/10 transition text-white/70 hover:text-white"
          aria-label="More Options"
        >
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      {/* Main Player Canvas */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col px-4 sm:px-6 max-w-md mx-auto w-full">
        {/* Scrollable upper content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide pb-2">
          {showLyrics ? (
            <div
              ref={lyricsScrollRef}
              className="h-full min-h-[30vh] overflow-y-auto overscroll-contain scrollbar-hide"
              aria-label="Synced lyrics"
            >
              <div className="py-8 space-y-6 sm:space-y-8 text-center">
                {lyricsLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-white/60">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-300 mb-4" />
                    <p className="text-sm font-semibold">Loading synced lyrics…</p>
                  </div>
                ) : lyrics && lyrics.length > 0 ? (
                  lyrics.map((line, index) => {
                    const isActive = index === activeLyricIndex;
                    const isPassed = index < activeLyricIndex;

                    return (
                      <button
                        type="button"
                        key={`${index}-${line.time}`}
                        ref={isActive ? activeLineRef : null}
                        onClick={() => seek(line.time)}
                        aria-current={isActive ? 'true' : undefined}
                        className={`block w-full text-center leading-snug tracking-tight transition-all duration-300 cursor-pointer select-none py-1 ${
                          isActive
                            ? 'text-4xl sm:text-5xl md:text-6xl font-bold scale-105 text-transparent bg-clip-text bg-gradient-to-r from-[#00f2fe] to-[#00d2ff] drop-shadow-[0_0_12px_rgba(0,242,254,0.6)]'
                            : isPassed
                              ? 'text-2xl sm:text-3xl font-black text-white/35 hover:text-white/70'
                              : 'text-2xl sm:text-3xl font-black text-white/60 hover:text-white'
                        }`}
                      >
                        {line.text}
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-white/55">
                    <Mic2 className="w-12 h-12 mb-4 text-cyan-300/60" />
                    <h3 className="text-xl font-bold text-white mb-1">No lyrics available</h3>
                    <p className="text-sm">Enjoy the audio vibes of {currentTrack.title}.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Cover Artwork Container */}
              <div className="flex justify-center mb-4">
                <div
                  className="relative w-full aspect-square max-h-[35vh] rounded-2xl overflow-hidden shadow-2xl group border border-white/10"
                  style={{ maxWidth: 'min(100%, 30dvh)' }}
                >
                  <img
                    src={currentTrack.coverUrl || '/default-cover.png'}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover transform transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition" />
                </div>
              </div>

              {/* Lyrics preview card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowLyrics(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setShowLyrics(true);
                  }
                }}
                aria-label="Open the lyrics overlay"
                className="w-full bg-black/35 border border-white/10 backdrop-blur-lg rounded-xl p-3.5 mb-4 relative overflow-hidden group cursor-pointer transition hover:border-cyan-400/50 hover:bg-black/45 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Lyrics Preview
                  </span>
                  <span className="text-[10px] text-cyan-200/80 font-semibold flex items-center gap-0.5">
                    Tap for lyrics <ChevronRight className="w-3 h-3" />
                  </span>
                </div>

                {lyricsLoading ? (
                  <p className="text-sm font-semibold text-white/70 leading-relaxed flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading synced lyrics…
                  </p>
                ) : activeLyric ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white leading-relaxed line-clamp-2 drop-shadow-[0_0_12px_rgba(0,242,254,0.35)]">
                      {activeLyric.text}
                    </p>
                    {nextLyric && (
                      <p className="text-xs text-white/40 leading-relaxed line-clamp-1">
                        {nextLyric.text}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-white/70 leading-relaxed">
                    No synced lyrics found for this track.
                  </p>
                )}

                <div className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-300/70">
                  <Mic2 className="w-3 h-3" /> Live synced lyrics
                </div>
              </div>

              {/* Track Title & Quick Actions Row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col pr-4 overflow-hidden">
                  <h1 className="text-xl sm:text-2xl font-bold text-white truncate leading-tight drop-shadow-[0_0_18px_rgba(0,0,0,0.6)]">
                    {currentTrack.title}
                  </h1>
                  <p className="text-sm sm:text-base text-white/60 font-medium truncate mt-1">
                    {currentTrack.artist}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <button
                    onClick={() => setShowLyrics(!showLyrics)}
                    className={`p-1.5 transition ${showLyrics ? 'text-cyan-300' : 'text-white/60 hover:text-cyan-300'}`}
                    aria-label="Toggle Lyrics"
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setLiked(!liked)}
                    className="p-1.5 text-white/60 hover:text-rose-400 transition"
                    aria-label="Like Track"
                  >
                    <Heart className={`w-6 h-6 ${liked ? 'fill-rose-400 text-rose-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => onOpenAddToPlaylist && onOpenAddToPlaylist(currentTrack)}
                    className="p-1.5 text-white/60 hover:text-white transition"
                    aria-label="Add to Playlist"
                  >
                    <PlusCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Artist Exploration Discovery Card */}
              <div className="w-full bg-black/35 border border-white/10 rounded-2xl p-4 backdrop-blur-md mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                    About the Artist
                  </span>
                  <button
                    type="button"
                    onClick={toggleArtistFollow}
                    aria-pressed={followingArtist}
                    className={`flex items-center gap-1 text-xs font-bold cursor-pointer transition px-3 py-1 rounded-full border ${
                      followingArtist
                        ? 'text-cyan-300 border-cyan-400/40 bg-cyan-400/10'
                        : 'text-cyan-300 border-cyan-400/25 hover:bg-cyan-400/10'
                    }`}
                  >
                    {followingArtist ? (
                      <>
                        <UserCheck className="w-3 h-3" /> Following
                      </>
                    ) : (
                      'Follow'
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-black/40 flex-shrink-0">
                    <img
                      src={currentTrack.coverUrl || '/default-cover.png'}
                      alt={currentTrack.artist}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-base font-bold text-white">{currentTrack.artist}</h3>
                    <p className="text-xs text-white/50 mt-0.5 line-clamp-1">
                      Explore popular tracks, albums, and similar radio stations.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pinned bottom transport: centered controls directly under the timeline */}
        <div className="flex-shrink-0 relative z-10 pt-1 pb-1">
          {/* Track Title (compact, when the lyrics overlay is up) */}
          {showLyrics && (
            <div className="flex items-center justify-between mb-2 text-left">
              <div className="min-w-0 pr-3">
                <h2 className="text-sm font-bold text-white truncate drop-shadow-[0_0_12px_rgba(0,0,0,0.7)]">
                  {currentTrack.title}
                </h2>
                <p className="text-[11px] text-white/50 truncate">{currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowLyrics(!showLyrics)}
                  className="p-1.5 text-white/60 hover:text-cyan-300 transition"
                  aria-label="Show artwork"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setLiked(!liked)}
                  className="p-1.5 text-white/60 hover:text-rose-400 transition"
                  aria-label="Like Track"
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-rose-400 text-rose-400' : ''}`} />
                </button>
                <button
                  onClick={() => onOpenAddToPlaylist && onOpenAddToPlaylist(currentTrack)}
                  className="p-1.5 text-white/60 hover:text-white transition"
                  aria-label="Add to Playlist"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Timeline scrubber */}
          <div className="w-full mb-2 sm:mb-3">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime || 0}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full h-1.5 bg-white/15 accent-cyan-400 rounded-lg cursor-pointer transition"
              aria-label="Seek"
            />
            <div className="flex items-center justify-between mt-1 text-xs font-medium text-white/55">
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(remainingTime)}</span>
            </div>
          </div>

          {/* Centered large circular transport controls */}
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-2 transition ${isShuffle ? 'text-cyan-300' : 'text-white/55 hover:text-white'}`}
              aria-label="Toggle Shuffle"
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              onClick={playPrevious}
              className="p-2 text-white hover:text-white transition transform active:scale-90"
              aria-label="Previous Track"
            >
              <SkipBack className="w-9 h-9 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-[0_8px_30px_rgba(0,242,254,0.35)] transform transition active:scale-95 hover:scale-105"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </button>

            <button
              onClick={playNext}
              className="p-2 text-white hover:text-white transition transform active:scale-90"
              aria-label="Next Track"
            >
              <SkipForward className="w-9 h-9 fill-current" />
            </button>

            <button
              onClick={() => setIsRepeat(!isRepeat)}
              className={`p-2 transition ${isRepeat ? 'text-cyan-300' : 'text-white/55 hover:text-white'}`}
              aria-label="Toggle Repeat"
            >
              <Repeat className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Dock Action Row */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10 text-white/60">
            <button
              onClick={handleDownloadToggle}
              disabled={isDownloading}
              className={`flex items-center gap-1.5 text-xs font-semibold transition ${
                isDownloaded ? 'text-cyan-300' : 'hover:text-white'
              } ${isDownloading ? 'opacity-70 cursor-wait' : ''}`}
              aria-label={isDownloaded ? 'Remove offline download' : 'Download for offline playback'}
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isDownloaded ? (
                <Check className="w-4 h-4" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isDownloading ? 'Saving…' : isDownloaded ? 'Downloaded' : 'Download'}
            </button>

            <button onClick={handleShare} className="hover:text-white transition p-1" aria-label="Share Track">
              <Share2 className="w-5 h-5" />
            </button>

            <button onClick={() => setIsKaraokeOpen(true)} className="hover:text-cyan-300 transition p-1 flex items-center gap-1.5" aria-label="Open Queue">
              <Mic2 className="w-5 h-5" />
              <ListMusic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <KaraokeLyricsModal
        isOpen={isKaraokeOpen}
        onClose={() => setIsKaraokeOpen(false)}
        currentTrack={currentTrack}
        currentTime={currentTime}
        duration={duration}
        lyrics={lyrics}
        loading={lyricsLoading}
        onSeek={seek}
      />
    </div>
  );
};

export default FullScreenPlayerModal;
