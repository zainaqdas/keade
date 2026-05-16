// AniList Types
export interface AniListMedia {
  id: number;
  idMal: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
    userPreferred: string;
  };
  coverImage: {
    extraLarge: string;
    large: string;
    medium: string;
    color: string | null;
  };
  bannerImage: string | null;
  description: string;
  episodes: number | null;
  duration: number | null;
  status: string;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  averageScore: number | null;
  meanScore: number | null;
  popularity: number;
  trending: number;
  format: string;
  startDate: FuzzyDate;
  endDate: FuzzyDate | null;
  nextAiringEpisode: AiringEpisode | null;
  airingSchedule: {
    nodes: AiringEpisode[];
  };
  studios: {
    nodes: Studio[];
  };
  trailer: Trailer | null;
  externalLinks: ExternalLink[];
  relations: {
    edges: RelationEdge[];
  };
  recommendations: {
    nodes: RecommendationNode[];
  };
  tags: Tag[];
  synonyms: string[];
  source: string;
  hashtag: string | null;
  updatedAt: number;
}

export interface FuzzyDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface AiringEpisode {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

export interface Studio {
  id: number;
  name: string;
  isAnimationStudio: boolean;
}

export interface Trailer {
  id: string;
  site: string;
  thumbnail: string;
}

export interface ExternalLink {
  id: number;
  url: string;
  site: string;
  color: string | null;
}

export interface RelationEdge {
  id: number;
  relationType: string;
  node: {
    id: number;
    title: { romaji: string; english: string | null };
    format: string;
    status: string;
    coverImage: { large: string };
  };
}

export interface RecommendationNode {
  id: number;
  mediaRecommendation: {
    id: number;
    title: { romaji: string; english: string | null };
    format: string;
    status: string;
    coverImage: { large: string; color: string | null };
    averageScore: number | null;
  };
}

export interface Tag {
  id: number;
  name: string;
  rank: number;
  isMediaSpoiler: boolean;
}

export interface AnimeCardData {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  coverImage: string;
  coverColor: string | null;
  bannerImage: string | null;
  episodes: number | null;
  status: string;
  format: string;
  genres: string[];
  averageScore: number | null;
  popularity: number;
  trending: number;
  season: string | null;
  seasonYear: number | null;
  nextAiringEpisode: AiringEpisode | null;
  description: string | null;
}

export interface AnimeDetailData extends AnimeCardData {
  duration: number | null;
  meanScore: number | null;
  startDate: FuzzyDate;
  endDate: FuzzyDate | null;
  studios: Studio[];
  trailer: Trailer | null;
  externalLinks: ExternalLink[];
  relations: RelationEdge[];
  recommendations: RecommendationNode[];
  tags: Tag[];
  synonyms: string[];
  source: string;
  airingSchedule: AiringEpisode[];
}

// Nyaa.si Torrent Types
export interface NyaaTorrent {
  id: string;
  name: string;
  hash: string;
  date: string;
  filesize: string;
  category: string;
  sub_category: string;
  magnet: string;
  torrent: string;
  seeders: string;
  leechers: string;
  completed: string;
  status: string;
  episode?: number | null;
}

export interface EpisodeGroup {
  episode: number | null;
  torrents: NyaaTorrent[];
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  cached: boolean;
  cachedAt?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  page: number;
  hasNextPage: boolean;
}

// Database Types
export interface CacheEntry {
  id: number;
  data: string;
  cached_at: number;
}
