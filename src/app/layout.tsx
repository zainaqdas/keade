import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Torrinto - Stream & Discover Anime',
  description: 'Stream and download your favorite anime directly in your browser. Browse trending, popular, and currently airing titles with torrent-powered playback.',
  keywords: ['anime', 'stream', 'torrent', 'anilist', 'nyaa', 'torrinto', 'anime streaming'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.jsdelivr.net/npm/@webtor/embed-sdk-js/dist/index.min.js" charSet="utf-8" async />
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
                <svg className="w-5 h-5" viewBox="0 0 28 28" fill="none">
                  <rect x="2" y="2" width="24" height="24" rx="6" fill="url(#footerLogo)" />
                  <path d="M9 9h10v2h-4v8h-2v-8H9V9z" fill="#0a0a1a" />
                  <circle cx="18" cy="18" r="2.5" fill="#fff" opacity="0.3" />
                  <defs>
                    <linearGradient id="footerLogo" x1="0" y1="0" x2="24" y2="24">
                      <stop stopColor="#818cf8" />
                      <stop offset="1" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-sm text-gray-500">
                  Torrinto
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
