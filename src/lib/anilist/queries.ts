import { AniListMedia, AnimeCardData, AnimeDetailData, AiringEpisode } from '@/lib/types';

const ANILIST_API = 'https://graphql.anilist.co';

const ANIME_CARD_FRAGMENT = `
  fragment AnimeCard on Media {
    id
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
      color
    }
    bannerImage
    episodes
    status
    format
    genres
    averageScore
    popularity
    trending
    season
    seasonYear
    nextAiringEpisode {
      id
      airingAt
      timeUntilAiring
      episode
    }
    description
  }
`;

const TRENDING_QUERY = `
  ${ANIME_CARD_FRAGMENT}
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        total
      }
      media(sort: TRENDING_DESC, type: ANIME) {
        ...AnimeCard
      }
    }
  }
`;

const POPULAR_QUERY = `
  ${ANIME_CARD_FRAGMENT}
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        total
      }
      media(sort: POPULARITY_DESC, type: ANIME) {
        ...AnimeCard
      }
    }
  }
`;

const AIRING_QUERY = `
  ${ANIME_CARD_FRAGMENT}
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        total
      }
      media(status: RELEASING, sort: POPULARITY_DESC, type: ANIME) {
        ...AnimeCard
      }
    }
  }
`;

const SEARCH_QUERY = `
  ${ANIME_CARD_FRAGMENT}
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        total
      }
      media(search: $search, sort: SEARCH_MATCH, type: ANIME) {
        ...AnimeCard
      }
    }
  }
`;

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        extraLarge
        large
        medium
        color
      }
      bannerImage
      description
      episodes
      duration
      status
      season
      seasonYear
      genres
      averageScore
      meanScore
      popularity
      trending
      format
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      nextAiringEpisode {
        id
        airingAt
        timeUntilAiring
        episode
      }
      airingSchedule(notYetAired: true, perPage: 50) {
        nodes {
          id
          airingAt
          timeUntilAiring
          episode
        }
      }
      studios(isMain: true) {
        nodes {
          id
          name
          isAnimationStudio
        }
      }
      trailer {
        id
        site
        thumbnail
      }
      externalLinks {
        id
        url
        site
        color
      }
      relations {
        edges {
          id
          relationType
          node {
            id
            title {
              romaji
              english
            }
            format
            status
            coverImage {
              large
            }
          }
        }
      }
      recommendations(sort: RATING_DESC, perPage: 6) {
        nodes {
          id
          mediaRecommendation {
            id
            title {
              romaji
              english
            }
            format
            status
            coverImage {
              large
              color
            }
            averageScore
          }
        }
      }
      tags {
        id
        name
        rank
        isMediaSpoiler
      }
      synonyms
      source
      hashtag
      updatedAt
    }
  }
`;

async function fetchGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(ANILIST_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`AniList API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  
  if (json.errors) {
    throw new Error(`AniList API error: ${json.errors[0]?.message}`);
  }

  return json.data;
}

function formatMediaList(mediaList: AniListMedia[]): AnimeCardData[] {
  return mediaList.map(formatCardData);
}

function formatCardData(media: AniListMedia): AnimeCardData {
  return {
    id: media.id,
    title: media.title,
    coverImage: media.coverImage.extraLarge || media.coverImage.large,
    coverColor: media.coverImage.color,
    bannerImage: media.bannerImage,
    episodes: media.episodes,
    status: media.status,
    format: media.format,
    genres: media.genres,
    averageScore: media.averageScore,
    popularity: media.popularity,
    trending: media.trending,
    season: media.season,
    seasonYear: media.seasonYear,
    nextAiringEpisode: media.nextAiringEpisode,
    description: media.description,
  };
}

export async function getTrendingAnime(page: number = 1, perPage: number = 30): Promise<{ media: AnimeCardData[]; hasNextPage: boolean }> {
  const data = await fetchGraphQL<{ Page: { media: AniListMedia[]; pageInfo: { hasNextPage: boolean } } }>(
    TRENDING_QUERY,
    { page, perPage }
  );
  return {
    media: formatMediaList(data.Page.media),
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}

export async function getPopularAnime(page: number = 1, perPage: number = 30): Promise<{ media: AnimeCardData[]; hasNextPage: boolean }> {
  const data = await fetchGraphQL<{ Page: { media: AniListMedia[]; pageInfo: { hasNextPage: boolean } } }>(
    POPULAR_QUERY,
    { page, perPage }
  );
  return {
    media: formatMediaList(data.Page.media),
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}

export async function getAiringAnime(page: number = 1, perPage: number = 30): Promise<{ media: AnimeCardData[]; hasNextPage: boolean }> {
  const data = await fetchGraphQL<{ Page: { media: AniListMedia[]; pageInfo: { hasNextPage: boolean } } }>(
    AIRING_QUERY,
    { page, perPage }
  );
  return {
    media: formatMediaList(data.Page.media),
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}

export async function searchAnime(search: string, page: number = 1, perPage: number = 20): Promise<{ media: AnimeCardData[]; hasNextPage: boolean }> {
  const data = await fetchGraphQL<{ Page: { media: AniListMedia[]; pageInfo: { hasNextPage: boolean } } }>(
    SEARCH_QUERY,
    { search, page, perPage }
  );
  return {
    media: formatMediaList(data.Page.media),
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}

export async function getAnimeDetail(id: number): Promise<AnimeDetailData | null> {
  const data = await fetchGraphQL<{ Media: AniListMedia | null }>(
    DETAIL_QUERY,
    { id }
  );

  const media = data.Media;
  if (!media) return null;
  
  // Ensure airingSchedule is properly handled
  const airingSchedule: AiringEpisode[] = media.airingSchedule?.nodes || [];
  if (media.nextAiringEpisode && !airingSchedule.find(e => e.episode === media.nextAiringEpisode!.episode)) {
    airingSchedule.unshift(media.nextAiringEpisode);
  }

  return {
    ...formatCardData(media),
    duration: media.duration,
    meanScore: media.meanScore,
    startDate: media.startDate,
    endDate: media.endDate,
    studios: media.studios?.nodes || [],
    trailer: media.trailer,
    externalLinks: media.externalLinks || [],
    relations: media.relations?.edges || [],
    recommendations: media.recommendations?.nodes || [],
    tags: media.tags || [],
    synonyms: media.synonyms || [],
    source: media.source || '',
    airingSchedule,
  };
}
