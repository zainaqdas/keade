import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

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
        <script src="https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js" defer />
      </head>
      <body className="min-h-screen bg-[#0a0a1a]">
        <Navbar />
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
