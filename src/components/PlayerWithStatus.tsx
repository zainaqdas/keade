'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface PlayerWithStatusProps {
  magnet: string;
  poster?: string;
  title?: string;
  onClose: () => void;
  torrentName: string;
}

// Types for the Webtor SDK queue API
declare global {
  interface Window {
    webtor?: {
      push: (config: Record<string, unknown>) => void;
      TORRENT_ERROR?: string;
    }[] & {
      push: (config: Record<string, unknown>) => void;
      TORRENT_ERROR?: string;
    };
  }
}

export default function PlayerWithStatus({
  magnet,
  poster,
  title,
  onClose,
  torrentName,
}: PlayerWithStatusProps) {
  const [mode, setMode] = useState<'sdk' | 'iframe'>('sdk');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackTimer, setFallbackTimer] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const embedUrl = `https://webtor.io/show?magnet=${encodeURIComponent(magnet)}`;

  // ── SDK Player Initialisation ──
  useEffect(() => {
    setMode('sdk');
    setLoading(true);
    setError(null);
    setFallbackTimer(false);

    // Clear previous SDK container
    const container = document.getElementById('webtor-sdk-container');
    if (container) container.innerHTML = '';

    // Initialise the SDK queue
    window.webtor = window.webtor || ([] as unknown as Window['webtor']);
    (window.webtor as unknown as any[]).push({
      id: 'webtor-sdk-container',
      magnet: magnet,
      lang: 'en',
      poster: poster || undefined,
      title: title || undefined,
      on: (e: { name: string }) => {
        console.debug('[Webtor SDK event]', e.name, e);
        if (e.name === 'error' || e.name === (window.webtor as any)?.TORRENT_ERROR) {
          console.warn('[Webtor SDK] torrent error', e);
        }
      },
    });

    // 15s fallback timer: if SDK didn't render a player, switch to iframe
    fallbackTimeoutRef.current = setTimeout(() => {
      setFallbackTimer(true);
      const el = document.getElementById('webtor-sdk-container');
      // If the SDK hasn't injected any child elements, it likely failed
      if (!el || el.children.length === 0) {
        console.info('[Player] SDK did not render — switching to iframe proxy');
        if (el) el.innerHTML = '';
        setMode('iframe');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else {
        // SDK rendered — player is ready
        setLoading(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    }, 15_000);

    // Overall timeout (45s total) for iframe mode
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        setError('Connection timed out. The torrent may have few seeders.');
        setLoading(false);
      }
    }, 45_000);

    return () => {
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const el = document.getElementById('webtor-sdk-container');
      if (el) el.innerHTML = '';
    };
    // Magnet is stable across remounts due to `key={torrent.hash}` on the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magnet, poster, title]);

  // ── Iframe event handlers ──
  const handleIframeLoad = useCallback(() => {
    setLoading(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleIframeError = useCallback(() => {
    setError('Failed to load the video player.');
    setLoading(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // ── Render ──
  const transitioning = mode === 'iframe' && fallbackTimer;

  return (
    <section className="glass rounded-2xl p-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-white">Now Playing</h2>
          {/* SDK loading badge */}
          {loading && !error && mode === 'sdk' && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/15 text-indigo-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
              P2P
            </span>
          )}
          {/* Iframe loading badge */}
          {loading && !error && mode === 'iframe' && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-500/15 text-yellow-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
              </span>
              Proxy
            </span>
          )}
          {/* Success badge */}
          {!loading && !error && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-500/15 text-green-400">
              {mode === 'sdk' ? 'P2P' : 'Proxy'}
            </span>
          )}
          {/* Error badge */}
          {error && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/15 text-red-400">
              Error
            </span>
          )}
          {/* Transitioning indicator */}
          {transitioning && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-400">
              Fallback
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'iframe' && !loading && !error && (
            <span className="text-[10px] text-gray-600">Fallback · Iframe</span>
          )}
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── Player Container ── */}
      {/* Note: no overflow-hidden here — WebTor SDK renders controls that
          extend to the edge, and clipping them hides the fullscreen button. */}
      <div className="relative rounded-xl bg-black border border-white/5">
        <div className="w-full" style={{ minHeight: '360px' }}>
          {/* SDK Container (primary) — only in DOM when active */}
          {mode === 'sdk' && (
            <div
              id="webtor-sdk-container"
              className="webtor w-full h-full"
              style={{ minHeight: '360px' }}
            />
          )}

          {/* Iframe (fallback) */}
          {mode === 'iframe' && (
            <iframe
              src={embedUrl}
              title="Video Player"
              className="w-full h-full border-0"
              style={{ minHeight: '360px' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          )}

          {/* ── Loading Overlay ── */}
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a1a]/90 backdrop-blur-sm z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              {mode === 'sdk' ? (
                <>
                  <p className="text-white font-semibold text-sm mb-1">Connecting P2P Network...</p>
                  <p className="text-gray-500 text-xs text-center max-w-sm">
                    Attempting peer-to-peer connection via WebTorrent — no proxy required.
                  </p>
                  {fallbackTimer && (
                    <p className="text-amber-400 text-xs text-center max-w-sm mt-3">
                      Falling back to proxy mode…
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-white font-semibold text-sm mb-1">Connecting via Proxy...</p>
                  <p className="text-gray-500 text-xs text-center max-w-sm">
                    Using Webtor.io proxy server to fetch the torrent.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Error Overlay ── */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a1a]/90 backdrop-blur-sm z-10">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-400 font-medium text-sm mb-1">Streaming Failed</p>
              <p className="text-gray-500 text-xs max-w-xs text-center mb-4">{error}</p>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-5 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold">
                  Close Player
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(magnet)}
                  className="px-5 py-2 rounded-xl bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-all text-xs font-bold"
                >
                  Copy Magnet Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Torrent Info ── */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-500 truncate flex-1 mr-4" title={torrentName}>
          {torrentName}
        </p>
        <p className="text-[10px] text-gray-600 whitespace-nowrap">
          {loading ? 'Connecting…' : error ? 'Failed' : mode === 'sdk' ? 'P2P' : 'Proxy'} · Webtor.io
        </p>
      </div>
    </section>
  );
}
