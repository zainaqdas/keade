export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a1a] flex flex-col items-center justify-center">
      {/* Background gradient orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-indigo-500/8 via-purple-500/5 to-transparent pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Logo */}
      <div className="relative mb-8">
        {/* Glow behind logo */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 rounded-2xl blur-xl animate-pulse" />

        {/* Logo icon */}
        <div className="relative w-20 h-20">
          <svg className="w-full h-full" viewBox="0 0 80 80" fill="none">
            {/* Background */}
            <rect x="4" y="4" width="72" height="72" rx="16" fill="url(#loadGrad)" />
            <rect x="4" y="4" width="72" height="72" rx="16" stroke="url(#loadGrad)" strokeWidth="2" opacity="0.3" />
            {/* Stylized T */}
            <path d="M27 26h26v5h-11v22h-5V31H27v-5z" fill="#0a0a1a" />
            {/* Seed dot */}
            <circle cx="54" cy="54" r="7" fill="url(#loadGrad)" />
            <path d="M51 54h6M54 51v6" stroke="#0a0a1a" strokeWidth="2.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="loadGrad" x1="0" y1="0" x2="80" y2="80">
                <stop stopColor="#818cf8" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>

          {/* Rotating ring */}
          <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] animate-spin-slow" viewBox="0 0 88 88" fill="none">
            <circle cx="44" cy="44" r="40" stroke="url(#ringGrad)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="180 100" />
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="88" y2="88">
                <stop stopColor="#6366f1" stopOpacity="0" />
                <stop offset="0.5" stopColor="#818cf8" stopOpacity="0.6" />
                <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Name */}
      <h1 className="text-2xl font-black gradient-text tracking-tight mb-2">
        Torrentio
      </h1>
      <p className="text-sm text-gray-500 mb-10">
        Loading your anime...
      </p>

      {/* Loading bar */}
      <div className="w-48 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-load-bar" />
      </div>

      {/* Loading dots */}
      <div className="flex items-center gap-1.5 mt-6">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
