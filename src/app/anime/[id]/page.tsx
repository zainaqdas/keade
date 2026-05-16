'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimeDetailData, NyaaTorrent } from '@/lib/types';
import { isBatchTorrent } from '@/lib/nyaa/parser';
import { stripHtml, formatScore, formatNumber, statusColor, formatStatus } from '@/lib/utils';
import PlayerWithStatus from '@/components/PlayerWithStatus';
import type { AniListUser } from '@/lib/anilist';

const EPISODES_PER_PAGE = 50;

export default function AnimeDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [anime, setAnime] = useState<AnimeDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [episodeTorrents, setEpisodeTorrents] = useState<Record<number, NyaaTorrent[]>>({});
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [episodePage, setEpisodePage] = useState(0);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [playingTorrent, setPlayingTorrent] = useState<NyaaTorrent | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [selectedAudio, setSelectedAudio] = useState<string>('all');
  const [batchTorrents, setBatchTorrents] = useState<NyaaTorrent[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchExpanded, setBatchExpanded] = useState(false);
  const [playingEpisodeNumber, setPlayingEpisodeNumber] = useState<number | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<number>>(new Set());
  const [anilistUser, setAnilistUser] = useState<AniListUser | null>(null);
  const [syncingEpisode, setSyncingEpisode] = useState<number | null>(null);
  const searchTermsRef = useRef<string>('');

  // Load watched episodes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`watched_${id}`);
      if (stored) {
        const arr = JSON.parse(stored) as number[];
        setWatchedEpisodes(new Set(arr));
      }
    } catch {}
  }, [id]);

  // Fetch AniList user
  useEffect(() => {
    fetch('/api/auth/anilist/me')
      .then(res => res.json())
      .then(data => { if (data.user) setAnilistUser(data.user); })
      .catch(() => {});
  }, []);

  // Persist watched episodes to localStorage
  useEffect(() => {
    const arr = Array.from(watchedEpisodes);
    localStorage.setItem(`watched_${id}`, JSON.stringify(arr));
  }, [watchedEpisodes, id]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/anime/${id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Anime not found');
          throw new Error('Failed to load anime details');
        }
        const data = await res.json();
        if (!data.data) throw new Error('No anime data found');
        const animeData = data.data as AnimeDetailData;
        setAnime(animeData);

        // Build search terms once for later episode lookups.
        // Include season/year info from synonyms for better Nyaa disambiguation.
        // Also generate a "Season N" variation if not already in synonyms.
        const seasonYear = animeData.seasonYear;
        const seasonStr = seasonYear ? String(seasonYear) : '';
        const nameWithYear = animeData.title.english
          ? `${animeData.title.english} ${seasonStr}`.trim()
          : `${animeData.title.romaji} ${seasonStr}`.trim();
        const terms = [
          nameWithYear,
          animeData.title.english,
          animeData.title.romaji,
          ...animeData.synonyms.slice(0, 4),
        ].filter(Boolean).join(',');
        searchTermsRef.current = terms;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load anime details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const fetchEpisodeTorrents = useCallback(async (episode: number) => {
    // Already cached
    if (episodeTorrents[episode]) {
      setSelectedEpisode(prev => prev === episode ? null : episode);
      return;
    }

    setEpisodeLoading(true);
    setSelectedEpisode(episode);

    try {
      const q = encodeURIComponent(anime?.title.romaji || '');
      const synonyms = encodeURIComponent(searchTermsRef.current);
      const seasonYear = anime?.seasonYear || '';
      const startYear = anime?.startDate?.year || '';
      const totalEpisodes = anime?.episodes || '';
      const res = await fetch(
        `/api/torrents?q=${q}&synonyms=${synonyms}&episode=${episode}` +
        `&seasonYear=${seasonYear}&startYear=${startYear}&totalEpisodes=${totalEpisodes}`
      );
      const data = await res.json();
      setEpisodeTorrents(prev => ({ ...prev, [episode]: data.torrents || [] }));
      setSelectedQuality('all');
      setSelectedAudio('all');
    } catch (err) {
      console.error('Failed to fetch episode torrents:', err);
      setEpisodeTorrents(prev => ({ ...prev, [episode]: [] }));
    } finally {
      setEpisodeLoading(false);
    }
  }, [anime, episodeTorrents]);

  const handlePlay = useCallback((torrent: NyaaTorrent) => {
    setPlayingTorrent(torrent);
    setPlayerVisible(true);
    if (selectedEpisode !== null) {
      setPlayingEpisodeNumber(selectedEpisode);
    }
    setTimeout(() => {
      document.getElementById('player-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [selectedEpisode]);

  const fetchBatchTorrents = useCallback(async () => {
    if (batchTorrents.length > 0) {
      setBatchExpanded(prev => !prev);
      return;
    }

    setBatchLoading(true);
    setBatchExpanded(true);
    setSelectedQuality('all');
    setSelectedAudio('all');

    try {
      const q = encodeURIComponent(anime?.title.romaji || '');
      const synonyms = encodeURIComponent(searchTermsRef.current);
      const seasonYear = anime?.seasonYear || '';
      const startYear = anime?.startDate?.year || '';
      const totalEpisodes = anime?.episodes || '';
      const res = await fetch(
        `/api/torrents?q=${q}&synonyms=${synonyms}&batch=true` +
        `&seasonYear=${seasonYear}&startYear=${startYear}&totalEpisodes=${totalEpisodes}`
      );
      const data = await res.json();
      setBatchTorrents(data.torrents || []);
    } catch (err) {
      console.error('Failed to fetch batch torrents:', err);
      setBatchTorrents([]);
    } finally {
      setBatchLoading(false);
    }
  }, [anime, batchTorrents]);

  const handleSyncEpisode = useCallback(async (episode: number) => {
    if (!anilistUser || syncingEpisode !== null) return;
    setSyncingEpisode(episode);
    try {
      const total = anime?.episodes ||
        (anime?.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 : 0) ||
        anime?.airingSchedule.length || 0;
      const res = await fetch('/api/anilist/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: anime?.id,
          progress: episode,
          totalEpisodes: total || undefined,
        }),
      });
      if (res.ok) {
        setWatchedEpisodes(prev => new Set(prev).add(episode));
      } else {
        const data = await res.json();
        console.error('[AniList Sync]', data.error);
      }
    } catch (err) {
      console.error('[AniList Sync Error]', err);
    } finally {
      setSyncingEpisode(null);
    }
  }, [anilistUser, anime, syncingEpisode]);

  const handleCopyMagnet = useCallback(async (torrent: NyaaTorrent) => {
    try {
      await navigator.clipboard.writeText(torrent.magnet);
      setCopiedHash(torrent.hash);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = torrent.magnet;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedHash(torrent.hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  }, []);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error || !anime) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="text-6xl mb-4">😔</div>
        <h2 className="text-2xl font-bold text-white mb-2">Anime Not Found</h2>
        <p className="text-gray-500 mb-6">{error || 'Could not load this anime'}</p>
        <a href="/" className="btn-primary inline-block">Go Home</a>
      </div>
    );
  }

  const title = anime.title.english || anime.title.romaji;
  const bannerBg = anime.bannerImage || anime.coverImage;

  // Determine total episodes
  const totalEpisodes = anime.episodes ||
    (anime.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 : 0) ||
    anime.airingSchedule.length || 0;

  // Generate episode numbers
  const allEpisodes = Array.from({ length: totalEpisodes }, (_, i) => i + 1);

  // Filter episodes by search
  const filteredEpisodes = episodeSearch
    ? allEpisodes.filter(ep => String(ep).includes(episodeSearch))
    : allEpisodes;

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE));
  const pageEpisodes = filteredEpisodes.slice(
    episodePage * EPISODES_PER_PAGE,
    (episodePage + 1) * EPISODES_PER_PAGE
  );

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={bannerBg}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a1a] via-transparent to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="flex gap-8 items-end">
            <div className="hidden sm:block w-48 flex-shrink-0 -mb-16 relative z-10">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img
                  src={anime.coverImage}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {anime.genres.slice(0, 4).map((genre) => (
                  <span key={genre} className="tag-pill">{genre}</span>
                ))}
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor(anime.status)}`}>
                  {formatStatus(anime.status)}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-3">{title}</h1>

              {anime.title.native && (
                <p className="text-lg text-gray-400 mb-3">{anime.title.native}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm">
                {anime.averageScore && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10">
                    <span className="text-yellow-400 font-bold text-base">{formatScore(anime.averageScore)}</span>
                    <span className="text-yellow-500/60">★</span>
                  </div>
                )}
                {anime.season && anime.seasonYear && (
                  <span className="text-gray-400">{anime.season} {anime.seasonYear}</span>
                )}
                {anime.format && <span className="text-gray-400">{anime.format}</span>}
                {anime.episodes && <span className="text-gray-400">{anime.episodes} Episodes</span>}
                {anime.duration && <span className="text-gray-400">{anime.duration} min/ep</span>}
                <a
                  href={`https://anilist.co/anime/${anime.id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors ml-auto"
                >
                  View on AniList →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Synopsis */}
            {anime.description && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">Synopsis</h2>
                <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
                  {stripHtml(anime.description)}
                </p>
              </section>
            )}

            {/* WebTor Player */}
            {playingTorrent && playerVisible && (
              <div id="player-section" className="animate-fade-in">
                <PlayerWithStatus
                  key={playingTorrent.hash}
                  magnet={playingTorrent.magnet}
                  poster={anime.coverImage}
                  title={anime.title.english || anime.title.romaji}
                  torrentName={playingTorrent.name}
                  forceIframe={isBatchTorrent(playingTorrent.name)}
                  onClose={() => {
                    setPlayingTorrent(null);
                    setPlayerVisible(false);
                    setPlayingEpisodeNumber(null);
                  }}
                />

                {/* Mark Watched — appears when the player is open for a single episode */}
                {playingEpisodeNumber !== null && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {watchedEpisodes.has(playingEpisodeNumber) ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Episode {playingEpisodeNumber} — Watched
                        </span>
                      ) : null}
                      {anilistUser && !watchedEpisodes.has(playingEpisodeNumber) && (
                        <button
                          onClick={() => handleSyncEpisode(playingEpisodeNumber)}
                          disabled={syncingEpisode !== null}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 hover:text-blue-300 transition-all text-xs font-medium disabled:opacity-50"
                        >
                          {syncingEpisode === playingEpisodeNumber ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                              Syncing…
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Mark Episode {playingEpisodeNumber} as Watched
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {!anilistUser && (
                      <a
                        href="/api/auth/anilist/login"
                        className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
                      >
                        Connect AniList to track your progress
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Episodes Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  Episodes
                  {totalEpisodes > 0 && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({totalEpisodes} total)
                    </span>
                  )}
                </h2>
              </div>

              {/* Episode Search */}
              {totalEpisodes > 0 && (
                <div className="relative mb-4">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={episodeSearch}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setEpisodeSearch(val);
                      setEpisodePage(0);
                    }}
                    placeholder="Search episode by number..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111125] border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  />
                  {episodeSearch && (
                    <button
                      onClick={() => setEpisodeSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {totalEpisodes === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-4xl mb-3">📺</div>
                  <p className="text-gray-500 text-sm">Episode count unknown for this anime</p>
                  <p className="text-gray-600 text-xs mt-1">Episode list will appear once available</p>
                </div>
              ) : filteredEpisodes.length === 0 ? (
                <div className="text-center py-8 rounded-2xl bg-white/[0.02] border border-white/5">
                  <p className="text-gray-500 text-sm">No episodes matching &quot;{episodeSearch}&quot;</p>
                </div>
              ) : (
                <>
                  {/* Episode Grid */}
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                    {pageEpisodes.map((ep) => {
                      const isSelected = selectedEpisode === ep;
                      const hasTorrents = !!episodeTorrents[ep]?.length;
                      return (
                        <button
                          key={ep}
                          onClick={() => fetchEpisodeTorrents(ep)}
                          className={`
                            relative flex items-center justify-center h-10 rounded-lg text-sm font-medium
                            transition-all duration-150
                            ${isSelected
                              ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50 scale-105'
                              : watchedEpisodes.has(ep)
                                ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                                : hasTorrents
                                  ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white'
                            }
                          `}
                          title={`Episode ${ep}${watchedEpisodes.has(ep) ? ' — Watched ✓' : hasTorrents ? ` (${episodeTorrents[ep].length} torrents)` : ''}`}
                        >
                          {ep}
                          {watchedEpisodes.has(ep) ? (
                            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 bg-emerald-500 rounded-full">
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          ) : hasTorrents && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button
                        onClick={() => setEpisodePage(p => Math.max(0, p - 1))}
                        disabled={episodePage === 0}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 7) {
                            pageNum = i;
                          } else if (episodePage < 3) {
                            pageNum = i;
                          } else if (episodePage > totalPages - 4) {
                            pageNum = totalPages - 7 + i;
                          } else {
                            pageNum = episodePage - 3 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setEpisodePage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                                episodePage === pageNum
                                  ? 'bg-indigo-500/20 text-indigo-400'
                                  : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {pageNum + 1}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setEpisodePage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={episodePage >= totalPages - 1}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {/* Selected Episode Torrent Results with Quality Selector */}
                  {selectedEpisode !== null && (
                    <div className="mt-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400">
                          {selectedEpisode}
                        </div>
                        <h3 className="text-white font-semibold">
                          Episode {selectedEpisode}
                        </h3>
                        {episodeLoading && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            Searching Nyaa.si...
                          </div>
                        )}
                        {!episodeLoading && episodeTorrents[selectedEpisode] && (
                          <span className="text-xs text-gray-500">
                            {episodeTorrents[selectedEpisode].length} torrent{episodeTorrents[selectedEpisode].length !== 1 ? 's' : ''} found
                          </span>
                        )}
                      </div>

                      {episodeLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-xl shimmer" />
                          ))}
                        </div>
                      ) : episodeTorrents[selectedEpisode]?.length > 0 ? (
                        <EpisodeTorrents
                          torrents={episodeTorrents[selectedEpisode]}
                          selectedQuality={selectedQuality}
                          onQualityChange={setSelectedQuality}
                          selectedAudio={selectedAudio}
                          onAudioChange={setSelectedAudio}
                          copiedHash={copiedHash}
                          onPlay={handlePlay}
                          onCopy={handleCopyMagnet}
                        />
                      ) : (
                        <div className="text-center py-8 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="text-3xl mb-2">🔍</div>
                          <p className="text-gray-500 text-sm">No torrents found for Episode {selectedEpisode}</p>
                          <p className="text-gray-600 text-xs mt-1">
                            Try searching with a different title or check back later
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ─── Batch Disclaimer ─── */}
              <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent border border-amber-500/15">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.33 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    <strong className="text-amber-400 font-semibold">Can't find specific episodes?</strong>
                    {' '}Try using the{' '}
                    <span className="text-purple-400 font-medium">Batch Downloads</span>
                    {' '}section below instead. Batch torrents pack all episodes of a series into one torrent file.
                    Once loaded in{' '}
                    <span className="text-indigo-400 font-medium">WebTor</span>
                    , you can browse through all episodes directly from the player and pick what you want to watch.
                  </div>
                </div>
              </div>

              {/* ─── Batch Downloads Section ─── */}
              <section className="mt-5">
                <button
                  onClick={fetchBatchTorrents}
                  className="flex items-center justify-between w-full group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h2 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                        Batch Downloads
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {batchTorrents.length > 0
                          ? `${batchTorrents.length} batch torrent${batchTorrents.length !== 1 ? 's' : ''} available`
                          : 'Download complete series collections'
                        }
                      </p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center transition-transform ${batchExpanded ? 'rotate-180' : ''}`}>
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {batchExpanded && (
                  <div className="mt-4">
                    {batchLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="h-16 rounded-xl shimmer" />
                        ))}
                      </div>
                    ) : batchTorrents.length > 0 ? (
                      <EpisodeTorrents
                        torrents={batchTorrents}
                        selectedQuality={selectedQuality}
                        onQualityChange={setSelectedQuality}
                        selectedAudio={selectedAudio}
                        onAudioChange={setSelectedAudio}
                        copiedHash={copiedHash}
                        onPlay={handlePlay}
                        onCopy={handleCopyMagnet}
                      />
                    ) : (
                      <div className="text-center py-8 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div className="text-3xl mb-2">📦</div>
                        <p className="text-gray-500 text-sm">No batch torrents found</p>
                        <p className="text-gray-600 text-xs mt-1">Try searching with a different title or check Nyaa.si directly</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <section className="glass rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Information</h3>
              <div className="space-y-3 text-sm">
                {anime.format && <InfoRow label="Format" value={anime.format} />}
                {anime.episodes && <InfoRow label="Episodes" value={String(anime.episodes)} />}
                {anime.duration && <InfoRow label="Duration" value={`${anime.duration} min`} />}
                {anime.status && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-medium ${statusColor(anime.status).split(' ')[1]}`}>
                      {formatStatus(anime.status)}
                    </span>
                  </div>
                )}
                {anime.averageScore && <InfoRow label="Score" value={formatScore(anime.averageScore)} highlight />}
                {anime.popularity && <InfoRow label="Popularity" value={`#${formatNumber(anime.popularity)}`} />}
                {anime.season && anime.seasonYear && (
                  <InfoRow label="Season" value={`${anime.season} ${anime.seasonYear}`} />
                )}
                {anime.startDate?.year && (
                  <InfoRow
                    label="Aired"
                    value={`${anime.startDate.year}${anime.endDate?.year ? ` - ${anime.endDate.year}` : ''}`}
                  />
                )}
                {anime.source && <InfoRow label="Source" value={anime.source.replace(/_/g, ' ')} />}
              </div>
            </section>

            {/* Studios */}
            {anime.studios.length > 0 && (
              <section className="glass rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4">Studios</h3>
                <div className="flex flex-wrap gap-2">
                  {anime.studios.map((studio) => (
                    <span key={studio.id} className="tag-pill">{studio.name}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Tags */}
            {anime.tags.length > 0 && (
              <section className="glass rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {anime.tags
                    .filter((tag) => tag.rank >= 70)
                    .slice(0, 10)
                    .map((tag) => (
                      <span key={tag.id} className="tag-pill">{tag.name}</span>
                    ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── EpisodeTorrents: Quality Grouping ─── */

function EpisodeTorrents({
  torrents,
  selectedQuality,
  onQualityChange,
  selectedAudio,
  onAudioChange,
  copiedHash,
  onPlay,
  onCopy,
}: {
  torrents: NyaaTorrent[];
  selectedQuality: string;
  onQualityChange: (q: string) => void;
  selectedAudio: string;
  onAudioChange: (a: string) => void;
  copiedHash: string | null;
  onPlay: (torrent: NyaaTorrent) => void;
  onCopy: (torrent: NyaaTorrent) => void;
}) {
  // Group torrents by quality
  const qualityGroups = torrents.reduce<Record<string, NyaaTorrent[]>>((acc, t) => {
    const q = getQuality(t.name) || 'other';
    if (!acc[q]) acc[q] = [];
    acc[q].push(t);
    return acc;
  }, {});

  const qualities = Object.keys(qualityGroups).sort((a, b) => {
    const rank = (q: string) => {
      const n = parseInt(q);
      if (!isNaN(n)) return n;
      return -1;
    };
    return rank(b) - rank(a);
  });

  // Auto-select best quality when 'all'
  const displayQuality = selectedQuality === 'all' && qualities.length > 0
    ? qualities[0]
    : selectedQuality;

  // Quality-filtered torrents
  const qualityTorrents = displayQuality === 'all'
    ? torrents
    : qualityGroups[displayQuality] || [];

  // Audio type groups within the selected quality
  const audioGroups = qualityTorrents.reduce<Record<string, NyaaTorrent[]>>((acc, t) => {
    const a = getAudioType(t.name);
    if (!acc[a]) acc[a] = [];
    acc[a].push(t);
    return acc;
  }, {} as Record<string, NyaaTorrent[]>);

  const audioTypes = Object.keys(audioGroups).sort((a, b) => {
    const order = ['sub', 'dual', 'dub'];
    return order.indexOf(a) - order.indexOf(b);
  });

  // Audio-filtered torrents
  const displayTorrents = selectedAudio === 'all'
    ? qualityTorrents
    : audioGroups[selectedAudio] || [];

  // Count per type across ALL qualities (for the audio filter counts)
  const totalAudioCounts = torrents.reduce<Record<string, number>>((acc, t) => {
    const a = getAudioType(t.name);
    acc[a] = (acc[a] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Audio Tabs (primary filter) */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {audioTypes.length > 1 && (
          <button
            onClick={() => onAudioChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedAudio === 'all'
                ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40'
                : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
            }`}
          >
            All ({qualityTorrents.length})
          </button>
        )}
        {audioTypes.map((a) => (
          <button
            key={a}
            onClick={() => onAudioChange(a)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-all ${
              selectedAudio === a
                ? a === 'dub'
                  ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40'
                  : a === 'dual'
                    ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
            }`}
          >
            {a === 'dub' ? '🇺🇸 Dub' : a === 'dual' ? '🔊 Dual' : '🇯🇵 Sub'}
            <span className="ml-1 text-[10px] opacity-60">({totalAudioCounts[a] || audioGroups[a]?.length || 0})</span>
          </button>
        ))}
      </div>

      {/* Quality Tabs (secondary) */}
      {audioTypes.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {qualities.length > 1 && (
            <button
              onClick={() => onQualityChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                displayQuality === 'all'
                  ? 'bg-white/15 text-white'
                  : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
              }`}
            >
              All ({qualityTorrents.length})
            </button>
          )}
          {qualities.map((q) => (
            <button
              key={q}
              onClick={() => onQualityChange(q)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                displayQuality === q
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                  : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
              }`}
            >
              {q === 'other' ? 'Other' : q.toUpperCase()}
              <span className="ml-1 text-[10px] opacity-60">({qualityGroups[q]?.filter(t => selectedAudio === 'all' || getAudioType(t.name) === selectedAudio).length || 0})</span>
            </button>
          ))}
        </div>
      )}

      {/* Torrent List */}
      {displayTorrents.length > 0 ? (
        <div className="rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
          {displayTorrents.map((torrent) => (
            <TorrentItem
              key={torrent.hash}
              torrent={torrent}
              copiedHash={copiedHash}
              onPlay={onPlay}
              onCopy={onCopy}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 rounded-2xl bg-white/[0.02] border border-white/5">
          <p className="text-gray-500 text-sm">No torrents in this selection</p>
        </div>
      )}
    </div>
  );
}

/* ─── Torrent Item ─── */

function TorrentItem({
  torrent,
  copiedHash,
  onPlay,
  onCopy,
}: {
  torrent: NyaaTorrent;
  copiedHash: string | null;
  onPlay: (torrent: NyaaTorrent) => void;
  onCopy: (torrent: NyaaTorrent) => void;
}) {
  const quality = getQuality(torrent.name);
  const group = getGroup(torrent.name);
  const audio = getAudioType(torrent.name);
  const isCopied = copiedHash === torrent.hash;

  return (
    <div className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Torrent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {quality && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 uppercase">
                {quality}
              </span>
            )}
            {group && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-gray-400">
                {group}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              audio === 'dub'
                ? 'bg-orange-500/20 text-orange-400'
                : audio === 'dual'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {audio === 'dub' ? '🇺🇸 DUB' : audio === 'dual' ? '🔊 DUAL' : '🇯🇵 SUB'}
            </span>
            {isBatchTorrent(torrent.name) && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-400">
                BATCH
              </span>
            )}
            <span className="text-xs text-gray-600 ml-auto">{torrent.filesize}</span>
          </div>
          <p className="text-xs text-gray-400 truncate" title={torrent.name}>
            {torrent.name}
          </p>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600">
            <span>↑ {formatNumber(parseInt(torrent.seeders) || 0)}</span>
            <span>↓ {formatNumber(parseInt(torrent.leechers) || 0)}</span>
            <span>{torrent.completed} DL</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(torrent); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 hover:text-indigo-300 transition-all text-xs font-medium"
            title="Play this torrent"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(torrent); }}
            className={`p-2 rounded-lg transition-all ${
              isCopied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
            }`}
            title="Copy magnet link"
          >
            {isCopied ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Info Row ─── */

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? 'text-yellow-400 font-medium' : 'text-white'}>{value}</span>
    </div>
  );
}

/* ─── Helpers ─── */

function getQuality(name: string): string | null {
  const match = name.match(/(\d{3,4})p/i);
  return match ? match[1] + 'p' : null;
}

function getGroup(name: string): string | null {
  const match = name.match(/^\[([^\]]+)\]/);
  return match ? match[1] : null;
}

function getAudioType(name: string): 'dub' | 'dual' | 'sub' {
  // Check dual audio first (it also contains "dub" often)
  if (/dual\s*audio|dualaudio|dual-audio/i.test(name)) {
    return 'dual';
  }
  // Check for dub markers
  if (/\bdub(?:bed)?\s*\b|english\s*dub/i.test(name)) {
    return 'dub';
  }
  // Default to sub
  return 'sub';
}

/* ─── Loading Skeleton ─── */

function DetailSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-[50vh] min-h-[400px] shimmer" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8 mt-8">
            <div className="h-6 w-24 rounded shimmer" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded shimmer" />
              <div className="h-4 w-3/4 rounded shimmer" />
              <div className="h-4 w-5/6 rounded shimmer" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl shimmer" />
              ))}
            </div>
          </div>
          <div className="space-y-6 mt-8">
            <div className="h-64 rounded-2xl shimmer" />
            <div className="h-48 rounded-2xl shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
