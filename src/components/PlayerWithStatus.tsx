'use client';

import { useState, useRef, useEffect } from 'react';

interface PlayerWithStatusProps {
  magnet: string;
  poster?: string;
  title?: string;
  onClose: () => void;
  torrentName: string;
}

export default function PlayerWithStatus({
  magnet,
  poster,
  title,
  onClose,
  torrentName,
}: PlayerWithStatusProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const embedUrl = `https://webtor.io/show?magnet=${encodeURIComponent(magnet)}`;

  useEffect(() => {
    // If iframe doesn't load within 30s, show a warning but don't block
    timeoutRef.current = setTimeout(() => {
      setLoadTimeout(true);
    }, 30_000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [magnet]);

  return (
    <section className="glass rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">Now Playing</h2>
          {loading && !error && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-500/15 text-yellow-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
              </span>
              Loading...
            </span>
          )}
          {error && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/15 text-red-400">
              Error
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
        >
          Close
        </button>
      </div>

      {/* Player Container */}
      <div className="relative rounded-xl overflow-hidden bg-black border border-white/5">
        {/* Iframe Player */}
        <div className="w-full" style={{ minHeight: '360px', maxHeight: '540px' }}>
          <iframe
            src={embedUrl}
            title="Video Player"
            className="w-full h-full border-0"
            style={{ minHeight: '360px', maxHeight: '540px' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            onLoad={() => {
              setLoading(false);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
            }}
            onError={() => {
              setError('Failed to load the video player.');
              setLoading(false);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
            }}
          />

          {/* Loading Overlay */}
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a1a]/90 backdrop-blur-sm z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-sm mb-2">Loading Webtor Player...</p>
              <p className="text-gray-500 text-xs text-center max-w-sm">
                Connecting to torrent network via Webtor.io proxy.
              </p>
              {loadTimeout && (
                <p className="text-yellow-500 text-xs text-center max-w-sm mt-3">
                  This is taking longer than expected. The torrent may have few seeders or your browser may be blocking third-party content.
                </p>
              )}
            </div>
          )}

          {/* Error Overlay */}
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

      {/* Torrent Info */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-500 truncate flex-1 mr-4" title={torrentName}>
          {torrentName}
        </p>
        <p className="text-[10px] text-gray-600 whitespace-nowrap">
          {loading ? 'Connecting...' : error ? 'Failed' : 'Streaming'} · Powered by Webtor.io
        </p>
      </div>
    </section>
  );
}
