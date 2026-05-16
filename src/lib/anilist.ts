const ANILIST_AUTH_URL = 'https://anilist.co/api/v2/oauth/authorize';
const ANILIST_TOKEN_URL = 'https://anilist.co/api/v2/oauth/token';
const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

/**
 * Resilient fetch wrapper with timeout and retry logic.
 * Retries on network errors and 5xx status codes.
 * Aborts after FETCH_TIMEOUT_MS.
 */
async function fetchAnilist(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Retry on 5xx server errors (but not 4xx client errors)
      if (!res.ok && res.status >= 500 && attempt < retries) {
        console.warn(`[AniList Retry] ${url} returned ${res.status}, retrying (${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // exponential backoff
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timeoutId);

      // If aborted due to timeout (Node.js may throw as Error or DOMException)
      const isAbortError = (err instanceof DOMException || err instanceof Error) && err.name === 'AbortError';
      if (isAbortError) {
        if (attempt < retries) {
          console.warn(`[AniList Retry] ${url} timed out, retrying (${attempt + 1}/${retries})...`);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Request to ${url} timed out after ${FETCH_TIMEOUT_MS}ms`);
      }

      // Network error (ECONNRESET, ENOTFOUND, ETIMEDOUT, etc.)
      if (attempt < retries) {
        console.warn(`[AniList Retry] ${url} failed with ${err instanceof Error ? err.message : err}, retrying (${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      throw err;
    }
  }

  throw new Error('Unreachable: fetchAnilist retry loop exhausted');
}

/** Generate the AniList OAuth authorization URL */
export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.ANILIST_CLIENT_ID!,
    redirect_uri: process.env.ANILIST_REDIRECT_URI!,
    response_type: 'code',
  });
  return `${ANILIST_AUTH_URL}?${params.toString()}`;
}

/** Exchange an OAuth authorization code for an access token */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const res = await fetchAnilist(ANILIST_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.ANILIST_CLIENT_ID!,
      client_secret: process.env.ANILIST_CLIENT_SECRET!,
      redirect_uri: process.env.ANILIST_REDIRECT_URI!,
      code,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }

  return res.json();
}

/** AniList GraphQL user info response */
export interface AniListUser {
  id: number;
  name: string;
  avatar: { large: string; medium: string };
}

/** Fetch the authenticated user's AniList profile */
export async function fetchUser(token: string): Promise<AniListUser> {
  const query = `
    query {
      Viewer {
        id
        name
        avatar { large medium }
      }
    }
  `;

  const res = await fetchAnilist(ANILIST_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch user (${res.status}): ${body}`);
  }

  const json = await res.json();
  return json.data.Viewer as AniListUser;
}

/** AniList media list entry with full media info */
export interface MediaListEntry {
  id: number;
  progress: number;
  status: string;
  score: number;
  startedAt: { year: number | null; month: number | null; day: number | null };
  completedAt: { year: number | null; month: number | null; day: number | null };
  media: {
    id: number;
    title: { romaji: string; english: string | null; native: string | null };
    coverImage: { large: string; medium: string };
    episodes: number | null;
    format: string;
    status: string;
    averageScore: number | null;
    meanScore: number | null;
    genres: string[];
    seasonYear: number | null;
  };
}

/** AniList media list (a named group like "Watching", "Completed", etc.) */
export interface MediaListGroup {
  name: string;
  status: string;
  isCustomList: boolean;
  entries: MediaListEntry[];
}

/** AniList user with stats */
export interface AniListUserWithStats extends AniListUser {
  statistics?: {
    anime: {
      count: number;
      episodesWatched: number;
      minutesWatched: number;
      meanScore: number;
      standardDeviation: number;
    };
  };
}

/** Fetch the authenticated user's full AniList profile with lists */
export async function fetchUserWithLists(token: string): Promise<{
  user: AniListUserWithStats;
  lists: MediaListGroup[];
}> {
  // Fetch user info + stats
  const userQuery = `
    query {
      Viewer {
        id
        name
        avatar { large medium }
        statistics {
          anime {
            count
            episodesWatched
            minutesWatched
            meanScore
            standardDeviation
          }
        }
      }
    }
  `;

  const commonHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const userRes = await fetchAnilist(ANILIST_GRAPHQL_URL, {
    method: 'POST',
    headers: commonHeaders,
    body: JSON.stringify({ query: userQuery }),
  });

  if (!userRes.ok) {
    const body = await userRes.text();
    throw new Error(`Failed to fetch user (${userRes.status}): ${body}`);
  }

  const userJson = await userRes.json();
  const viewer = userJson.data.Viewer as AniListUserWithStats;
  const userId = viewer.id;

  // Then fetch their media lists
  const listsQuery = `
    query ($userId: Int) {
      MediaListCollection(userId: $userId, type: ANIME) {
        lists {
          name
          status
          isCustomList
          entries {
            id
            progress
            status
            score
            startedAt { year month day }
            completedAt { year month day }
            media {
              id
              title { romaji english native }
              coverImage { large medium }
              episodes
              format
              status
              averageScore
              meanScore
              genres
              seasonYear
            }
          }
        }
      }
    }
  `;

  const listsRes = await fetchAnilist(ANILIST_GRAPHQL_URL, {
    method: 'POST',
    headers: commonHeaders,
    body: JSON.stringify({ query: listsQuery, variables: { userId } }),
  });

  if (!listsRes.ok) {
    const body = await listsRes.text();
    throw new Error(`Failed to fetch lists (${listsRes.status}): ${body}`);
  }

  const listsJson = await listsRes.json();
  // MediaListCollection can be null if the user has no entries at all
  const lists = (listsJson.data?.MediaListCollection?.lists as MediaListGroup[]) || [];

  return { user: viewer, lists };
}

/** Fetch the user's media list entry for a specific anime (to check if it's already in a list) */
export async function fetchMediaListEntry(
  token: string,
  mediaId: number,
): Promise<{ id: number; status: string; progress: number; score: number } | null> {
  const query = `
    query ($mediaId: Int) {
      MediaList(mediaId: $mediaId, type: ANIME) {
        id
        status
        progress
        score
      }
    }
  `;

  const res = await fetchAnilist(ANILIST_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables: { mediaId } }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch list entry (${res.status}): ${body}`);
  }

  const json = await res.json();
  // MediaList returns null if the media is not in any list
  return (json.data?.MediaList as { id: number; status: string; progress: number; score: number } | null) || null;
}

/** Save or update a media list entry on AniList (add anime to a list or change its status) */
export async function saveMediaListEntry(
  token: string,
  mediaId: number,
  status: string,
): Promise<{ id: number; status: string; progress: number }> {
  const mutation = `
    mutation ($mediaId: Int, $status: MediaListStatus) {
      SaveMediaListEntry(mediaId: $mediaId, status: $status) {
        id
        status
        progress
      }
    }
  `;

  const res = await fetchAnilist(ANILIST_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: mutation, variables: { mediaId, status } }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to save list entry (${res.status}): ${body}`);
  }

  const json = await res.json();
  return json.data.SaveMediaListEntry as { id: number; status: string; progress: number };
}

/** Sync anime progress on AniList (update episodes watched & optionally mark complete) */
export async function syncProgress(
  token: string,
  mediaId: number,
  progress: number,
  totalEpisodes?: number,
): Promise<{ id: number; progress: number; status: string }> {
  const status = totalEpisodes && progress >= totalEpisodes ? 'COMPLETED' : 'CURRENT';

  const mutation = `
    mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
      SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
        id
        progress
        status
      }
    }
  `;

  const variables: Record<string, unknown> = { mediaId, progress, status };
  if (totalEpisodes && progress >= totalEpisodes) {
    variables.completedAt = { year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() };
  }

  const res = await fetchAnilist(ANILIST_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to sync progress (${res.status}): ${body}`);
  }

  const json = await res.json();
  return json.data.SaveMediaListEntry as { id: number; progress: number; status: string };
}
