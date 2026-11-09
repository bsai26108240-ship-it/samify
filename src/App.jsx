import React, { useState, useContext, useEffect, useRef } from 'react';
import { PlayCircle } from 'lucide-react';
import { LibraryContext, LibraryProvider } from './contexts/LibraryContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { AuthContext, AuthProvider, AuthModal } from './contexts/AuthContext';
import { SearchProvider, useSearch } from './contexts/SearchContext';
import { NavigationSidebar } from './components/layout/NavigationSidebar';
import { RightSidebar } from './components/layout/RightSidebar';
import { Topbar } from './components/layout/Topbar';
import { BottomPlayer } from './components/layout/BottomPlayer';
import { MobileNavBar } from './components/layout/MobileNavBar';
import { PlaylistFormModal } from './components/modals/PlaylistFormModal';
import { AddToPlaylistModal } from './components/modals/AddToPlaylistModal';
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal';
import { FullScreenPlayerModal } from './components/player/FullScreenPlayerModal';
import { usePlayer } from './contexts/PlayerContext';
import { HomeView } from './views/HomeView';
import { DiscoverView } from './views/DiscoverView';
import { SearchView } from './views/SearchView';
import { LikedSongsView } from './views/LikedSongsView';
import { LibraryView } from './views/LibraryView';
import { PlaylistDetailView } from './views/PlaylistDetailView';
import { LyricsView } from './views/LyricsView';
import { ProfileView } from './views/ProfileView';

const MainApp = () => {
  const [currentView, setCurrentView] = useState('home');
  const { searchQuery, setSearchQuery } = useSearch();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { user } = useContext(AuthContext) || {};
  const { toastMessage, triggerToast, playlists, createPlaylist, updatePlaylist, deletePlaylist, addTrackToPlaylist } = useContext(LibraryContext);
  const { isExpanded, setIsExpanded } = usePlayer();

  const [guestMode, setGuestMode] = useState(() => {
    try {
      return sessionStorage.getItem('samify_guest_session') === 'true';
    } catch {
      return false;
    }
  });

  // Auth Gate: Check if user session is unauthenticated on launch
  const showAuthGate = !user && !guestMode;

  // Welcome back toast when user is present
  const welcomedRef = useRef(false);
  useEffect(() => {
    if (user && !welcomedRef.current) {
      welcomedRef.current = true;
      const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Music Fan');
      if (triggerToast) {
        triggerToast(`Welcome back, ${displayName}!`);
      }
    }
  }, [user, triggerToast]);

  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });
  const closeModal = () => setModalState({ isOpen: false, type: null, data: null });
  
  const openCreatePlaylist = () => setModalState({ isOpen: true, type: 'form', data: null });
  const openEditPlaylist = (playlist) => setModalState({ isOpen: true, type: 'form', data: playlist });
  const openDeletePlaylist = (playlist) => setModalState({ isOpen: true, type: 'delete', data: playlist });
  const openAddToPlaylist = (trackId) => setModalState({ isOpen: true, type: 'add_to_playlist', data: trackId });

  const renderCurrentView = () => {
    if (currentView.startsWith('playlist_')) {
      const plId = currentView.split('_')[1];
      const playlist = playlists.find(p => p.id === plId);
      return (
        <PlaylistDetailView 
          playlist={playlist} 
          onEdit={openEditPlaylist} 
          onDelete={openDeletePlaylist} 
          setCurrentView={setCurrentView} 
        />
      );
    }
    switch (currentView) {
      case 'home': 
        return <HomeView onAddToPlaylist={openAddToPlaylist} />;
      case 'discover':
        return <DiscoverView onAddToPlaylist={openAddToPlaylist} />;
      case 'liked': 
        return <LikedSongsView onAddToPlaylist={openAddToPlaylist} />;
      case 'search': 
        return (
          <SearchView 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            onAddToPlaylist={openAddToPlaylist} 
          />
        );
      case 'library': 
        return (
          <LibraryView 
            setCurrentView={setCurrentView} 
            openCreatePlaylist={openCreatePlaylist} 
          />
        );
      case 'lyrics': 
        return <LyricsView />;
      case 'profile': 
        return <ProfileView onAddToPlaylist={openAddToPlaylist} />;
      default: 
        return <HomeView onAddToPlaylist={openAddToPlaylist} />;
    }
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden select-none relative">
      {/* Background Cyber Wallpaper */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none z-0 filter blur-xl scale-105"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&q=80')` }}
      />
      
      {/* Ambient Glow Orbs */}
      <div className="absolute top-[-10%] left-[25%] w-[700px] h-[700px] bg-emerald-600/10 rounded-full blur-[160px] pointer-events-none z-0 animate-pulse" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-[0_0_25px_rgba(16,185,129,0.6)] font-extrabold text-xs sm:text-sm flex items-center space-x-2 animate-fadeIn max-w-[90vw] truncate">
          <PlayCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Navigation Sidebar (Desktop permanent + Mobile slide-out drawer) */}
      <NavigationSidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        openCreatePlaylist={openCreatePlaylist}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col z-10 relative h-[calc(100vh-114px)] md:h-[calc(100vh-96px)] overflow-y-auto overflow-x-hidden scrollbar-hide pb-36 md:pb-24">
        <Topbar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          openAuthModal={() => setAuthModalOpen(true)}
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        />
        {renderCurrentView()}
      </main>

      {/* Right Desktop Overview Sidebar */}
      <RightSidebar />

      {/* Bottom Music Player Bar */}
      <BottomPlayer currentView={currentView} setCurrentView={setCurrentView} />

      {/* Full-Screen Music Player Modal */}
      <FullScreenPlayerModal 
        isOpen={isExpanded} 
        onClose={() => setIsExpanded(false)} 
        onOpenAddToPlaylist={(track) => openAddToPlaylist(track?.id)}
      />

      {/* Mobile Bottom Navigation Bar (Home, Search, Library, Liked, Profile) */}
      <MobileNavBar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Auth Gate / Login Modal */}
      <AuthModal 
        isOpen={authModalOpen || showAuthGate} 
        onClose={() => setAuthModalOpen(false)} 
        onContinueAsGuest={() => {
          setGuestMode(true);
          try { sessionStorage.setItem('samify_guest_session', 'true'); } catch {}
          setAuthModalOpen(false);
        }}
      />

      {/* Playlist Modals */}
      {modalState.isOpen && modalState.type === 'form' && (
        <PlaylistFormModal 
          initialData={modalState.data} 
          onClose={closeModal} 
          onSubmit={(title, desc) => {
            if (modalState.data) updatePlaylist(modalState.data.id, title, desc);
            else createPlaylist(title, desc);
          }} 
        />
      )}
      {modalState.isOpen && modalState.type === 'delete' && (
        <ConfirmDeleteModal 
          title={modalState.data.title}
          onClose={closeModal}
          onConfirm={() => {
            deletePlaylist(modalState.data.id);
            if (currentView === `playlist_${modalState.data.id}`) setCurrentView('library');
          }}
        />
      )}
      {modalState.isOpen && modalState.type === 'add_to_playlist' && (
        <AddToPlaylistModal 
          trackId={modalState.data}
          playlists={playlists}
          onClose={closeModal}
          onAdd={addTrackToPlaylist}
        />
      )}
    </div>
  );
};

const PlayerWithToast = ({ children }) => {
  const { triggerToast } = useContext(LibraryContext) || {};
  return <PlayerProvider setToastMessage={triggerToast}>{children}</PlayerProvider>;
};

export default function App() {
  return (
    <AuthProvider>
      <LibraryProvider>
        <PlayerWithToast>
          <SearchProvider>
            <MainApp />
          </SearchProvider>
        </PlayerWithToast>
      </LibraryProvider>
    </AuthProvider>
  );
}
