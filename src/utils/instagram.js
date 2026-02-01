// Instagram API integration via RapidAPI
// Popular APIs: "Instagram Data API", "Instagram Scraper API"
// Cost: ~$15-30/month depending on usage

const INSTAGRAM_KEY_STORAGE = 'culture-heatmap-instagram-rapidapi';
const RAPIDAPI_HOST = 'instagram-scraper-api2.p.rapidapi.com'; // One of the popular IG APIs

/**
 * Get stored RapidAPI key for Instagram
 */
export function getInstagramKey() {
  const stored = localStorage.getItem(INSTAGRAM_KEY_STORAGE);
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
 * Save Instagram API credentials
 */
export function saveInstagramKey(apiKey, host = RAPIDAPI_HOST) {
  localStorage.setItem(
    INSTAGRAM_KEY_STORAGE,
    JSON.stringify({ apiKey, host })
  );
}

/**
 * Check if Instagram API is configured
 */
export function isInstagramConfigured() {
  const creds = getInstagramKey();
  return !!(creds?.apiKey);
}

/**
 * Make Instagram API request
 */
async function instagramRequest(endpoint, params = {}) {
  const creds = getInstagramKey();
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
      console.error('Instagram API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Instagram fetch error:', error);
    return null;
  }
}

/**
 * Get trending/explore reels
 */
export async function getTrendingReels(count = 20) {
  const data = await instagramRequest('/v1/explore', {
    count: count.toString(),
  });

  if (!data?.items) return [];

  return data.items
    .filter((item) => item.media_type === 2 || item.product_type === 'clips') // Reels
    .map((item) => ({
      id: item.id || item.pk,
      title: item.caption?.text?.slice(0, 100) || '',
      author: item.user?.username || '',
      authorName: item.user?.full_name || '',
      description: item.caption?.text || '',
      image: item.image_versions2?.candidates?.[0]?.url || item.thumbnail_url || '',
      url: `https://www.instagram.com/reel/${item.code}/`,
      metrics: {
        views: item.play_count || item.view_count || 0,
        likes: item.like_count || 0,
        comments: item.comment_count || 0,
      },
      hashtags: extractHashtags(item.caption?.text || ''),
      source: 'instagram',
      type: 'reel',
    }));
}

/**
 * Get trending hashtags
 */
export async function getTrendingHashtags(count = 20) {
  const data = await instagramRequest('/v1/trending/tags', {
    count: count.toString(),
  });

  if (!data?.hashtags && !data?.tags) return [];

  const tags = data.hashtags || data.tags || [];
  return tags.map((tag) => ({
    id: tag.id || tag.name,
    title: `#${tag.name}`,
    name: tag.name,
    image: tag.profile_pic_url || '',
    url: `https://www.instagram.com/explore/tags/${tag.name}/`,
    metrics: {
      postCount: tag.media_count || tag.edge_hashtag_to_media?.count || 0,
    },
    source: 'instagram',
    type: 'hashtag',
  }));
}

/**
 * Get hashtag info and top posts
 * @param {string} hashtag - Hashtag name (without #)
 */
export async function getHashtagInfo(hashtag) {
  const data = await instagramRequest('/v1/hashtag', {
    hashtag: hashtag.replace(/^#/, ''),
  });

  if (!data) return null;

  return {
    id: data.id || data.name,
    title: `#${data.name}`,
    name: data.name,
    image: data.profile_pic_url || '',
    url: `https://www.instagram.com/explore/tags/${data.name}/`,
    metrics: {
      postCount: data.media_count || data.edge_hashtag_to_media?.count || 0,
    },
    topPosts: (data.top_posts || data.edge_hashtag_to_top_posts?.edges || [])
      .slice(0, 9)
      .map((post) => ({
        id: post.node?.id || post.id,
        image: post.node?.thumbnail_src || post.thumbnail_url || '',
        likes: post.node?.edge_liked_by?.count || post.like_count || 0,
      })),
    source: 'instagram',
    type: 'hashtag',
  };
}

/**
 * Get post details by URL or shortcode
 * @param {string} urlOrCode - Instagram URL or shortcode
 */
export async function getPostDetails(urlOrCode) {
  const shortcode = extractShortcode(urlOrCode);
  if (!shortcode) return null;

  const data = await instagramRequest('/v1/post', {
    code: shortcode,
  });

  if (!data) return null;

  const isReel = data.media_type === 2 || data.product_type === 'clips';

  return {
    id: data.id || data.pk,
    title: data.caption?.text?.slice(0, 100) || '',
    author: data.user?.username || '',
    authorName: data.user?.full_name || '',
    description: data.caption?.text || '',
    image: data.image_versions2?.candidates?.[0]?.url || data.thumbnail_url || '',
    url: isReel
      ? `https://www.instagram.com/reel/${data.code}/`
      : `https://www.instagram.com/p/${data.code}/`,
    metrics: {
      views: data.play_count || data.view_count || 0,
      likes: data.like_count || 0,
      comments: data.comment_count || 0,
      saves: data.save_count || 0,
    },
    hashtags: extractHashtags(data.caption?.text || ''),
    isReel,
    source: 'instagram',
    type: isReel ? 'reel' : 'post',
  };
}

/**
 * Extract shortcode from Instagram URL
 */
export function extractShortcode(url) {
  if (!url) return null;

  // If it looks like a shortcode already
  if (/^[\w-]{11}$/.test(url)) return url;

  // URL patterns
  const patterns = [
    /instagram\.com\/(?:p|reel|tv)\/([^/?]+)/,
    /instagr\.am\/(?:p|reel)\/([^/?]+)/,
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
  const matches = text.match(/#[\w]+/g);
  return matches ? matches.map((h) => h.slice(1)) : [];
}

/**
 * Search Instagram
 */
export async function searchInstagram(query, type = 'general') {
  const data = await instagramRequest('/v1/search', {
    query,
    type,
  });

  if (!data?.results) return [];

  return data.results.map((item) => ({
    id: item.id || item.pk,
    title: item.username || item.name || item.title || '',
    description: item.biography || item.full_name || '',
    image: item.profile_pic_url || item.thumbnail_url || '',
    url: item.username
      ? `https://www.instagram.com/${item.username}/`
      : '',
    metrics: {
      followers: item.follower_count || 0,
      posts: item.media_count || 0,
    },
    source: 'instagram',
    type: item.type || 'search',
  }));
}

/**
 * Get user profile info
 */
export async function getUserProfile(username) {
  const data = await instagramRequest('/v1/user', {
    username: username.replace(/^@/, ''),
  });

  if (!data) return null;

  return {
    id: data.id || data.pk,
    username: data.username,
    name: data.full_name || '',
    bio: data.biography || '',
    image: data.profile_pic_url || '',
    url: `https://www.instagram.com/${data.username}/`,
    metrics: {
      followers: data.follower_count || 0,
      following: data.following_count || 0,
      posts: data.media_count || 0,
    },
    isVerified: data.is_verified || false,
    source: 'instagram',
    type: 'profile',
  };
}

/**
 * Get all Instagram trending data for discover page
 */
export async function getInstagramTrending() {
  if (!isInstagramConfigured()) {
    return {
      reels: [],
      hashtags: [],
      error: 'Instagram API not configured',
    };
  }

  const [reels, hashtags] = await Promise.all([
    getTrendingReels(15),
    getTrendingHashtags(15),
  ]);

  return { reels, hashtags };
}
