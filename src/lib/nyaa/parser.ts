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
