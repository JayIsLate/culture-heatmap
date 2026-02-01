// TikTok API integration via RapidAPI
// Popular APIs: "TikTok Data API", "Tiktok API", "TikTok Scraper"
// Cost: ~$15-30/month depending on usage

const TIKTOK_KEY_STORAGE = 'culture-heatmap-tiktok-rapidapi';
const RAPIDAPI_HOST = 'tiktok-api23.p.rapidapi.com'; // One of the popular TikTok APIs

/**
 * Get stored RapidAPI key for TikTok
 */
export function getTikTokKey() {
  const stored = localStorage.getItem(TIKTOK_KEY_STORAGE);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Save TikTok API credentials
 */
export function saveTikTokKey(apiKey, host = RAPIDAPI_HOST) {
  localStorage.setItem(
    TIKTOK_KEY_STORAGE,
    JSON.stringify({ apiKey, host })
  );
}

/**
 * Check if TikTok API is configured
 */
export function isTikTokConfigured() {
  const creds = getTikTokKey();
  return !!(creds?.apiKey);
}

/**
 * Make TikTok API request
 */
async function tiktokRequest(endpoint, params = {}) {
  const creds = getTikTokKey();
  if (!creds?.apiKey) return null;

  const url = new URL(`https://${creds.host}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': creds.apiKey,
        'X-RapidAPI-Host': creds.host,
      },
    });

    if (!response.ok) {
      console.error('TikTok API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('TikTok fetch error:', error);
    return null;
  }
}

/**
 * Get trending videos/challenges
 * Note: Exact endpoint varies by RapidAPI provider
 */
export async function getTrendingVideos(region = 'US', count = 20) {
  // Different RapidAPI providers have different endpoints
  // This is structured for tiktok-api23, adjust as needed
  const data = await tiktokRequest('/api/trending/videos', {
    region,
    count: count.toString(),
  });

  if (!data?.videos) return [];

  return data.videos.map((video) => ({
    id: video.id || video.video_id,
    title: video.title || video.desc || '',
    author: video.author?.nickname || video.author_name || '',
    authorId: video.author?.unique_id || video.author_id || '',
    description: video.desc || video.title || '',
    image: video.cover || video.thumbnail || '',
    url: `https://www.tiktok.com/@${video.author?.unique_id || 'user'}/video/${video.id || video.video_id}`,
    metrics: {
      views: video.play_count || video.stats?.playCount || 0,
      likes: video.digg_count || video.stats?.diggCount || 0,
      comments: video.comment_count || video.stats?.commentCount || 0,
      shares: video.share_count || video.stats?.shareCount || 0,
    },
    sound: video.music ? {
      id: video.music.id,
      title: video.music.title,
      author: video.music.author,
    } : null,
    hashtags: video.hashtags || extractHashtags(video.desc || ''),
    source: 'tiktok',
    type: 'video',
  }));
}

/**
 * Get trending sounds/music
 */
export async function getTrendingSounds(region = 'US', count = 20) {
  const data = await tiktokRequest('/api/trending/sounds', {
    region,
    count: count.toString(),
  });

  if (!data?.sounds && !data?.music) return [];

  const sounds = data.sounds || data.music || [];
  return sounds.map((sound) => ({
    id: sound.id || sound.music_id,
    title: sound.title || sound.name || '',
    artist: sound.author || sound.artist || '',
    image: sound.cover || sound.thumbnail || '',
    url: `https://www.tiktok.com/music/${encodeURIComponent(sound.title || '')}-${sound.id}`,
    metrics: {
      videoCount: sound.video_count || sound.stats?.videoCount || 0,
    },
    duration: sound.duration || 0,
    source: 'tiktok',
    type: 'sound',
  }));
}

/**
 * Get trending hashtags
 */
export async function getTrendingHashtags(region = 'US', count = 20) {
  const data = await tiktokRequest('/api/trending/hashtags', {
    region,
    count: count.toString(),
  });

  if (!data?.hashtags && !data?.challenges) return [];

  const hashtags = data.hashtags || data.challenges || [];
  return hashtags.map((tag) => ({
    id: tag.id || tag.challenge_id,
    title: `#${tag.title || tag.name || tag.hashtag_name}`,
    name: tag.title || tag.name || tag.hashtag_name,
    description: tag.desc || tag.description || '',
    image: tag.cover || tag.thumbnail || '',
    url: `https://www.tiktok.com/tag/${encodeURIComponent(tag.title || tag.name || '')}`,
    metrics: {
      videoCount: tag.video_count || tag.stats?.videoCount || 0,
      viewCount: tag.view_count || tag.stats?.viewCount || 0,
    },
    source: 'tiktok',
    type: 'hashtag',
  }));
}

/**
 * Get video details by URL or ID
 * @param {string} urlOrId - TikTok video URL or ID
 */
export async function getVideoDetails(urlOrId) {
  const videoId = extractVideoId(urlOrId);
  if (!videoId) return null;

  const data = await tiktokRequest('/api/video/info', {
    video_id: videoId,
  });

  if (!data?.video && !data) return null;

  const video = data.video || data;
  return {
    id: video.id || video.video_id,
    title: video.title || video.desc || '',
    author: video.author?.nickname || video.author_name || '',
    authorId: video.author?.unique_id || video.author_id || '',
    description: video.desc || video.title || '',
    image: video.cover || video.thumbnail || '',
    url: `https://www.tiktok.com/@${video.author?.unique_id || 'user'}/video/${video.id || video.video_id}`,
    metrics: {
      views: video.play_count || video.stats?.playCount || 0,
      likes: video.digg_count || video.stats?.diggCount || 0,
      comments: video.comment_count || video.stats?.commentCount || 0,
      shares: video.share_count || video.stats?.shareCount || 0,
      saves: video.collect_count || video.stats?.collectCount || 0,
    },
    sound: video.music ? {
      id: video.music.id,
      title: video.music.title,
      author: video.music.author,
    } : null,
    hashtags: video.hashtags || extractHashtags(video.desc || ''),
    source: 'tiktok',
    type: 'video',
  };
}

/**
 * Extract video ID from TikTok URL
 */
export function extractVideoId(url) {
  if (!url) return null;

  // If it's just an ID
  if (/^\d+$/.test(url)) return url;

  // URL patterns
  const patterns = [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /vm\.tiktok\.com\/(\w+)/,
    /tiktok\.com\/t\/(\w+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract hashtags from text
 */
function extractHashtags(text) {
  const matches = text.match(/#[\w\u4e00-\u9fa5]+/g);
  return matches ? matches.map((h) => h.slice(1)) : [];
}

/**
 * Search TikTok
 */
export async function searchTikTok(query, type = 'general', count = 20) {
  const data = await tiktokRequest('/api/search', {
    keyword: query,
    type,
    count: count.toString(),
  });

  if (!data?.results) return [];

  return data.results.map((item) => ({
    id: item.id,
    title: item.title || item.desc || item.name || '',
    description: item.desc || item.description || '',
    image: item.cover || item.thumbnail || '',
    url: item.url || '',
    metrics: item.stats || {},
    source: 'tiktok',
    type: item.type || 'search',
  }));
}

/**
 * Get all TikTok trending data for discover page
 */
export async function getTikTokTrending() {
  if (!isTikTokConfigured()) {
    return {
      videos: [],
      sounds: [],
      hashtags: [],
      error: 'TikTok API not configured',
    };
  }

  const [videos, sounds, hashtags] = await Promise.all([
    getTrendingVideos('US', 15),
    getTrendingSounds('US', 15),
    getTrendingHashtags('US', 15),
  ]);

  return { videos, sounds, hashtags };
}
