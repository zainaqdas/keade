/**
 * Extract episode number from torrent title/name.
 * Handles various common anime torrent naming conventions.
 */

// Common patterns for episode numbers in torrent names
const EPISODE_PATTERNS = [
  // Title S01E01 (handle separately - 2 capture groups)
  { pattern: /[Ss](\d{1,2})[Ee](\d{1,4})/, hasSeason: true },
  // [SubGroup] Title - 01 [1080p] or Title - Episode 01
  { pattern: /[-–]\s*(?:Episode\s*)?(\d{1,4})(?:\s*[vV]\d)?(?:\s*\(?\d{3,4}p\)?)?\s*(?:-\s*)?(?:\[|$|–|-)/ },
  // [SubGroup] Title - 01v2
  { pattern: /[-–]\s*(?:Episode\s*)?(\d{1,4})[vV]\d/ },
  // Title - 01 (with various endings)
  { pattern: /[-–]\s*(\d{1,4})\s*(?:\(|\[|$|–|-)/ },
  // [SubGroup] Title 01 [1080p]
  { pattern: /(?:\s|\[)\d{1,4}\s*(?:[vV]\d)?\s*\[/ },
  // Match just the number at the end like "Title 01"
  { pattern: /\s(\d{1,4})\s*$/ },
  // Match "Ep 01" or "EP01"
  { pattern: /[Ee][Pp]\s*\.?\s*(\d{1,4})/ },
  // Match just a standalone number after a space (careful with this one)
  { pattern: /^(\d{1,4})\s/ },
];

/**
 * Extract episode number from a torrent title.
 * Returns null if no episode number can be determined.
 */
export function extractEpisodeNumber(title: string): number | null {
  // Clean the title a bit
  const cleanTitle = title.trim();

  for (const entry of EPISODE_PATTERNS) {
    const match = cleanTitle.match(entry.pattern);
    if (match) {
      // If it's an S01E01 pattern, return the episode number (second capture group)
      if (entry.hasSeason && match[2] !== undefined) {
        return parseInt(match[2], 10);
      }
      // For patterns without capture groups (like [SubGroup] Title 01 [1080p]),
      // extract the number directly from the match
      if (match.length === 1) {
        const numMatch = cleanTitle.match(/(\d{1,4})/);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          if (!isNaN(num) && num >= 1 && num <= 9999) {
            return num;
          }
        }
        continue;
      }
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= 1 && num <= 9999) {
        return num;
      }
    }
  }

  // Try to find numbers that look like episode numbers in brackets
  // e.g., [01] or [Ep01]
  const bracketMatch = cleanTitle.match(/[\[\(](?:Ep|EP)?\.?\s*(\d{1,4})\s*[\]\)]/);
  if (bracketMatch) {
    const num = parseInt(bracketMatch[1], 10);
    if (!isNaN(num) && num >= 1 && num <= 9999) {
      return num;
    }
  }

  return null;
}

/**
 * Extract season number from a torrent title.
 * Returns null if no season can be determined.
 * Handles: S01, Season 1, 1st Season, 1st Season, S1, etc.
 */
export function extractSeasonNumber(name: string): number | null {
  const patterns = [
    /[Ss](\d{1,2})[Ee]\d{1,4}/,           // S01E01
    /(?:^|\s|\[|\(|\.)S(\d{1,2})(?:\s|\]|\)|\.|$)/,  // [S01], (S1), S1
    /[Ss]eason\s*(\d{1,2})/i,              // Season 1
    /(\d{1,2})(?:st|nd|rd|th)\s*[Ss]eason/i, // 1st Season, 2nd Season
    /[Ss](\d{1,2})\s*[-–]/,                // S1 -
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= 1 && num <= 100) {
        return num;
      }
    }
  }

  return null;
}

/**
 * Extract a 4-digit year from a torrent title.
 * Returns null if no year can be determined.
 */
export function extractYearFromName(name: string): number | null {
  // Look for years in parentheses, brackets, or standalone (1900-2099)
  const match = name.match(/(?:\[|\()(19\d{2}|20\d{2})(?:\]|\))/);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Also check for years not in brackets but with context
  const standaloneMatch = name.match(/(?:^|\s)(19\d{2}|20\d{2})(?:\s|$)/);
  if (standaloneMatch) {
    return parseInt(standaloneMatch[1], 10);
  }

  return null;
}

/**
 * Check if a torrent name is likely for the given anime, filtering out
 * torrents from different seasons based on season/year markers in the name.
 *
 * This prevents e.g. Attack on Titan S02E01 from appearing when
 * searching for Attack on Titan Season 1 Episode 1.
 */
export function isTorrentForAnime(
  torrentName: string,
  anime: {
    seasonYear?: number | null;
    season?: string | null;
    startYear?: number | null;
    totalEpisodes?: number | null;
  }
): boolean {
  const torrentSeason = extractSeasonNumber(torrentName);
  const torrentYear = extractYearFromName(torrentName);

  // If the torrent name has a season number (S02, Season 2, etc.),
  // filter out torrents that claim to be from a later season than
  // this AniList entry could reasonably contain.
  //
  // Each AniList entry typically represents ONE season/cour of a show.
  // If an anime has 25 episodes and a torrent says S02E01, that torrent
  // belongs to a DIFFERENT AniList entry (Attack on Titan S1 vs S2).
  //
  // Only skip filtering for anime with many episodes (50+) where
  // multiple seasons might exist within a single AniList entry
  // (e.g., long-running shows like One Piece).
  if (torrentSeason !== null && torrentSeason > 1) {
    if (anime.totalEpisodes && anime.totalEpisodes <= 36) {
      // Small episode count — S02+ torrent likely belongs to a
      // different AniList entry.
      return false;
    }
    // For larger episode counts, also check if the claimed season
    // is implausible given the total episodes.
    if (anime.totalEpisodes && torrentSeason * 13 > anime.totalEpisodes + 13) {
      return false;
    }
  }

  // If the torrent name contains a year, check it against the anime's year
  if (torrentYear !== null) {
    const targetYear = anime.seasonYear || anime.startYear;
    if (targetYear !== null && targetYear !== undefined) {
      // Allow a 1-year tolerance (shows that start in Fall often
      // continue into the next year on torrents)
      if (Math.abs(torrentYear - targetYear) > 1) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a torrent is a batch/complete collection rather than a single episode.
 */
export function isBatchTorrent(name: string): boolean {
  const batchPatterns = [
    /batch/i,
    /complete\s*series/i,
    /complete\s*collection/i,
    /full\s*series/i,
    /全部/i,
    /全集/i,
  ];
  return batchPatterns.some(pattern => pattern.test(name));
}

/**
 * Group a list of torrents by their episode number.
 */
export function groupTorrentsByEpisode<T extends { name: string; episode?: number | null }>(
  torrents: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  
  // Sort torrents with episode numbers, batches at the end
  const sorted = [...torrents].sort((a, b) => {
    const epA = extractEpisodeNumber(a.name);
    const epB = extractEpisodeNumber(b.name);
    
    if (epA === null && epB === null) return 0;
    if (epA === null) return 1;
    if (epB === null) return -1;
    return epA - epB;
  });

  for (const torrent of sorted) {
    const ep = torrent.episode ?? extractEpisodeNumber(torrent.name);
    const key = ep !== null ? `Episode ${ep}` : 'Other / Batch';
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(torrent);
  }

  return groups;
}
