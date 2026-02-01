// Platform detection and category suggestions

export const PLATFORMS = {
  tiktok: {
    name: 'TikTok',
    icon: '📱',
    patterns: [/tiktok\.com/, /vm\.tiktok\.com/],
    suggestedCategories: ['sounds', 'creators', 'memes'],
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    patterns: [/instagram\.com/, /instagr\.am/],
    suggestedCategories: ['creators', 'aesthetics'],
  },
  spotify: {
    name: 'Spotify',
    icon: '🎵',
    patterns: [/spotify\.com/, /open\.spotify\.com/],
    suggestedCategories: ['sounds'],
  },
  youtube: {
    name: 'YouTube',
    icon: '▶️',
    patterns: [/youtube\.com/, /youtu\.be/],
    suggestedCategories: ['sounds', 'creators', 'memes'],
  },
  twitter: {
    name: 'X/Twitter',
    icon: '𝕏',
    patterns: [/twitter\.com/, /x\.com/],
    suggestedCategories: ['memes', 'creators'],
  },
  pinterest: {
    name: 'Pinterest',
    icon: '📌',
    patterns: [/pinterest\.com/, /pin\.it/],
    suggestedCategories: ['aesthetics'],
  },
  soundcloud: {
    name: 'SoundCloud',
    icon: '☁️',
    patterns: [/soundcloud\.com/],
    suggestedCategories: ['sounds'],
  },
  reddit: {
    name: 'Reddit',
    icon: '🔗',
    patterns: [/reddit\.com/, /redd\.it/],
    suggestedCategories: ['memes'],
  },
  tumblr: {
    name: 'Tumblr',
    icon: '📝',
    patterns: [/tumblr\.com/],
    suggestedCategories: ['aesthetics', 'memes'],
  },
  threads: {
    name: 'Threads',
    icon: '🧵',
    patterns: [/threads\.net/],
    suggestedCategories: ['creators', 'memes'],
  },
};

/**
 * Detect platform from URL
 * @param {string} url - The URL to analyze
 * @returns {{ platform: string, name: string, icon: string, suggestedCategories: string[] } | null}
 */
export function detectPlatform(url) {
  if (!url) return null;

  const normalizedUrl = url.toLowerCase();

  for (const [key, platform] of Object.entries(PLATFORMS)) {
    for (const pattern of platform.patterns) {
      if (pattern.test(normalizedUrl)) {
        return {
          platform: key,
          name: platform.name,
          icon: platform.icon,
          suggestedCategories: platform.suggestedCategories,
        };
      }
    }
  }

  return null;
}

/**
 * Get the best category suggestion based on platform and existing categories
 * @param {string} url - The URL
 * @param {Array} categories - Available categories
 * @returns {string | null} - Suggested category ID
 */
export function suggestCategory(url, categories) {
  const detected = detectPlatform(url);
  if (!detected) return categories[0]?.id || null;

  // Find first matching category that exists and is enabled
  for (const suggestedId of detected.suggestedCategories) {
    const category = categories.find(
      (c) => c.id === suggestedId && c.enabled !== false
    );
    if (category) return category.id;
  }

  // Fallback to first enabled category
  const firstEnabled = categories.find((c) => c.enabled !== false);
  return firstEnabled?.id || null;
}

/**
 * Extract clean name from URL metadata
 * @param {Object} data - Microlink data
 * @returns {string}
 */
export function extractTrendName(data) {
  if (!data) return '';

  // Use title if available, otherwise use description
  let name = data.title || data.description || '';

  // Clean up common patterns
  name = name
    // Remove platform suffixes
    .replace(/\s*[\|•\-–]\s*(TikTok|Instagram|Spotify|YouTube|Twitter|X).*$/i, '')
    // Remove "on TikTok" etc.
    .replace(/\s+on\s+(TikTok|Instagram|Spotify|YouTube|Twitter|X).*$/i, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Truncate if too long
  if (name.length > 60) {
    name = name.substring(0, 57) + '...';
  }

  return name;
}
