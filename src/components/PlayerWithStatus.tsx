'use client';

import { useEffect, useRef, useState } from 'react';

interface PlayerWithStatusProps {
  magnet: string;
  poster?: string;
  title?: string;
  onClose: () => void;
  torrentName: string;
}

type PlayerStatus = 'initializing' | 'connecting' | 'downloading' | 'ready' | 'error';

interface ProgressData {
  progress?: number;   // 0 to 1
  speed?: number;      // B/s
  peers?: number;      // connected peers
  downloaded?: number;  // bytes
  total?: number;       // total bytes
}

const CONNECT_TIMEOUT_MS = 60_000; // 60 seconds before showing error

export default function PlayerWithStatus({
  magnet,
  poster,
  title,
  onClose,
  torrentName,
}: PlayerWithStatusProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<PlayerStatus>('initializing');
  const [peers, setPeers] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec === 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(1024));
    return `${(bytesPerSec / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, units.length - 1)]}`;
  };

  const formatProgress = (pct: number): string => {
    return `${(pct * 100).toFixed(1)}%`;
  };

  useEffect(() => {
    const container = playerRef.current;
    if (!container) return;

    setStatus('connecting');

    // Timeout: if we stay in connecting/downloading too long, show error
    const timeoutId = setTimeout(() => {
      setStatus(prev => {
        if (prev === 'ready') return prev;
        setErrorMsg('Connection timed out. The torrent may have no seeders or the magnet link is invalid.');
        return 'error';
      });
    }, CONNECT_TIMEOUT_MS);

    // Short delay for React to render container first
    const renderTimer = setTimeout(() => {
      const w = window as any;

      // Reset webtor queue to avoid stale players from previous plays
      w.webtor = w.webtor || [];
      w.webtor.length = 0; // clear array without reassigning

      w.webtor.push({
        id: 'webtor-player',
        magnet,
        poster: poster || '',
        width: '100%',
        title: title || torrentName,
        header: true,
        controls: true,
        features: {
          subtitles: true,
          settings: true,
          fullscreen: true,
          playpause: true,
          currentTime: true,
          timeline: true,
          duration: true,
          volume: true,
          chromecast: true,
          embed: true,
          opensubtitles: true,
        },
        on: function (arg: any) {
          // Handle both player-object API and direct event-string API
          if (arg && typeof arg === 'object' && typeof arg.on === 'function') {
            // Player object API: arg.on('event', callback)
            const player = arg;
            player.on('loaded', () => {
              clearTimeout(timeoutId);
              setStatus('downloading');
            });
            player.on('ready', () => {
              clearTimeout(timeoutId);
              setStatus('ready');
              setProgress(1);
            });
            player.on('progress', (data: ProgressData) => {
              if (data) {
                if (data.progress !== undefined) setProgress(data.progress);
                if (data.peers !== undefined) setPeers(data.peers);
                if (data.speed !== undefined) setSpeed(data.speed);
                if (data.progress !== undefined && data.progress > 0 && data.progress < 1) {
                  setStatus('downloading');
                }
              }
            });
            player.on('error', (err: any) => {
              clearTimeout(timeoutId);
              console.error('WebTor player error:', err);
              setStatus('error');
              setErrorMsg(typeof err === 'string' ? err : 'Failed to load torrent');
            });
          } else if (typeof arg === 'string') {
            // Direct event string API: on('ready'), on('error'), etc.
            clearTimeout(timeoutId);
            switch (arg) {
              case 'loaded':
                setStatus('downloading');
                break;
              case 'ready':
                setStatus('ready');
                setProgress(1);
                break;
              case 'error':
                setStatus('error');
                setErrorMsg('Failed to load torrent');
                break;
            }
          } else if (arg && typeof arg === 'object') {
            // Could be progress data or error event
            clearTimeout(timeoutId);
            if ('progress' in arg) {
              const data = arg as ProgressData;
              if (data.progress !== undefined) setProgress(data.progress);
              if (data.peers !== undefined) setPeers(data.peers);
              if (data.speed !== undefined) setSpeed(data.speed);
              if (data.progress !== undefined && data.progress > 0) {
                setStatus('downloading');
              }
            }
          }
        },
      });
    }, 150);

    // Cleanup: destroy player on unmount
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(renderTimer);

      // Try to clean up the WebTor iframe from the DOM
      const playerEl = document.getElementById('webtor-player');
      if (playerEl) {
        const iframe = playerEl.querySelector('iframe');
        if (iframe) {
          iframe.src = 'about:blank';
          iframe.remove();
        }
        // Don't clear innerHTML of the container — just the iframe
      }

      // Remove any leftover webtor player elements that the SDK might have added outside
      document.querySelectorAll('.webtor-player-container, .webtor-iframe-container').forEach(el => el.remove());
    };
  }, [magnet, poster, title, torrentName]);

  return (
    <section className="glass rounded-2xl p-4" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">Now Playing</h2>
          {status !== 'ready' && status !== 'error' && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/15 text-indigo-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
              {status === 'initializing' && 'Preparing...'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'downloading' && 'Loading'}
            </span>
          )}
          {status === 'ready' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-500/15 text-green-400">
              Ready
            </span>
          )}
          {status === 'error' && (
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

      {/* Player Container with Status Overlay */}
      <div className="relative rounded-xl overflow-hidden bg-black/50 border border-white/5">
        {/* Player Element */}
        <div
          id="webtor-player"
          ref={playerRef}
          className="webtor-player"
          style={{ minHeight: '300px' }}
        />

        {/* Status Overlay (while not ready and not error) */}
        {status !== 'ready' && status !== 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a1a]/90 backdrop-blur-sm z-10">
            {/* Animated Torrent Icon */}
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              {/* Progress ring */}
              <svg className="absolute -top-1 -left-1 -right-1 -bottom-1 w-[72px] h-[72px] -z-10" viewBox="0 0 72 72">
                <circle
                  cx="36" cy="36" r="33"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-indigo-500/30"
                />
                <circle
                  cx="36" cy="36" r="33"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${Math.min(progress, 0.95) * 207} 207`}
                  strokeLinecap="round"
                  className="text-indigo-400 transition-all duration-500"
                  transform="rotate(-90 36 36)"
                />
              </svg>
            </div>

            {/* Status Text */}
            <p className="text-white font-semibold text-sm mb-3">
              {status === 'initializing' && 'Initializing player...'}
              {status === 'connecting' && 'Connecting to torrent network...'}
              {status === 'downloading' && 'Downloading torrent...'}
            </p>

            {/* Live Stats */}
            <div className="flex items-center gap-4 mb-1">
              {/* Peers */}
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-xs font-medium text-gray-400">
                  {peers > 0 ? `${peers} peers` : 'searching...'}
                </span>
              </div>

              {/* Speed */}
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs font-medium text-gray-400">
                  {speed > 0 ? formatSpeed(speed) : '—'}
                </span>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-xs font-medium text-gray-400">
                  {formatProgress(progress)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-64 max-w-full h-1 rounded-full bg-white/5 mt-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a1a]/90 backdrop-blur-sm z-10">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-400 font-medium text-sm mb-1">Failed to load torrent</p>
            {errorMsg && (
              <p className="text-gray-500 text-xs max-w-xs text-center mb-4">{errorMsg}</p>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs"
            >
              Close Player
            </button>
          </div>
        )}
      </div>

      {/* Torrent Info */}
      <p className="text-xs text-gray-500 mt-2 truncate" title={torrentName}>
        {torrentName}
      </p>
    </section>
  );
}
