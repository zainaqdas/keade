'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimeCardData } from '@/lib/types';
import { formatScore, statusColor, formatStatus } from '@/lib/utils';
import type { AniListUser } from '@/lib/anilist';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AnimeCardData[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<AniListUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fetch AniList user on mount
  useEffect(() => {
    fetch('/api/auth/anilist/me')
      .then(res => res.json())
      .then(data => { if (data.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = () => {
    window.location.href = '/api/auth/anilist/login';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/anilist/logout', { method: 'POST' });
    setUser(null);
    setUserMenuOpen(false);
  };

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setDropdownOpen(true);
      try {
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(searchQuery)}&perPage=8`);
        const data = await res.json();
        setSearchResults(data.media || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="relative w-9 h-9">
              <svg className="w-full h-full" viewBox="0 0 36 36" fill="none">
                <rect x="2" y="2" width="32" height="32" rx="8" fill="url(#navGrad)" />
                <path d="M12 11h12v2.5h-5v10h-2.5v-10h-4.5V11z" fill="#0a0a1a" />
                <circle cx="24" cy="24" r="3.5" fill="#fff" opacity="0.35" />
                <defs>
                  <linearGradient id="navGrad" x1="0" y1="0" x2="36" y2="36">
                    <stop stopColor="#818cf8" />
                    <stop offset="1" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500" />
              </div>
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:block tracking-tight">
              Torrinto
            </span>
          </a>

          {/* Search Bar */}
          <div ref={searchRef} className="flex-1 max-w-xl relative">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults && searchResults.length > 0) setDropdownOpen(true); }}
                placeholder="Search anime..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#0a0a1a]/80 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {dropdownOpen && searchQuery.trim() && searchResults !== null && (
              <div className="absolute top-full mt-2 left-0 right-0 rounded-xl glass border border-white/10 overflow-hidden max-h-[400px] overflow-y-auto shadow-2xl">
                {searchResults.length > 0 ? (
                  searchResults.map((anime) => (
                    <a
                      key={anime.id}
                      href={`/anime/${anime.id}`}
                      onClick={() => { setDropdownOpen(false); setSearchQuery(''); }}
                      className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                    >
                      <img
                        src={anime.coverImage}
                        alt={anime.title.english || anime.title.romaji}
                        className="w-10 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-white font-medium text-sm truncate group-hover:text-indigo-400 transition-colors">
                          {anime.title.english || anime.title.romaji}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor(anime.status)}`}>
                            {formatStatus(anime.status)}
                          </span>
                          {anime.averageScore && (
                            <span className="text-xs text-yellow-400 font-medium">
                              ★ {formatScore(anime.averageScore)}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500">{anime.format}</span>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-gray-500 text-sm">No anime found for &quot;{searchQuery}&quot;</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AniList Auth */}
          <div ref={userRef} className="relative flex-shrink-0">
            {user ? (
              <>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-all"
                >
                  <img
                    src={user.avatar.medium}
                    alt={user.name}
                    className="w-7 h-7 rounded-full ring-2 ring-indigo-500/30"
                  />
                  <span className="text-sm text-gray-300 hidden sm:block">{user.name}</span>
                  <svg className={`w-3 h-3 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl glass border border-white/10 overflow-hidden shadow-2xl z-50">
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-white text-sm font-medium">{user.name}</p>
                      <p className="text-gray-500 text-xs">Connected to AniList</p>
                    </div>
                    <a
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:text-indigo-400 hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </a>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2 border-t border-white/5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Disconnect
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-400 hover:from-indigo-500/20 hover:to-purple-500/20 hover:text-indigo-300 transition-all text-xs font-medium"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                Connect AniList
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
