// Watchlist management for tracking keywords and topics

const WATCHLIST_KEY = 'culture-heatmap-watchlist';

/**
 * Default watchlist structure
 */
const DEFAULT_WATCHLIST = {
  keywords: [],
  lastUpdated: null,
};

/**
 * Get watchlist from storage
 */
export function getWatchlist() {
  const stored = localStorage.getItem(WATCHLIST_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_WATCHLIST;
    }
  }
  return DEFAULT_WATCHLIST;
}

/**
 * Save watchlist to storage
 */
export function saveWatchlist(watchlist) {
  watchlist.lastUpdated = new Date().toISOString();
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
}

/**
 * Add a keyword to watchlist
 * @param {string} keyword
 * @param {string} category - Optional category hint
 */
export function addToWatchlist(keyword, category = null) {
  const watchlist = getWatchlist();
  const normalized = keyword.toLowerCase().trim();

  // Check if already exists
  if (watchlist.keywords.some((k) => k.term === normalized)) {
    return watchlist;
  }

  watchlist.keywords.push({
    id: Date.now().toString(36),
    term: normalized,
    displayTerm: keyword.trim(),
    category,
    addedAt: new Date().toISOString(),
    matchCount: 0,
  });

  saveWatchlist(watchlist);
  return watchlist;
}

/**
 * Remove a keyword from watchlist
 * @param {string} id
 */
export function removeFromWatchlist(id) {
  const watchlist = getWatchlist();
  watchlist.keywords = watchlist.keywords.filter((k) => k.id !== id);
  saveWatchlist(watchlist);
  return watchlist;
}

/**
 * Update match count for a keyword
 * @param {string} id
 * @param {number} count
 */
export function updateMatchCount(id, count) {
  const watchlist = getWatchlist();
  const keyword = watchlist.keywords.find((k) => k.id === id);
  if (keyword) {
    keyword.matchCount = count;
    keyword.lastMatched = new Date().toISOString();
    saveWatchlist(watchlist);
  }
  return watchlist;
}

/**
 * Check if a trend matches any watchlist keywords
 * @param {Object} trend - Trend object with title, description, etc.
 * @param {Array} keywords - Watchlist keywords
 * @returns {Array} - Matching keyword objects
 */
export function findWatchlistMatches(trend, keywords = null) {
  const watchlist = keywords || getWatchlist().keywords;
  const matches = [];

  // Build searchable text from trend
  const searchText = [
    trend.title || '',
    trend.name || '',
    trend.description || '',
    trend.artist || '',
    trend.channel || '',
    ...(trend.hashtags || []),
  ]
    .join(' ')
    .toLowerCase();

  for (const keyword of watchlist) {
    // Check for exact word match or hashtag match
    const term = keyword.term.toLowerCase();
    const termRegex = new RegExp(`\\b${escapeRegex(term)}\\b|#${escapeRegex(term)}`, 'i');

    if (termRegex.test(searchText)) {
      matches.push(keyword);
    }
  }

  return matches;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Aggregate watchlist matches across all trends
 * @param {Array} trends - Array of trend objects from various sources
 * @returns {Object} - Map of keyword ID to matching trends
 */
export function aggregateWatchlistMatches(trends) {
  const watchlist = getWatchlist();
  const matchMap = {};

  // Initialize match map
  for (const keyword of watchlist.keywords) {
    matchMap[keyword.id] = {
      keyword,
      matches: [],
      sources: new Set(),
    };
  }

  // Find matches for each trend
  for (const trend of trends) {
    const matches = findWatchlistMatches(trend, watchlist.keywords);
    for (const match of matches) {
      matchMap[match.id].matches.push(trend);
      matchMap[match.id].sources.add(trend.source);
    }
  }

  // Convert Sets to arrays and filter empty
  const results = Object.values(matchMap)
    .map((item) => ({
      ...item,
      sources: Array.from(item.sources),
      matchCount: item.matches.length,
    }))
    .filter((item) => item.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount);

  // Update match counts in storage
  for (const result of results) {
    updateMatchCount(result.keyword.id, result.matchCount);
  }

  return results;
}

/**
 * Get watchlist keywords sorted by match count
 */
export function getWatchlistSorted() {
  const watchlist = getWatchlist();
  return {
    ...watchlist,
    keywords: [...watchlist.keywords].sort((a, b) => (b.matchCount || 0) - (a.matchCount || 0)),
  };
}

/**
 * Clear all watchlist keywords
 */
export function clearWatchlist() {
  saveWatchlist(DEFAULT_WATCHLIST);
  return DEFAULT_WATCHLIST;
}

/**
 * Import keywords in bulk
 * @param {Array<string>} keywords
 */
export function importKeywords(keywords) {
  const watchlist = getWatchlist();

  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase().trim();
    if (normalized && !watchlist.keywords.some((k) => k.term === normalized)) {
      watchlist.keywords.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        term: normalized,
        displayTerm: keyword.trim(),
        category: null,
        addedAt: new Date().toISOString(),
        matchCount: 0,
      });
    }
  }

  saveWatchlist(watchlist);
  return watchlist;
}
