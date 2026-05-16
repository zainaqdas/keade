'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimeDetailData, NyaaTorrent } from '@/lib/types';
import { extractEpisodeNumber, isBatchTorrent } from '@/lib/nyaa/parser';
import { stripHtml, formatScore, formatNumber, statusColor, formatStatus } from '@/lib/utils';
import PlayerWithStatus from '@/components/PlayerWithStatus';

interface EpisodeGroup {
  label: string;
  episode: number | null;
  torrents: NyaaTorrent[];
}

export default function AnimeDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [anime, setAnime] = useState<AnimeDetailData | null>(null);
  const [torrents, setTorrents] = useState<NyaaTorrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [torrentsLoading, setTorrentsLoading] = useState(true);
  const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
  const [playingTorrent, setPlayingTorrent] = useState<NyaaTorrent | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerVisible, setPlayerVisible] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/anime/${id}`);
        const data = await res.json();
        
        if (!data.data) throw new Error('No anime data found');
        const animeData = data.data as AnimeDetailData;
        setAnime(animeData);
        fetchTorrents(animeData);
      } catch (err) {
        setError('Failed to load anime details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  async function fetchTorrents(animeData: AnimeDetailData) {
    setTorrentsLoading(true);
    try {
      const searchTerms = [
        animeData.title.english,
        animeData.title.romaji,
        ...animeData.synonyms.slice(0, 2),
      ].filter(Boolean).join(',');

      const res = await fetch(`/api/torrents?q=${encodeURIComponent(animeData.title.romaji)}&synonyms=${encodeURIComponent(searchTerms)}`);
      const data = await res.json();
      setTorrents(data.torrents || []);
    } catch (err) {
      console.error('Failed to fetch torrents:', err);
    } finally {
      setTorrentsLoading(false);
    }
  }

  const handlePlay = useCallback((torrent: NyaaTorrent) => {
    setPlayingTorrent(torrent);
    setPlayerVisible(true);
    // Scroll to player smoothly after render
    setTimeout(() => {
      document.getElementById('player-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

  const handleCopyMagnet = useCallback(async (torrent: NyaaTorrent) => {
    try {
      await navigator.clipboard.writeText(torrent.magnet);
      setCopiedHash(torrent.hash);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch {
      // Fallback
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

  const toggleEpisode = useCallback((ep: number | null) => {
    setExpandedEpisode(prev => prev === ep ? null : ep);
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

  const episodeGroups = groupTorrentsByEpisode(torrents);
  const hasTorrents = torrents.length > 0;
  const title = anime.title.english || anime.title.romaji;
  const bannerBg = anime.bannerImage || anime.coverImage;

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
                  onClose={() => {
                    setPlayingTorrent(null);
                    setPlayerVisible(false);
                  }}
                />
              </div>
            )}

            {/* Episodes Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Episodes</h2>
                <span className="text-sm text-gray-500">
                  {torrentsLoading ? 'Searching...' : `${torrents.length} torrents found`}
                </span>
              </div>

              {torrentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl shimmer" />
                  ))}
                </div>
              ) : hasTorrents ? (
                <div className="space-y-2">
                  {episodeGroups.map((group) => {
                    const isExpanded = expandedEpisode === group.episode;
                    return (
                      <div key={group.label} className="rounded-2xl border border-white/5 overflow-hidden transition-all duration-200">
                        {/* Episode Header (Clickable) */}
                        <button
                          onClick={() => toggleEpisode(group.episode)}
                          className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${
                            isExpanded
                              ? 'bg-indigo-500/10 border-b border-white/5'
                              : 'bg-white/[0.02] hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                              isExpanded
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : 'bg-white/5 text-gray-400'
                            }`}>
                              {group.episode !== null ? group.episode : '••'}
                            </div>
                            <div className="text-left">
                              <span className="text-white font-medium">
                                {group.episode !== null ? `Episode ${group.episode}` : group.label}
                              </span>
                              <span className="ml-3 text-xs text-gray-500">
                                {group.torrents.length} {group.torrents.length === 1 ? 'torrent' : 'torrents'}
                              </span>
                            </div>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Expanded Torrent List */}
                        {isExpanded && (
                          <div className="divide-y divide-white/5 animate-fade-in">
                            {group.torrents.map((torrent) => (
                              <TorrentItem
                                key={torrent.hash}
                                torrent={torrent}
                                copiedHash={copiedHash}
                                onPlay={handlePlay}
                                onCopy={handleCopyMagnet}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-gray-500 text-sm">No torrents found for this anime</p>
                  <p className="text-gray-600 text-xs mt-1">Try searching with a different title</p>
                </div>
              )}
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

function groupTorrentsByEpisode(torrents: NyaaTorrent[]): EpisodeGroup[] {
  const groups: Map<string, NyaaTorrent[]> = new Map();
  const noEpisode: NyaaTorrent[] = [];

  for (const torrent of torrents) {
    const ep = torrent.episode ?? extractEpisodeNumber(torrent.name);
    if (ep !== null) {
      const key = `episode_${ep}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(torrent);
    } else {
      noEpisode.push(torrent);
    }
  }

  const sortedGroups: EpisodeGroup[] = [];
  const episodeKeys = Array.from(groups.keys()).sort((a, b) => {
    return parseInt(a.replace('episode_', '')) - parseInt(b.replace('episode_', ''));
  });

  for (const key of episodeKeys) {
    const torrents = groups.get(key)!;
    const epNum = parseInt(key.replace('episode_', ''));
    sortedGroups.push({ label: `Episode ${epNum}`, episode: epNum, torrents });
  }

  if (noEpisode.length > 0) {
    sortedGroups.push({ label: 'Other / Batch', episode: null, torrents: noEpisode });
  }

  return sortedGroups;
}

function getQuality(name: string): string | null {
  const match = name.match(/(\d{3,4})p/i);
  return match ? match[1] + 'p' : null;
}

function getGroup(name: string): string | null {
  const match = name.match(/^\[([^\]]+)\]/);
  return match ? match[1] : null;
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
