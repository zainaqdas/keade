const ANILIST_AUTH_URL = 'https://anilist.co/api/v2/oauth/authorize';
const ANILIST_TOKEN_URL = 'https://anilist.co/api/v2/oauth/token';
const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';

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
  const res = await fetch(ANILIST_TOKEN_URL, {
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

  const res = await fetch(ANILIST_GRAPHQL_URL, {
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
  // First get the user ID
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

  const userRes = await fetch(ANILIST_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
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

  const listsRes = await fetch(ANILIST_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
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

  const res = await fetch(ANILIST_GRAPHQL_URL, {
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
