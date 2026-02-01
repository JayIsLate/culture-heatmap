// Google Trends utilities
// Note: Google doesn't provide a free public API, so we use alternative methods

// Storage for cached trends data
const TRENDS_CACHE_KEY = 'culture-heatmap-google-trends-cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Get cached Google Trends data
 * @returns {Object | null}
 */
function getCachedTrends() {
  const stored = localStorage.getItem(TRENDS_CACHE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Save trends to cache
 * @param {Object} data
 */
function cacheTrends(data) {
  localStorage.setItem(
    TRENDS_CACHE_KEY,
    JSON.stringify({
      ...data,
      timestamp: Date.now(),
    })
  );
}

/**
 * Generate Google Trends explore URL for a topic
 * @param {string} topic
 * @param {string} geo - Geography (default: US)
 * @returns {string}
 */
export function getTrendsExploreUrl(topic, geo = 'US') {
  return `https://trends.google.com/trends/explore?q=${encodeURIComponent(
    topic
  )}&geo=${geo}`;
}

/**
 * Generate Google Trends daily trends URL
 * @param {string} geo
 * @returns {string}
 */
export function getDailyTrendsUrl(geo = 'US') {
  return `https://trends.google.com/trends/trendingsearches/daily?geo=${geo}`;
}

/**
 * Generate Google Trends realtime URL
 * @param {string} geo
 * @returns {string}
 */
export function getRealtimeTrendsUrl(geo = 'US') {
  return `https://trends.google.com/trends/trendingsearches/realtime?geo=${geo}&category=all`;
}

/**
 * Curated trending topics - manually updated or fetched from public sources
 * These are placeholders that can be updated with real data from scraping
 * or manual curation
 */
export const CURATED_TRENDS = [
  {
    id: 'gt-1',
    title: 'AI Generated Content',
    description: 'Rising interest in AI art, music, and video generation',
    change: '+340%',
    category: 'memes',
    source: 'googleTrends',
    url: getTrendsExploreUrl('AI Generated Content'),
  },
  {
    id: 'gt-2',
    title: 'Quiet Luxury',
    description: 'Understated fashion trend gaining momentum',
    change: '+180%',
    category: 'aesthetics',
    source: 'googleTrends',
    url: getTrendsExploreUrl('Quiet Luxury'),
  },
  {
    id: 'gt-3',
    title: 'Stanley Cup Tumbler',
    description: 'Viral drinkware trend continuing',
    change: '+95%',
    category: 'memes',
    source: 'googleTrends',
    url: getTrendsExploreUrl('Stanley Cup Tumbler'),
  },
];

/**
 * Get Google Trends suggestions
 * Since there's no free API, this returns curated data + research links
 * @returns {Promise<{ trends: Array, researchLinks: Array }>}
 */
export async function getGoogleTrendsSuggestions() {
  // Check cache first
  const cached = getCachedTrends();
  if (cached?.trends) {
    return {
      trends: cached.trends,
      researchLinks: getResearchLinks(),
      fromCache: true,
    };
  }

  // Return curated trends with research links
  const result = {
    trends: CURATED_TRENDS,
    researchLinks: getResearchLinks(),
    fromCache: false,
  };

  cacheTrends(result);
  return result;
}

/**
 * Get research links for manual trend discovery
 * @returns {Array}
 */
export function getResearchLinks() {
  return [
    {
      label: 'Google Trends Daily',
      url: getDailyTrendsUrl('US'),
      description: 'Today\'s trending searches',
    },
    {
      label: 'Google Trends Realtime',
      url: getRealtimeTrendsUrl('US'),
      description: 'Currently trending topics',
    },
    {
      label: 'Google Trends Explore',
      url: 'https://trends.google.com/trends/',
      description: 'Search interest over time',
    },
    {
      label: 'Know Your Meme',
      url: 'https://knowyourmeme.com/memes/trending',
      description: 'Trending memes and viral content',
    },
    {
      label: 'TikTok Trending',
      url: 'https://www.tiktok.com/discover',
      description: 'TikTok discover page',
    },
    {
      label: 'Instagram Explore',
      url: 'https://www.instagram.com/explore/',
      description: 'Instagram explore page',
    },
    {
      label: 'Twitter/X Trending',
      url: 'https://twitter.com/explore/tabs/trending',
      description: 'Trending on X',
    },
    {
      label: 'Reddit Popular',
      url: 'https://www.reddit.com/r/popular/',
      description: 'Popular Reddit posts',
    },
  ];
}

/**
 * Manually add/update a curated trend
 * @param {Object} trend
 */
export function addCuratedTrend(trend) {
  const cached = getCachedTrends() || { trends: [...CURATED_TRENDS] };

  const existing = cached.trends.findIndex((t) => t.id === trend.id);
  if (existing >= 0) {
    cached.trends[existing] = { ...cached.trends[existing], ...trend };
  } else {
    cached.trends.unshift({
      id: `gt-${Date.now()}`,
      source: 'googleTrends',
      ...trend,
    });
  }

  cacheTrends(cached);
  return cached.trends;
}

/**
 * Remove a curated trend
 * @param {string} trendId
 */
export function removeCuratedTrend(trendId) {
  const cached = getCachedTrends() || { trends: [...CURATED_TRENDS] };
  cached.trends = cached.trends.filter((t) => t.id !== trendId);
  cacheTrends(cached);
  return cached.trends;
}

/**
 * Clear trends cache
 */
export function clearTrendsCache() {
  localStorage.removeItem(TRENDS_CACHE_KEY);
}
