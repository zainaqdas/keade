import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AnimeStream - Watch & Download Anime',
  description: 'Discover, stream, and download your favorite anime titles. Browse trending, popular, and currently airing anime with torrent support.',
  keywords: ['anime', 'stream', 'torrent', 'anilist', 'nyaa', 'anime streaming'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          src="https://cdn.jsdelivr.net/npm/@webtor/embed-sdk-js/dist/index.min.js"
          async
          defer
        />
      </head>
      <body className="min-h-screen bg-[#0a0a1a]">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <a href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg group-hover:scale-110 transition-transform">
                  A
                </div>
                <span className="text-xl font-bold gradient-text hidden sm:block">
                  AnimeStream
                </span>
              </a>

              {/* Navigation Links */}
              <div className="flex items-center gap-6">
                <a
                  href="/#trending"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Trending
                </a>
                <a
                  href="/#popular"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Popular
                </a>
                <a
                  href="/#airing"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Airing
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="pt-16">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                  A
                </div>
                <span className="text-sm text-gray-500">
                  AnimeStream
                </span>
              </div>
              <p className="text-xs text-gray-600 text-center">
                Powered by AniList & Nyaa.si. All content belongs to their respective owners.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
