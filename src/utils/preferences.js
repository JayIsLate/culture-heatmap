// User preferences for filtering and suggestions

const PREFERENCES_KEY = 'culture-heatmap-preferences';

export const DEFAULT_PREFERENCES = {
  filters: {
    categories: [], // Empty = all categories
    keywords: [],
    excludeKeywords: [],
  },
  platforms: {
    spotify: true,
    googleTrends: true,
    tiktok: false, // Requires paid API
    instagram: false, // Requires paid API
  },
  suggestions: {
    autoRefresh: false,
    refreshInterval: 60, // minutes
  },
};

/**
 * Load preferences from localStorage
 * @returns {Object}
 */
export function getPreferences() {
  const stored = localStorage.getItem(PREFERENCES_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all keys exist
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        filters: {
          ...DEFAULT_PREFERENCES.filters,
          ...parsed.filters,
        },
        platforms: {
          ...DEFAULT_PREFERENCES.platforms,
          ...parsed.platforms,
        },
        suggestions: {
          ...DEFAULT_PREFERENCES.suggestions,
          ...parsed.suggestions,
        },
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Save preferences to localStorage
 * @param {Object} preferences
 */
export function savePreferences(preferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

/**
 * Update specific preference values (shallow merge)
 * @param {Object} updates
 */
export function updatePreferences(updates) {
  const current = getPreferences();
  const updated = {
    ...current,
    ...updates,
    filters: {
      ...current.filters,
      ...(updates.filters || {}),
    },
    platforms: {
      ...current.platforms,
      ...(updates.platforms || {}),
    },
    suggestions: {
      ...current.suggestions,
      ...(updates.suggestions || {}),
    },
  };
  savePreferences(updated);
  return updated;
}

/**
 * Add a keyword to filters
 * @param {string} keyword
 */
export function addKeyword(keyword) {
  const prefs = getPreferences();
  if (!prefs.filters.keywords.includes(keyword.toLowerCase())) {
    prefs.filters.keywords.push(keyword.toLowerCase());
    savePreferences(prefs);
  }
  return prefs;
}

/**
 * Remove a keyword from filters
 * @param {string} keyword
 */
export function removeKeyword(keyword) {
  const prefs = getPreferences();
  prefs.filters.keywords = prefs.filters.keywords.filter(
    (k) => k !== keyword.toLowerCase()
  );
  savePreferences(prefs);
  return prefs;
}

/**
 * Add an exclude keyword
 * @param {string} keyword
 */
export function addExcludeKeyword(keyword) {
  const prefs = getPreferences();
  if (!prefs.filters.excludeKeywords.includes(keyword.toLowerCase())) {
    prefs.filters.excludeKeywords.push(keyword.toLowerCase());
    savePreferences(prefs);
  }
  return prefs;
}

/**
 * Remove an exclude keyword
 * @param {string} keyword
 */
export function removeExcludeKeyword(keyword) {
  const prefs = getPreferences();
  prefs.filters.excludeKeywords = prefs.filters.excludeKeywords.filter(
    (k) => k !== keyword.toLowerCase()
  );
  savePreferences(prefs);
  return prefs;
}

/**
 * Set category filters
 * @param {string[]} categoryIds
 */
export function setCategoryFilters(categoryIds) {
  const prefs = getPreferences();
  prefs.filters.categories = categoryIds;
  savePreferences(prefs);
  return prefs;
}

/**
 * Toggle a platform on/off
 * @param {string} platform
 * @param {boolean} enabled
 */
export function togglePlatform(platform, enabled) {
  const prefs = getPreferences();
  if (platform in prefs.platforms) {
    prefs.platforms[platform] = enabled;
    savePreferences(prefs);
  }
  return prefs;
}

/**
 * Check if a suggestion matches current filters
 * @param {Object} suggestion - { title, description, category, platform }
 * @param {Object} preferences
 * @returns {boolean}
 */
export function matchesFilters(suggestion, preferences = null) {
  const prefs = preferences || getPreferences();
  const { filters } = prefs;

  // Check category filter
  if (
    filters.categories.length > 0 &&
    suggestion.category &&
    !filters.categories.includes(suggestion.category)
  ) {
    return false;
  }

  // Build text to search in
  const searchText = [
    suggestion.title || '',
    suggestion.description || '',
    suggestion.artist || '',
  ]
    .join(' ')
    .toLowerCase();

  // Check exclude keywords
  for (const keyword of filters.excludeKeywords) {
    if (searchText.includes(keyword)) {
      return false;
    }
  }

  // Check include keywords (if any are set, at least one must match)
  if (filters.keywords.length > 0) {
    const hasMatch = filters.keywords.some((keyword) =>
      searchText.includes(keyword)
    );
    if (!hasMatch) {
      return false;
    }
  }

  return true;
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences() {
  savePreferences(DEFAULT_PREFERENCES);
  return DEFAULT_PREFERENCES;
}
