import React, { createContext, useState, useEffect, useContext } from 'react';
import { LoginModal } from '../components/modals/LoginModal';

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('samify_user_session');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user session:", e);
      }
    }
  }, []);

  const login = (email, password) => {
    // Basic local persistence for email auth
    const username = email.split('@')[0];
    const sessionData = { id: username, email, name: username };
    setUser(sessionData);
    localStorage.setItem('samify_user_session', JSON.stringify(sessionData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('samify_user_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signIn: login, signOut: logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Re-export AuthModal as LoginModal for backwards compatibility
export const AuthModal = LoginModal;
