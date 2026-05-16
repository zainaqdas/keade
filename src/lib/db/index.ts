import Database from 'better-sqlite3';
import path from 'path';
import { CacheEntry } from '@/lib/types';

let db: Database.Database | null = null;

function getDbPath(): string {
  // In production (Vercel), use /tmp directory which is writable
  // In development, use the project directory
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return '/tmp/anime-cache.db';
  }
  return path.join(process.cwd(), 'anime-cache.db');
}

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initDatabase();
  }
  return db;
}

function initDatabase(): void {
  const database = db!;
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS anime_cache (
      id INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anime_search_cache (
      query TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS torrent_cache (
      query TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `);
}

export function getCachedAnime(id: number): CacheEntry | null {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM anime_cache WHERE id = ?');
  return stmt.get(id) as CacheEntry | null;
}

export function setCachedAnime(id: number, data: string): void {
  const database = getDatabase();
  const stmt = database.prepare(
    'INSERT OR REPLACE INTO anime_cache (id, data, cached_at) VALUES (?, ?, ?)'
  );
  stmt.run(id, data, Date.now());
}

export function getCachedSearch(query: string): CacheEntry | null {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM anime_search_cache WHERE query = ?');
  return stmt.get(query.toLowerCase()) as CacheEntry | null;
}

export function setCachedSearch(query: string, data: string): void {
  const database = getDatabase();
  const stmt = database.prepare(
    'INSERT OR REPLACE INTO anime_search_cache (query, data, cached_at) VALUES (?, ?, ?)'
  );
  stmt.run(query.toLowerCase(), data, Date.now());
}

export function getCachedTorrents(query: string): CacheEntry | null {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM torrent_cache WHERE query = ?');
  return stmt.get(query.toLowerCase()) as CacheEntry | null;
}

export function setCachedTorrents(query: string, data: string): void {
  const database = getDatabase();
  const stmt = database.prepare(
    'INSERT OR REPLACE INTO torrent_cache (query, data, cached_at) VALUES (?, ?, ?)'
  );
  stmt.run(query.toLowerCase(), data, Date.now());
}

export function isCacheValid(entry: CacheEntry | null, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  if (!entry) return false;
  return (Date.now() - entry.cached_at) < maxAgeMs;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
