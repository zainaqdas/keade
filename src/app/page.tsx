'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimeCardData } from '@/lib/types';
import { formatScore, statusColor, formatStatus } from '@/lib/utils';

export default function HomePage() {
  const [trending, setTrending] = useState<AnimeCardData[]>([]);
  const [popular, setPopular] = useState<AnimeCardData[]>([]);
  const [airing, setAiring] = useState<AnimeCardData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AnimeCardData[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchSections() {
      try {
        const [trendingRes, popularRes, airingRes] = await Promise.all([
          fetch('/api/anime/trending?perPage=30'),
          fetch('/api/anime/popular?perPage=20'),
          fetch('/api/anime/airing?perPage=20'),
        ]);

        if (!trendingRes.ok || !popularRes.ok || !airingRes.ok) {
          throw new Error('Failed to fetch some sections');
        }

        const trendingData = await trendingRes.json();
        const popularData = await popularRes.json();
        const airingData = await airingRes.json();

        setTrending(trendingData.media || []);
        setPopular(popularData.media || []);
        setAiring(airingData.media || []);
      } catch (error) {
        console.error('Failed to fetch anime sections:', error);
        setLoadError('Could not load anime data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchSections();
  }, []);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(searchQuery)}&perPage=20`);
        const data = await res.json();
        setSearchResults(data.media || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pb-12">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light text-sm text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Discover & Stream Anime
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight">
              <span className="gradient-text">Your Ultimate</span>
              <br />
              <span className="text-white">Anime Destination</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
              Browse trending anime, discover new series, and stream episodes directly in your browser with torrent-powered playback.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mt-8" ref={searchRef}>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl opacity-20 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
                <div className="relative flex items-center">
                  <svg className="absolute left-5 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search anime by title..."
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-[#111125] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-lg"
                  />
                  {searching && (
                    <div className="absolute right-5">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Search Results Dropdown */}
              {searchResults !== null && searchQuery.trim() && (
                <div className="mt-3 rounded-2xl glass border border-white/10 overflow-hidden max-h-[500px] overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map((anime) => (
                      <a
                        key={anime.id}
                        href={`/anime/${anime.id}`}
                        className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                      >
                        <img
                          src={anime.coverImage}
                          alt={anime.title.english || anime.title.romaji}
                          className="w-12 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-white font-medium truncate group-hover:text-indigo-400 transition-colors">
                            {anime.title.english || anime.title.romaji}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(anime.status)}`}>
                              {formatStatus(anime.status)}
                            </span>
                            {anime.averageScore && (
                              <span className="text-sm text-yellow-400 font-medium">
                                ★ {formatScore(anime.averageScore)}
                              </span>
                            )}
                            {anime.format && (
                              <span className="text-xs text-gray-500">{anime.format}</span>
                            )}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">No anime found for &quot;{searchQuery}&quot;</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section id="trending" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="w-2 h-8 rounded-full bg-gradient-to-b from-indigo-500 to-purple-600 inline-block" />
              Trending Now
            </h2>
            <p className="text-gray-500 mt-1 ml-5">Most popular anime right now</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            Scroll to explore →
          </div>
        </div>

        {loading ? (
          <TrendingSkeleton />
        ) : loadError ? (
          <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-gray-500 text-sm">{loadError}</p>
          </div>
        ) : trending.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-gray-500 text-sm">No trending anime available</p>
          </div>
        ) : (
          <div className="scroll-section">
            {trending.map((anime, index) => (
              <AnimeCard key={anime.id} anime={anime} index={index} />
            ))}
          </div>
        )}
      </section>

      {/* Popular Section */}
      <section id="popular" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="w-2 h-8 rounded-full bg-gradient-to-b from-purple-500 to-pink-600 inline-block" />
              Most Popular
            </h2>
            <p className="text-gray-500 mt-1 ml-5">All-time favorite anime series</p>
          </div>
        </div>

        {loading ? (
          <GridSkeleton count={20} />
        ) : loadError ? (
          <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-gray-500 text-sm">{loadError}</p>
          </div>
        ) : popular.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-gray-500 text-sm">No popular anime available</p>
          </div>
        ) : (
          <div className="anime-grid">
            {popular.map((anime, index) => (
              <AnimeGridCard key={anime.id} anime={anime} index={index} />
            ))}
          </div>
        )}
      </section>

      {/* Currently Airing Section */}
      <section id="airing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <span className="w-2 h-8 rounded-full bg-gradient-to-b from-green-400 to-emerald-600 inline-block" />
              Currently Airing
            </h2>
            <p className="text-gray-500 mt-1 ml-5">New episodes airing now</p>
          </div>
        </div>

        {loading ? (
          <GridSkeleton count={20} />
        ) : loadError ? (
          <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-gray-500 text-sm">{loadError}</p>
          </div>
        ) : airing.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-gray-500 text-sm">No airing anime available</p>
          </div>
        ) : (
          <div className="anime-grid">
            {airing.map((anime, index) => (
              <AnimeGridCard key={anime.id} anime={anime} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Components ─── */

function AnimeCard({ anime, index }: { anime: AnimeCardData; index: number }) {
  const isAiring = anime.nextAiringEpisode;
  const title = anime.title.english || anime.title.romaji;

  return (
    <a
      href={`/anime/${anime.id}`}
      className="anime-card relative w-[260px] sm:w-[280px] rounded-2xl overflow-hidden flex-shrink-0 group cursor-pointer"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
        <img
          src={anime.coverImage}
          alt={title}
          className="anime-card-image w-full h-full object-cover transition-transform duration-700 ease-out"
          loading="lazy"
        />
        
        {/* Overlay */}
        <div className="anime-card-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white font-semibold text-sm leading-tight truncate">
              {title}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {anime.averageScore && (
                <span className="text-yellow-400 text-xs font-medium">
                  ★ {formatScore(anime.averageScore)}
                </span>
              )}
              {anime.episodes && (
                <span className="text-gray-400 text-xs">{anime.episodes} eps</span>
              )}
            </div>
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          {isAiring && (
            <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium backdrop-blur-sm border border-green-500/30">
              EP {isAiring.episode}
            </span>
          )}
          {anime.averageScore && (
            <span className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-medium backdrop-blur-sm ml-auto">
              ★ {formatScore(anime.averageScore)}
            </span>
          )}
        </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
      </div>
      
      <div className="mt-2.5 px-1">
        <p className="text-white font-medium text-sm truncate">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">{anime.format || anime.status}</span>
          {anime.genres?.slice(0, 2).map((g) => (
            <span key={g} className="text-xs text-gray-500">· {g}</span>
          ))}
        </div>
      </div>
    </a>
  );
}

function AnimeGridCard({ anime, index }: { anime: AnimeCardData; index: number }) {
  const title = anime.title.english || anime.title.romaji;

  return (
    <a
      href={`/anime/${anime.id}`}
      className="anime-card group rounded-2xl overflow-hidden"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
        <img
          src={anime.coverImage}
          alt={title}
          className="anime-card-image w-full h-full object-cover transition-transform duration-700 ease-out"
          loading="lazy"
        />
        
        <div className="anime-card-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
            <p className="text-white font-medium text-sm leading-tight truncate">
              {title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {anime.averageScore && (
                <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                  ★ {formatScore(anime.averageScore)}
                </span>
              )}
              {anime.nextAiringEpisode && (
                <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">
                  EP {anime.nextAiringEpisode.episode}
                </span>
              )}
              {anime.genres?.slice(0, 1).map((g) => (
                <span key={g} className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 text-xs">
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
      </div>
      
      <div className="mt-2 px-0.5">
        <p className="text-white font-medium text-xs leading-tight truncate">{title}</p>
      </div>
    </a>
  );
}

/* ─── Skeletons ─── */

function TrendingSkeleton() {
  return (
    <div className="scroll-section">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="w-[260px] sm:w-[280px] flex-shrink-0">
          <div className="aspect-[3/4] rounded-2xl shimmer" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-3/4 rounded shimmer" />
            <div className="h-3 w-1/2 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

function GridSkeleton({ count }: { count: number }) {
  return (
    <div className="anime-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[3/4] rounded-2xl shimmer" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3 w-3/4 rounded shimmer" />
            <div className="h-2.5 w-1/2 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
