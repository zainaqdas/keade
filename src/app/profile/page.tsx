'use client';

import { useState, useEffect } from 'react';
import type { AniListUserWithStats, MediaListGroup, MediaListEntry } from '@/lib/anilist';

const LIST_ORDER = ['CURRENT', 'PLANNING', 'COMPLETED', 'PAUSED', 'DROPPED', 'REPEATING'];

function getListIcon(status: string): string {
  switch (status) {
    case 'CURRENT': return '▶️';
    case 'PLANNING': return '📋';
    case 'COMPLETED': return '✅';
    case 'PAUSED': return '⏸️';
    case 'DROPPED': return '🗑️';
    case 'REPEATING': return '🔄';
    default: return '📺';
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<AniListUserWithStats | null>(null);
  const [lists, setLists] = useState<MediaListGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('CURRENT');
  const [initialListsLoaded, setInitialListsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/anilist/lists');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setUser(data.user);
        setLists(data.lists || []);
        if (data.warning) setWarning(data.warning);
        if (data.user === null) {
          setError('Not connected to AniList');
        } else {
          setInitialListsLoaded(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // If initial list doesn't exist, switch to first available
  useEffect(() => {
    if (initialListsLoaded && lists.length > 0 && !lists.find(l => l.status === activeTab)) {
      setActiveTab(lists[0].status);
    }
  }, [initialListsLoaded, lists, activeTab]);

  // Sort lists by priority order
  const sortedLists = [...lists].sort((a, b) => {
    const ai = LIST_ORDER.indexOf(a.status);
    const bi = LIST_ORDER.indexOf(b.status);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  // Get the active list entries
  const activeList = lists.find(l => l.status === activeTab);
  const activeEntries = activeList?.entries || [];

  // Filter by search
  const filteredEntries = searchQuery
    ? activeEntries.filter(e =>
        (e.media.title.english || e.media.title.romaji)
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : activeEntries;

  if (loading) {
    return (
      <div className="min-h-screen pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-2xl font-bold text-white mb-2">Not Connected</h2>
          <p className="text-gray-500 mb-6">{error || 'Connect your AniList account to see your profile'}</p>
          <a href="/api/auth/anilist/login" className="btn-primary inline-flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            Connect AniList
          </a>
        </div>
      </div>
    );
  }

  const stats = user.statistics?.anime;
  const totalEntries = lists.reduce((sum, l) => sum + l.entries.length, 0);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Profile Header ── */}
        <div className="glass rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <img
                src={user.avatar.large}
                alt={user.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-2 ring-indigo-500/30 object-cover"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0a0a1a] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{user.name}</h1>
              <p className="text-gray-400 text-sm mt-1">
                {totalEntries} anime tracked · Connected to AniList
              </p>
              {stats && (
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6 mt-4">
                  <StatBadge label="Total Anime" value={String(stats.count)} />
                  <StatBadge label="Episodes" value={String(stats.episodesWatched)} />
                  <StatBadge label="Hours" value={String(Math.round(stats.minutesWatched / 60))} />
                  <StatBadge label="Mean Score" value={stats.meanScore ? stats.meanScore.toFixed(1) : '-'} />
                </div>
              )}
            </div>
            <a
              href={`https://anilist.co/user/${user.name}`}
              target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm"
            >
              View on AniList →
            </a>
          </div>
        </div>

        {/* ── List Tabs ── */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
          {sortedLists.map((list) => (
            <button
              key={list.status}
              onClick={() => { setActiveTab(list.status); setSearchQuery(''); }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap
                transition-all duration-200 flex-shrink-0
                ${activeTab === list.status
                  ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <span className="text-base">{getListIcon(list.status)}</span>
              {list.name}
              <span className={`text-xs ml-1 ${activeTab === list.status ? 'text-indigo-400' : 'text-gray-600'}`}>
                ({list.entries.length})
              </span>
            </button>
          ))}
        </div>

        {/* ── Search within list ── */}
        {activeEntries.length > 25 && (
          <div className="relative mb-6">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${activeList?.name || 'list'}...`}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111125] border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* ── Anime Grid ── */}          {warning && (
            <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {warning}
            </div>
          )}
          {filteredEntries.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredEntries.map((entry) => (
              <ListCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-5xl mb-4">{getListIcon(activeTab)}</div>
            <p className="text-gray-500 text-sm">
              {searchQuery
                ? 'No anime matching your search'
                : `Nothing in "${activeList?.name || 'this list'}" yet`
              }
            </p>
            {!searchQuery && (
              <a href="/" className="inline-block mt-4 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                Browse trending anime →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stat Badge ─── */

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center sm:items-start">
      <span className="text-lg sm:text-xl font-bold text-white">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

/* ─── List Card ─── */

function ListCard({ entry }: { entry: MediaListEntry }) {
  const { media } = entry;
  const title = media.title.english || media.title.romaji;
  const progress = entry.progress || 0;
  const total = media.episodes || 0;
  const progressPercent = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0;

  return (
    <a
      href={`/anime/${media.id}`}
      className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 transition-all duration-300"
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={media.coverImage.large}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Score badge */}
        {entry.score > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-[10px] font-bold backdrop-blur-sm border border-yellow-500/30">
            ★ {entry.score}
          </div>
        )}

        {/* Episode count */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/80 font-medium drop-shadow-lg">
              {total > 0 ? `${progress}/${total}` : `${progress} ep`}
            </span>
            <span className="text-[10px] text-gray-400">{media.format}</span>
          </div>
          {/* Progress bar */}
          {total > 0 && (
            <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="p-2.5">
        <p className="text-white text-xs font-medium leading-tight line-clamp-2 group-hover:text-indigo-400 transition-colors">
          {title}
        </p>
        {media.genres && media.genres.length > 0 && (
          <p className="text-[10px] text-gray-500 mt-1 truncate">
            {media.genres.slice(0, 2).join(' · ')}
          </p>
        )}
      </div>
    </a>
  );
}

/* ─── Skeleton ─── */

function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <div className="glass rounded-2xl p-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-2xl shimmer" />
          <div className="space-y-3 flex-1">
            <div className="h-8 w-48 rounded shimmer" />
            <div className="h-4 w-32 rounded shimmer" />
            <div className="flex gap-6 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-6 w-12 rounded shimmer" />
                  <div className="h-3 w-16 rounded shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-28 rounded-xl shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] rounded-2xl shimmer" />
            <div className="mt-2 space-y-1.5 px-1">
              <div className="h-3 w-full rounded shimmer" />
              <div className="h-2.5 w-2/3 rounded shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
