'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimeCardData } from '@/lib/types';
import { formatScore, statusColor, formatStatus } from '@/lib/utils';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AnimeCardData[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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
        </div>
      </div>
    </nav>
  );
}
