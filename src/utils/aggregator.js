// Trend aggregation across all data sources
// Combines trends, detects cross-platform signals, matches watchlist

import { getTrendingMusic, isSpotifyConfigured } from './spotify';
import { getYouTubeTrending, isYouTubeConfigured } from './youtube';
import { getTikTokTrending, isTikTokConfigured } from './tiktok';
import { getInstagramTrending, isInstagramConfigured } from './instagram';
import { getLastFmTrending, isLastFmConfigured } from './lastfm';
import { getGoogleTrendsSuggestions } from './googleTrends';
import { aggregateWatchlistMatches, getWatchlist } from './watchlist';
import { calculateEngagementScore } from './metrics';

// Cache for aggregated data
let cachedData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get platform status
 */
export function getPlatformStatus() {
  return {
    spotify: isSpotifyConfigured(),
    youtube: isYouTubeConfigured(),
    tiktok: isTikTokConfigured(),
    instagram: isInstagramConfigured(),
    lastfm: isLastFmConfigured(),
    googleTrends: true, // Always available (curated data)
  };
}

/**
 * Fetch all trending data from configured sources
 * @param {boolean} forceRefresh - Bypass cache
 */
export async function fetchAllTrending(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && cachedData && cacheTimestamp) {
    if (Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedData;
    }
  }

  const status = getPlatformStatus();
  const results = {
    spotify: { viral: [], top: [], newReleases: [] },
    youtube: { trending: [], music: [] },
    tiktok: { videos: [], sounds: [], hashtags: [] },
    instagram: { reels: [], hashtags: [] },
    lastfm: { topArtists: [], topTracks: [], hypedArtists: [], hypedTracks: [] },
    googleTrends: { trends: [], researchLinks: [] },
    errors: [],
    lastUpdated: new Date().toISOString(),
  };

  // Fetch from all configured sources in parallel
  const fetchPromises = [];

  if (status.spotify) {
    fetchPromises.push(
      getTrendingMusic()
        .then((data) => {
          results.spotify = data;
        })
        .catch((e) => results.errors.push({ source: 'spotify', error: e.message }))
    );
  }

  if (status.youtube) {
    fetchPromises.push(
      getYouTubeTrending()
        .then((data) => {
          results.youtube = data;
        })
        .catch((e) => results.errors.push({ source: 'youtube', error: e.message }))
    );
  }

  if (status.tiktok) {
    fetchPromises.push(
      getTikTokTrending()
        .then((data) => {
          results.tiktok = data;
        })
        .catch((e) => results.errors.push({ source: 'tiktok', error: e.message }))
    );
  }

  if (status.instagram) {
    fetchPromises.push(
      getInstagramTrending()
        .then((data) => {
          results.instagram = data;
        })
        .catch((e) => results.errors.push({ source: 'instagram', error: e.message }))
    );
  }

  if (status.lastfm) {
    fetchPromises.push(
      getLastFmTrending()
        .then((data) => {
          results.lastfm = data;
        })
        .catch((e) => results.errors.push({ source: 'lastfm', error: e.message }))
    );
  }

  // Google Trends is always available
  fetchPromises.push(
    getGoogleTrendsSuggestions()
      .then((data) => {
        results.googleTrends = data;
      })
      .catch((e) => results.errors.push({ source: 'googleTrends', error: e.message }))
  );

  await Promise.all(fetchPromises);

  // Cache results
  cachedData = results;
  cacheTimestamp = Date.now();

  return results;
}

/**
 * Get all trends as a flat array for filtering/searching
 */
export function flattenTrends(data) {
  const allTrends = [];

  // Spotify
  if (data.spotify) {
    allTrends.push(...(data.spotify.viral || []).map((t) => ({ ...t, category: 'sounds' })));
    allTrends.push(...(data.spotify.top || []).map((t) => ({ ...t, category: 'sounds' })));
    allTrends.push(...(data.spotify.newReleases || []).map((t) => ({ ...t, category: 'sounds' })));
  }

  // YouTube
  if (data.youtube) {
    allTrends.push(...(data.youtube.trending || []).map((t) => ({ ...t, category: 'memes' })));
    allTrends.push(...(data.youtube.music || []).map((t) => ({ ...t, category: 'sounds' })));
  }

  // TikTok
  if (data.tiktok) {
    allTrends.push(...(data.tiktok.videos || []).map((t) => ({ ...t, category: 'memes' })));
    allTrends.push(...(data.tiktok.sounds || []).map((t) => ({ ...t, category: 'sounds' })));
    allTrends.push(...(data.tiktok.hashtags || []).map((t) => ({ ...t, category: 'memes' })));
  }

  // Instagram
  if (data.instagram) {
    allTrends.push(...(data.instagram.reels || []).map((t) => ({ ...t, category: 'aesthetics' })));
    allTrends.push(...(data.instagram.hashtags || []).map((t) => ({ ...t, category: 'aesthetics' })));
  }

  // Last.fm
  if (data.lastfm) {
    allTrends.push(...(data.lastfm.topArtists || []));
    allTrends.push(...(data.lastfm.topTracks || []));
    allTrends.push(...(data.lastfm.hypedArtists || []));
    allTrends.push(...(data.lastfm.hypedTracks || []));
  }

  // Google Trends
  if (data.googleTrends) {
    allTrends.push(...(data.googleTrends.trends || []));
  }

  return allTrends;
}

/**
 * Filter trends by category
 */
export function filterByCategory(trends, categoryId) {
  if (!categoryId || categoryId === 'all') return trends;
  return trends.filter((t) => t.category === categoryId);
}

/**
 * Filter trends by platform/source
 */
export function filterBySource(trends, sources) {
  if (!sources || sources.length === 0) return trends;
  return trends.filter((t) => sources.includes(t.source));
}

/**
 * Search trends by keyword
 */
export function searchTrends(trends, query) {
  if (!query) return trends;

  const lowerQuery = query.toLowerCase();
  return trends.filter((t) => {
    const searchText = [
      t.title || '',
      t.name || '',
      t.description || '',
      t.artist || '',
      t.author || '',
      t.channel || '',
      ...(t.hashtags || []),
    ]
      .join(' ')
      .toLowerCase();

    return searchText.includes(lowerQuery);
  });
}

/**
 * Detect cross-platform trends (same topic appearing on multiple sources)
 */
export function detectCrossPlatformTrends(trends) {
  // Group by normalized title/name
  const grouped = {};

  for (const trend of trends) {
    const key = normalizeTrendName(trend.title || trend.name || '');
    if (!key) continue;

    if (!grouped[key]) {
      grouped[key] = {
        name: trend.title || trend.name,
        trends: [],
        sources: new Set(),
        totalEngagement: 0,
      };
    }

    grouped[key].trends.push(trend);
    grouped[key].sources.add(trend.source);

    // Sum up engagement
    if (trend.metrics) {
      grouped[key].totalEngagement +=
        (trend.metrics.views || 0) +
        (trend.metrics.likes || 0) * 10 +
        (trend.metrics.videoCount || 0) * 100;
    }
  }

  // Filter to only cross-platform (2+ sources)
  return Object.values(grouped)
    .filter((g) => g.sources.size >= 2)
    .map((g) => ({
      name: g.name,
      sources: Array.from(g.sources),
      sourceCount: g.sources.size,
      trends: g.trends,
      totalEngagement: g.totalEngagement,
    }))
    .sort((a, b) => b.sourceCount - a.sourceCount || b.totalEngagement - a.totalEngagement);
}

/**
 * Normalize trend name for comparison
 */
function normalizeTrendName(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get watchlist matches from current trends
 */
export function getWatchlistMatches(data) {
  const allTrends = flattenTrends(data);
  return aggregateWatchlistMatches(allTrends);
}

/**
 * Sort trends by engagement/popularity
 */
export function sortByEngagement(trends) {
  return [...trends].sort((a, b) => {
    const aScore = calculateTrendScore(a);
    const bScore = calculateTrendScore(b);
    return bScore - aScore;
  });
}

/**
 * Calculate a trend's score for sorting
 */
function calculateTrendScore(trend) {
  if (!trend.metrics) return trend.popularity || 0;

  const { views = 0, likes = 0, comments = 0, shares = 0, videoCount = 0 } = trend.metrics;

  // Weight different metrics
  return views + likes * 10 + comments * 20 + shares * 30 + videoCount * 100;
}

/**
 * Get aggregated data organized by category
 */
export async function getAggregatedByCategory(forceRefresh = false) {
  const data = await fetchAllTrending(forceRefresh);
  const allTrends = flattenTrends(data);

  return {
    sounds: filterByCategory(allTrends, 'sounds'),
    creators: filterByCategory(allTrends, 'creators'),
    aesthetics: filterByCategory(allTrends, 'aesthetics'),
    memes: filterByCategory(allTrends, 'memes'),
    all: allTrends,
    crossPlatform: detectCrossPlatformTrends(allTrends),
    watchlistMatches: getWatchlistMatches(data),
    raw: data,
  };
}

/**
 * Clear the cache
 */
export function clearCache() {
  cachedData = null;
  cacheTimestamp = null;
}

/**
 * Get cache status
 */
export function getCacheStatus() {
  if (!cachedData || !cacheTimestamp) {
    return { cached: false };
  }

  const age = Date.now() - cacheTimestamp;
  return {
    cached: true,
    age,
    stale: age > CACHE_DURATION,
    lastUpdated: new Date(cacheTimestamp).toISOString(),
  };
}
