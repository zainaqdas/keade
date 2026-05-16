'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimeCardData } from '@/lib/types';
import { formatScore, statusColor, formatStatus } from '@/lib/utils';

export default function HomePage() {
  const [trending, setTrending] = useState<AnimeCardData[]>([]);
  const [popular, setPopular] = useState<AnimeCardData[]>([]);
  const [airing, setAiring] = useState<AnimeCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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



  // Hero slideshow data: top 6 airing anime with banners
  const heroSlides = airing
    .filter((a) => a.bannerImage && a.description)
    .slice(0, 6);

  // Latest episodes: airing anime sorted by next airing time
  const latestEpisodes = airing
    .filter((a) => a.nextAiringEpisode)
    .sort((a, b) => (a.nextAiringEpisode?.timeUntilAiring ?? 999999) - (b.nextAiringEpisode?.timeUntilAiring ?? 999999))
    .slice(0, 10);

  return (
    <div className="min-h-screen">
      {/* ── Hero Slideshow ── */}
      {!loading && heroSlides.length > 0 && (
        <HeroSlideshow slides={heroSlides} />
      )}

      {/* ── Search / Intro ── */}
      {/* Only show the hero section text when we don't have airing banners to use */}
      {loading || heroSlides.length === 0 ? (
        <section className="relative overflow-hidden pb-12">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light text-sm text-gray-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Stream from Torrents
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight">
                <span className="gradient-text">Your Ultimate</span>
                <br />
                <span className="text-white">Torrent Destination</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
                Browse trending anime, discover new series, and stream episodes directly in your browser with peer-to-peer torrent-powered playback.
              </p>
            </div>
          </div>
        </section>
      ) : null}



      {/* ── Latest Episodes ── */}
      {!loading && latestEpisodes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 mt-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <span className="w-2 h-8 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 inline-block" />
                Latest Episodes
              </h2>
              <p className="text-gray-500 mt-1 ml-5">Recently aired episodes</p>
            </div>
          </div>
          <div className="glass rounded-2xl p-5 border border-white/5">
            <div className="episode-grid">
              {latestEpisodes.map((anime) => (
                <EpisodeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Trending Section ── */}
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

      {/* ── Popular Section ── */}
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

      {/* ── Airing Section ── */}
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

/* ═══════════════════════════════════════
   Hero Slideshow
   ═══════════════════════════════════════ */

function HeroSlideshow({ slides }: { slides: AnimeCardData[] }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  // Auto-rotate
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    intervalRef.current = setInterval(goNext, 5000);
    return () => clearInterval(intervalRef.current);
  }, [isPaused, goNext, slides.length]);

  const slide = slides[current];
  if (!slide) return null;

  const title = slide.title.english || slide.title.romaji;
  const cleanDescription = slide.description
    ? slide.description.replace(/<[^>]+>/g, '').slice(0, 280)
    : '';

  return (
    <section
      className="group/section relative w-full h-[70vh] min-h-[500px] max-h-[700px] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background image */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
            i === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
        >
          <img
            src={s.bannerImage!}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[rgb(10,10,26)] via-[rgb(10,10,26)/70] to-[rgb(10,10,26)/20]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[rgb(10,10,26)] via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-[rgb(10,10,26)/40] via-transparent to-[rgb(10,10,26)/60]" />

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
        <div key={current} className="max-w-2xl animate-hero-in">
          {/* Tags */}
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Now Airing
            </span>
            {slide.averageScore && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-semibold border border-yellow-500/30">
                ★ {formatScore(slide.averageScore)}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight tracking-tight">
            {title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-5 text-sm text-gray-400">
            {slide.format && (
              <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 font-medium">
                {slide.format}
              </span>
            )}
            {slide.episodes && (
              <span>{slide.episodes} Episodes</span>
            )}
            {slide.season && slide.seasonYear && (
              <span>{slide.season} {slide.seasonYear}</span>
            )}
          </div>

          {/* Description */}
          {cleanDescription && (
            <p className="text-base sm:text-lg text-gray-300 mb-6 line-clamp-3 leading-relaxed">
              {cleanDescription}
            </p>
          )}

          {/* Genres */}
          {slide.genres && slide.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {slide.genres.slice(0, 4).map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/10"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <a
              href={`/anime/${slide.id}`}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Now
            </a>
            <a
              href={`/anime/${slide.id}`}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-all border border-white/10 backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              More Info
            </a>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[rgb(10,10,26)] to-transparent pointer-events-none" />

      {/* Navigation Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={`transition-all duration-300 rounded-full ${
                i === current
                  ? 'w-8 h-2 bg-indigo-500'
                  : 'w-2 h-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Side arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-all z-10 opacity-0 group-hover/section:opacity-100"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-all z-10 opacity-0 group-hover/section:opacity-100"
            aria-label="Next slide"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════
   Episode Card
   ═══════════════════════════════════════ */

function EpisodeCard({ anime }: { anime: AnimeCardData }) {
  const episode = anime.nextAiringEpisode!;
  const title = anime.title.english || anime.title.romaji;
  const timeUntilAiring = episode.timeUntilAiring;

  // Format the time
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Airing now';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  // Absolute date
  const airDate = new Date(episode.airingAt * 1000);
  const formattedDate = airDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isRecent = timeUntilAiring < 86400; // Less than 24h away

  // Clean description for popover
  const cleanDesc = anime.description
    ? anime.description.replace(/<[^>]+>/g, '').slice(0, 160)
    : null;

  return (
    <a
      href={`/anime/${anime.id}`}
      className="group relative flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all duration-300"
    >
      {/* Cover */}
      <div className="relative w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={anime.coverImage}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-indigo-500/80 px-1.5 py-0.5 rounded">
          EP {episode.episode}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold text-sm sm:text-base truncate group-hover:text-indigo-400 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-xs font-medium ${statusColor(anime.status)}`}>
            {formatStatus(anime.status)}
          </span>
          <span className="text-xs text-gray-600">·</span>
          <span className="text-xs text-gray-500">{anime.format}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
            isRecent
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRecent ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            {timeUntilAiring <= 0 ? 'Now' : formatTime(timeUntilAiring)}
          </span>
          <span className="text-xs text-gray-500">{formattedDate}</span>
        </div>
      </div>

      {/* Arrow */}
      <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>

      {/* ── Hover Overlay Popover ── */}
      <div className="absolute inset-0 z-50 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
        <div className="h-full rounded-xl overflow-hidden bg-[#16162a] border border-white/10 shadow-2xl shadow-black/60">
          <div className="h-full p-3 flex flex-col justify-between">
            {/* Top: Title + Genres */}
            <div>
              <p className="text-white font-bold text-xs leading-tight line-clamp-1">{title}</p>
              {anime.title.native && (
                <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-1">{anime.title.native}</p>
              )}
              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {anime.genres.slice(0, 3).map((g) => (
                    <span key={g} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/[0.06] text-gray-300">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Bottom: Meta + Score */}
            <div className="space-y-1.5">
              {cleanDesc && (
                <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">
                  {cleanDesc}
                </p>
              )}
              <div className="flex items-center gap-1.5 flex-wrap">
                {anime.averageScore && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 text-[9px] font-semibold">
                    ★ {formatScore(anime.averageScore)}
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400 text-[9px]">
                  EP {episode.episode}
                </span>
                {anime.format && (
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400 text-[9px]">
                    {anime.format}
                  </span>
                )}
              </div>
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-400">
                  View Details
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}

/* ═══════════════════════════════════════
   Original Components (unchanged)
   ═══════════════════════════════════════ */

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

      <HoverPopover anime={anime} />
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

      <HoverPopover anime={anime} />
    </a>
  );
}

/* ═══════════════════════════════════════
   Hover Popover (used by AnimeCard & AnimeGridCard)
   ═══════════════════════════════════════ */

function HoverPopover({ anime }: { anime: AnimeCardData }) {
  const title = anime.title.english || anime.title.romaji;
  const cleanDesc = anime.description
    ? anime.description.replace(/<[^>]+>/g, '').slice(0, 160)
    : null;

  return (
    <div className="absolute inset-0 z-50 rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
      <div className="h-full rounded-2xl overflow-hidden bg-[#16162a] border border-white/10 shadow-2xl shadow-black/60">
        <div className="h-full p-3.5 flex flex-col justify-between">
          {/* Top: Title + Genres */}
          <div>
            <p className="text-white font-bold text-sm leading-tight line-clamp-2">{title}</p>
            {anime.title.native && (
              <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-1">{anime.title.native}</p>
            )}
            {anime.genres && anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {anime.genres.slice(0, 3).map((g) => (
                  <span key={g} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/[0.06] text-gray-300">
                    {g}
                  </span>
                ))}
              </div>
            )}
            {cleanDesc && (
              <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-3 mt-2">
                {cleanDesc}
              </p>
            )}
          </div>
          {/* Bottom: Meta + CTA */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {anime.averageScore && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 text-[9px] font-semibold">
                  ★ {formatScore(anime.averageScore)}
                </span>
              )}
              {anime.episodes && (
                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400 text-[9px]">
                  {anime.episodes} EP
                </span>
              )}
              {anime.format && (
                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400 text-[9px]">
                  {anime.format}
                </span>
              )}
              {anime.season && anime.seasonYear && (
                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400 text-[9px]">
                  {anime.season} {anime.seasonYear}
                </span>
              )}
            </div>
            <div className="pt-1.5 border-t border-white/5">
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-400">
                View Details
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
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
