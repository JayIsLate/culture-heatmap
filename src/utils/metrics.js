// Metrics extraction and normalization utilities

/**
 * Calculate time decay factor based on post age
 * Attention fades fast on social media:
 * - < 24 hours: no decay (1.0)
 * - 1-3 days: slight cooling (0.85-0.95)
 * - 3-7 days: moderate decay (0.6-0.85)
 * - 1-2 weeks: significant decay (0.3-0.6)
 * - 2+ weeks: deep red / old news (0.1-0.3)
 *
 * @param {string|Date} postedAt - When the content was posted
 * @returns {number} Decay factor between 0.1 and 1.0
 */
export function calculateTimeDecay(postedAt) {
  if (!postedAt) return 1.0; // No date = assume fresh

  const posted = new Date(postedAt);
  const now = new Date();
  const hoursOld = (now - posted) / (1000 * 60 * 60);
  const daysOld = hoursOld / 24;

  if (daysOld < 1) {
    // Less than 24 hours - hot, no decay
    return 1.0;
  } else if (daysOld < 3) {
    // 1-3 days - slight cooling
    return 0.95 - (daysOld - 1) * 0.05; // 0.95 -> 0.85
  } else if (daysOld < 7) {
    // 3-7 days - moderate decay
    return 0.85 - (daysOld - 3) * 0.0625; // 0.85 -> 0.6
  } else if (daysOld < 14) {
    // 1-2 weeks - significant decay
    return 0.6 - (daysOld - 7) * 0.043; // 0.6 -> 0.3
  } else {
    // 2+ weeks - old news
    // Continues to decay slowly, minimum 0.1
    return Math.max(0.1, 0.3 - (daysOld - 14) * 0.01);
  }
}

/**
 * Get a human-readable age string and decay status
 * @param {string|Date} postedAt
 * @returns {Object} { ageText, decayLevel, daysOld }
 */
export function getPostAge(postedAt) {
  if (!postedAt) return { ageText: 'Unknown', decayLevel: 'none', daysOld: 0 };

  const posted = new Date(postedAt);
  const now = new Date();
  const hoursOld = (now - posted) / (1000 * 60 * 60);
  const daysOld = hoursOld / 24;

  let ageText;
  let decayLevel;

  if (hoursOld < 1) {
    ageText = 'Just now';
    decayLevel = 'hot';
  } else if (hoursOld < 24) {
    ageText = `${Math.round(hoursOld)}h ago`;
    decayLevel = 'hot';
  } else if (daysOld < 3) {
    ageText = `${Math.round(daysOld)}d ago`;
    decayLevel = 'warm';
  } else if (daysOld < 7) {
    ageText = `${Math.round(daysOld)}d ago`;
    decayLevel = 'cooling';
  } else if (daysOld < 14) {
    ageText = `${Math.round(daysOld / 7)}w ago`;
    decayLevel = 'cold';
  } else if (daysOld < 30) {
    ageText = `${Math.round(daysOld / 7)}w ago`;
    decayLevel = 'stale';
  } else if (daysOld < 365) {
    ageText = `${Math.round(daysOld / 30)}mo ago`;
    decayLevel = 'stale';
  } else {
    ageText = `${Math.round(daysOld / 365)}y ago`;
    decayLevel = 'stale';
  }

  return { ageText, decayLevel, daysOld: Math.round(daysOld) };
}

/**
 * Parse metric strings like "747K", "1.2M", "16.4K" into numbers
 * @param {string} str - The metric string
 * @returns {number}
 */
export function parseMetricString(str) {
  if (!str) return 0;

  const cleaned = str.toString().trim().toUpperCase().replace(/,/g, '');

  // Handle K (thousands)
  if (cleaned.endsWith('K')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000;
  }

  // Handle M (millions)
  if (cleaned.endsWith('M')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000000;
  }

  // Handle B (billions)
  if (cleaned.endsWith('B')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000000000;
  }

  return parseFloat(cleaned) || 0;
}

/**
 * Format a number into a readable metric string
 * @param {number} num
 * @returns {string}
 */
export function formatMetric(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

/**
 * Extract metrics from OCR text
 * Looks for patterns like "747K likes", "16.4K comments", etc.
 * @param {string} text - Raw OCR text
 * @returns {Object}
 */
export function extractMetricsFromText(text) {
  const metrics = {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    followers: 0,
  };

  if (!text) return metrics;

  // Normalize text
  const normalized = text.toLowerCase().replace(/\s+/g, ' ');

  // Common patterns for different platforms
  const patterns = [
    // Views
    { key: 'views', regex: /([\d.]+[kmb]?)\s*(?:views?|plays?|watches)/i },
    { key: 'views', regex: /(?:views?|plays?)\s*([\d.]+[kmb]?)/i },

    // Likes
    { key: 'likes', regex: /([\d.]+[kmb]?)\s*(?:likes?|hearts?|❤️|♥)/i },
    { key: 'likes', regex: /(?:likes?|❤️|♥)\s*([\d.]+[kmb]?)/i },

    // Comments
    { key: 'comments', regex: /([\d.]+[kmb]?)\s*(?:comments?|💬)/i },
    { key: 'comments', regex: /(?:comments?|💬)\s*([\d.]+[kmb]?)/i },

    // Shares
    { key: 'shares', regex: /([\d.]+[kmb]?)\s*(?:shares?|retweets?|reposts?)/i },
    { key: 'shares', regex: /(?:shares?|retweets?)\s*([\d.]+[kmb]?)/i },

    // Saves/Bookmarks
    { key: 'saves', regex: /([\d.]+[kmb]?)\s*(?:saves?|bookmarks?|🔖)/i },
    { key: 'saves', regex: /(?:saves?|bookmarks?)\s*([\d.]+[kmb]?)/i },

    // Followers
    { key: 'followers', regex: /([\d.]+[kmb]?)\s*(?:followers?|subscribers?)/i },
  ];

  for (const { key, regex } of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const value = parseMetricString(match[1]);
      if (value > metrics[key]) {
        metrics[key] = value;
      }
    }
  }

  // Also try to find standalone numbers in sequence (common in TikTok UI)
  // Pattern: number number number (likes, comments, saves)
  const standalonNumbers = text.match(/\b([\d.]+[kmb]?)\b/gi);
  if (standalonNumbers && standalonNumbers.length >= 3) {
    // If we didn't find labeled metrics, use positional
    if (metrics.likes === 0 && standalonNumbers[0]) {
      metrics.likes = parseMetricString(standalonNumbers[0]);
    }
    if (metrics.comments === 0 && standalonNumbers[1]) {
      metrics.comments = parseMetricString(standalonNumbers[1]);
    }
    if (metrics.saves === 0 && standalonNumbers[2]) {
      metrics.saves = parseMetricString(standalonNumbers[2]);
    }
  }

  return metrics;
}

/**
 * Calculate engagement score from metrics (0-100)
 * This becomes the "size" in the heatmap
 * @param {Object} metrics
 * @param {string} platform - Platform name for weighting
 * @returns {number}
 */
export function calculateEngagementScore(metrics, platform = 'unknown') {
  const { views = 0, likes = 0, comments = 0, shares = 0, saves = 0 } = metrics;

  // Total engagement
  const totalEngagement = likes + comments * 2 + shares * 3 + saves * 2;

  // Platform-specific viral thresholds
  const thresholds = {
    tiktok: { low: 10000, mid: 100000, high: 1000000, viral: 10000000 },
    instagram: { low: 5000, mid: 50000, high: 500000, viral: 5000000 },
    youtube: { low: 10000, mid: 100000, high: 1000000, viral: 10000000 },
    twitter: { low: 1000, mid: 10000, high: 100000, viral: 1000000 },
    spotify: { low: 100000, mid: 1000000, high: 10000000, viral: 100000000 },
    unknown: { low: 5000, mid: 50000, high: 500000, viral: 5000000 },
  };

  const t = thresholds[platform.toLowerCase()] || thresholds.unknown;

  // Calculate score (1-100)
  let score;
  if (totalEngagement >= t.viral) {
    score = 90 + Math.min(10, (totalEngagement / t.viral - 1) * 2);
  } else if (totalEngagement >= t.high) {
    score = 70 + (totalEngagement - t.high) / (t.viral - t.high) * 20;
  } else if (totalEngagement >= t.mid) {
    score = 40 + (totalEngagement - t.mid) / (t.high - t.mid) * 30;
  } else if (totalEngagement >= t.low) {
    score = 10 + (totalEngagement - t.low) / (t.mid - t.low) * 30;
  } else {
    score = Math.max(1, (totalEngagement / t.low) * 10);
  }

  return Math.round(Math.min(100, Math.max(1, score)));
}

/**
 * Calculate change percentage between two metric snapshots
 * @param {Object} currentMetrics
 * @param {Object} previousMetrics
 * @returns {number}
 */
export function calculateMetricChange(currentMetrics, previousMetrics) {
  if (!previousMetrics) return 0;

  const currentTotal = (currentMetrics.likes || 0) +
                       (currentMetrics.comments || 0) * 2 +
                       (currentMetrics.shares || 0) * 3 +
                       (currentMetrics.saves || 0) * 2;

  const previousTotal = (previousMetrics.likes || 0) +
                        (previousMetrics.comments || 0) * 2 +
                        (previousMetrics.shares || 0) * 3 +
                        (previousMetrics.saves || 0) * 2;

  if (previousTotal === 0) return 0;

  return ((currentTotal - previousTotal) / previousTotal) * 100;
}

/**
 * Merge multiple metric sources
 * @param  {...Object} metricSources
 * @returns {Object}
 */
export function mergeMetrics(...metricSources) {
  const merged = {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    followers: 0,
  };

  for (const source of metricSources) {
    if (!source) continue;
    for (const key of Object.keys(merged)) {
      if (source[key] && source[key] > merged[key]) {
        merged[key] = source[key];
      }
    }
  }

  return merged;
}

/**
 * Calculate Attention Score with virality factor
 * Takes into account: views, likes, comments, and followers (for virality ratio)
 *
 * A smaller creator with viral content should score HIGHER than
 * a big creator with average performance.
 *
 * @param {object} metrics - { views, likes, comments, followers }
 * @returns {number} Score from 1-100
 */
export function calculateAttentionScore(metrics) {
  if (!metrics) return 50;

  const { views = 0, likes = 0, comments = 0, followers = 0 } = metrics;

  // If no meaningful data, return default
  if (views === 0 && likes === 0 && followers === 0) return 50;

  let score = 0;

  // 1. BASE SCORE from views (0-40 points)
  // Logarithmic scale: 10K=20, 100K=27, 1M=33, 10M=40
  if (views > 0) {
    const viewScore = Math.min((Math.log10(views) / 7) * 40, 40);
    score += viewScore;
  }

  // 2. ENGAGEMENT SCORE (0-30 points)
  // Based on likes + comments relative to views
  if (views > 0) {
    const likeRate = likes / views;
    const commentRate = comments / views;
    // Typical good engagement: 3-10% likes, 0.1-1% comments
    const engagementScore = Math.min(
      (likeRate * 200) + (commentRate * 1000),
      30
    );
    score += engagementScore;
  } else if (likes > 0) {
    // No views but have likes (e.g., from Last.fm listeners)
    const likeScore = Math.min((Math.log10(likes) / 7) * 25, 25);
    score += likeScore;
  }

  // 3. VIRALITY BONUS (0-30 points)
  // If views >> followers, content is going viral (reaching beyond their audience)
  if (followers > 0 && views > 0) {
    const viralityRatio = views / followers;

    if (viralityRatio > 5) {
      // Going viral: views are 5x+ their follower count
      const viralBonus = Math.min((viralityRatio - 5) * 3, 30);
      score += viralBonus;
    } else if (viralityRatio < 0.1) {
      // Underperforming: views are less than 10% of followers
      score -= 10;
    }
  } else if (followers === 0 && views > 100000) {
    // Unknown creator with lots of views = likely viral
    score += 15;
  }

  // 4. SMALL CREATOR BONUS (0-10 points)
  // Reward emerging creators who are punching above their weight
  if (followers > 0 && followers < 50000 && views > followers) {
    score += 10;
  }

  // Clamp to 1-100
  return Math.max(1, Math.min(100, Math.round(score)));
}

/**
 * Calculate momentum/change based on time decay
 * Returns a percentage that affects the color (green=positive, red=negative)
 *
 * Fresh posts get positive momentum (green)
 * Old posts get negative momentum (red)
 *
 * @param {string|Date} postedAt - When the content was posted
 * @param {Object} metrics - Optional metrics for virality boost
 * @returns {number} Change percentage (-90 to +100)
 */
export function calculateMomentumFromAge(postedAt, metrics = {}) {
  const decay = calculateTimeDecay(postedAt);
  const { ageText, decayLevel, daysOld } = getPostAge(postedAt);

  // Base momentum from time decay
  // decay 1.0 = +50%, decay 0.5 = 0%, decay 0.1 = -80%
  let momentum = (decay - 0.5) * 200;

  // Virality can boost momentum slightly even for older posts
  if (metrics.followers > 0 && metrics.likes > 0) {
    const viralityRatio = metrics.likes / metrics.followers;
    if (viralityRatio > 2) {
      // Viral content gets a momentum boost (max +20%)
      momentum += Math.min(viralityRatio * 5, 20);
    }
  }

  // Clamp to reasonable range
  return Math.max(-90, Math.min(100, Math.round(momentum)));
}

/**
 * Parse likes/comments from description text (from link metadata)
 * Handles formats like "20K likes, 380 comments" or "20,000 likes"
 */
export function parseMetricsFromDescription(text) {
  if (!text) return {};

  const metrics = {};

  // Match likes: "20K likes", "20,000 likes", "20k likes"
  const likesMatch = text.match(/([\d,.]+)\s*[kKmM]?\s*likes?/i);
  if (likesMatch) {
    metrics.likes = parseMetricString(likesMatch[0].replace(/likes?/i, '').trim());
  }

  // Match comments: "380 comments", "1.2K comments"
  const commentsMatch = text.match(/([\d,.]+)\s*[kKmM]?\s*comments?/i);
  if (commentsMatch) {
    metrics.comments = parseMetricString(commentsMatch[0].replace(/comments?/i, '').trim());
  }

  // Match views: "600K views", "1M views"
  const viewsMatch = text.match(/([\d,.]+)\s*[kKmM]?\s*views?/i);
  if (viewsMatch) {
    metrics.views = parseMetricString(viewsMatch[0].replace(/views?/i, '').trim());
  }

  // Match plays: "1.2M plays"
  const playsMatch = text.match(/([\d,.]+)\s*[kKmM]?\s*plays?/i);
  if (playsMatch && !metrics.views) {
    metrics.views = parseMetricString(playsMatch[0].replace(/plays?/i, '').trim());
  }

  return metrics;
}
