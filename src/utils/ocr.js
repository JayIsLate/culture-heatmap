import Tesseract from 'tesseract.js';

/**
 * Parse number from string like "1.2M", "456K", "12,345", "1234"
 */
function parseNumber(str) {
  if (!str) return 0;

  // Clean the string
  let clean = str.replace(/,/g, '').trim();

  // Handle M (millions)
  if (clean.match(/[\d.]+\s*[Mm]/)) {
    const num = parseFloat(clean.replace(/[Mm]/g, ''));
    return Math.round(num * 1000000);
  }

  // Handle K (thousands)
  if (clean.match(/[\d.]+\s*[Kk]/)) {
    const num = parseFloat(clean.replace(/[Kk]/g, ''));
    return Math.round(num * 1000);
  }

  // Handle B (billions)
  if (clean.match(/[\d.]+\s*[Bb]/)) {
    const num = parseFloat(clean.replace(/[Bb]/g, ''));
    return Math.round(num * 1000000000);
  }

  // Plain number
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Extract metrics from OCR text
 * Looks for patterns like "1.2M followers", "456K views", etc.
 */
function extractMetricsFromText(text) {
  const metrics = {
    followers: 0,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  };

  // Normalize text
  const normalized = text.toLowerCase().replace(/\n/g, ' ');

  // Patterns to match metrics
  const patterns = [
    // Followers patterns
    { key: 'followers', regex: /([\d.,]+[KkMmBb]?)\s*(?:followers|follower|seguidores)/i },
    { key: 'followers', regex: /(?:followers|follower|seguidores)\s*([\d.,]+[KkMmBb]?)/i },
    { key: 'followers', regex: /([\d.,]+[KkMmBb]?)\s*(?:subs|subscribers)/i },

    // Views patterns
    { key: 'views', regex: /([\d.,]+[KkMmBb]?)\s*(?:views|view|visualizaciones|plays)/i },
    { key: 'views', regex: /(?:views|view|plays)\s*([\d.,]+[KkMmBb]?)/i },

    // Likes patterns
    { key: 'likes', regex: /([\d.,]+[KkMmBb]?)\s*(?:likes|like|me gusta|hearts)/i },
    { key: 'likes', regex: /(?:likes|like)\s*([\d.,]+[KkMmBb]?)/i },

    // Comments patterns
    { key: 'comments', regex: /([\d.,]+[KkMmBb]?)\s*(?:comments|comment|comentarios)/i },
    { key: 'comments', regex: /(?:comments|comment)\s*([\d.,]+[KkMmBb]?)/i },

    // Shares patterns
    { key: 'shares', regex: /([\d.,]+[KkMmBb]?)\s*(?:shares|share|reposts|repost)/i },
  ];

  for (const { key, regex } of patterns) {
    const match = normalized.match(regex);
    if (match && match[1]) {
      const value = parseNumber(match[1]);
      if (value > metrics[key]) {
        metrics[key] = value;
      }
    }
  }

  // TikTok-specific: Look for standalone large numbers (likely views)
  // TikTok often shows views as just "1.2M" without label
  if (metrics.views === 0) {
    const standaloneNumbers = text.match(/\b([\d.]+[MmKk])\b/g);
    if (standaloneNumbers && standaloneNumbers.length > 0) {
      // The largest standalone number is likely views
      let maxViews = 0;
      for (const num of standaloneNumbers) {
        const parsed = parseNumber(num);
        if (parsed > maxViews && parsed > 1000) {
          maxViews = parsed;
        }
      }
      if (maxViews > 0) {
        metrics.views = maxViews;
      }
    }
  }

  // Instagram-specific: "Liked by X and Y others" pattern
  const likedByMatch = normalized.match(/liked by.*?and\s*([\d.,]+[KkMmBb]?)\s*others/i);
  if (likedByMatch) {
    metrics.likes = parseNumber(likedByMatch[1]) + 1;
  }

  return metrics;
}

/**
 * Detect if screenshot is a profile or a post
 */
function detectScreenshotType(text) {
  const normalized = text.toLowerCase();

  // Profile indicators
  const profileKeywords = ['followers', 'following', 'posts', 'bio', 'edit profile', 'message', 'subscribe'];
  const postKeywords = ['views', 'liked by', 'comments', 'share', 'reply', 'repost'];

  let profileScore = 0;
  let postScore = 0;

  for (const keyword of profileKeywords) {
    if (normalized.includes(keyword)) profileScore++;
  }

  for (const keyword of postKeywords) {
    if (normalized.includes(keyword)) postScore++;
  }

  return profileScore > postScore ? 'profile' : 'post';
}

/**
 * Scan an image and extract metrics using OCR
 * @param {string} imageDataUrl - Base64 data URL of the image
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<{metrics: object, type: string, rawText: string}>}
 */
export async function scanImageForMetrics(imageDataUrl, onProgress = () => {}) {
  try {
    const result = await Tesseract.recognize(imageDataUrl, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    const text = result.data.text;
    const metrics = extractMetricsFromText(text);
    const type = detectScreenshotType(text);

    return {
      metrics,
      type,
      rawText: text,
      confidence: result.data.confidence,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to scan image. Please try again.');
  }
}

/**
 * Format metrics for display
 */
export function formatScannedMetrics(metrics) {
  const parts = [];
  if (metrics.views > 0) parts.push(`${formatNum(metrics.views)} views`);
  if (metrics.likes > 0) parts.push(`${formatNum(metrics.likes)} likes`);
  if (metrics.comments > 0) parts.push(`${formatNum(metrics.comments)} comments`);
  if (metrics.followers > 0) parts.push(`${formatNum(metrics.followers)} followers`);
  return parts.join(' | ') || 'No metrics detected';
}

function formatNum(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
