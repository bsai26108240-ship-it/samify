import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { searchSongs } from '../services/musicApi';

export const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const requestIdRef = useRef(0);

  const query = (searchQuery || '').trim();
  const normalizedQuery = query.toLowerCase();

  const performSearch = useCallback(async (term) => {
    const q = (term || '').trim();
    if (!q) {
      setOnlineResults([]);
      setIsSearching(false);
      setSearchError('');
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsSearching(true);
    setSearchError('');

    try {
      const results = await searchSongs(q, {
        limit: 30,
        withLyrics: false,
        throwOnError: false,
      });

      if (requestIdRef.current === requestId) {
        setOnlineResults(results || []);
      }
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setSearchError('Online search is unavailable right now.');
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!normalizedQuery) {
      setOnlineResults([]);
      setIsSearching(false);
      setSearchError('');
      return undefined;
    }

    const timer = setTimeout(() => {
      performSearch(normalizedQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [normalizedQuery, performSearch]);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        onlineResults,
        isSearching,
        searchError,
        performSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => useContext(SearchContext);
export default SearchContext;

