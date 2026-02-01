// YouTube Data API integration
// Requires free API key from Google Cloud Console

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_KEY_STORAGE = 'culture-heatmap-youtube-key';

/**
 * Get stored YouTube API key
 */
export function getYouTubeKey() {
  return localStorage.getItem(YOUTUBE_KEY_STORAGE) || '';
}

/**
 * Save YouTube API key
 */
export function saveYouTubeKey(key) {
  localStorage.setItem(YOUTUBE_KEY_STORAGE, key);
}

/**
 * Check if YouTube is configured
 */
export function isYouTubeConfigured() {
  return !!getYouTubeKey();
}

/**
 * Make YouTube API request
 */
async function youtubeRequest(endpoint, params = {}) {
  const apiKey = getYouTubeKey();
  if (!apiKey) return null;

  const url = new URL(`${YOUTUBE_API_BASE}${endpoint}`);
  url.searchParams.set('key', apiKey);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('YouTube API error:', response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('YouTube fetch error:', error);
    return null;
  }
}

/**
 * Get trending videos
 * @param {string} regionCode - Country code (default: US)
 * @param {string} categoryId - Video category (10 = Music, 24 = Entertainment)
 * @param {number} maxResults
 */
export async function getTrendingVideos(regionCode = 'US', categoryId = null, maxResults = 20) {
  const params = {
    part: 'snippet,statistics',
    chart: 'mostPopular',
    regionCode,
    maxResults: maxResults.toString(),
  };

  if (categoryId) {
    params.videoCategoryId = categoryId;
  }

  const data = await youtubeRequest('/videos', params);
  if (!data?.items) return [];

  return data.items.map((video) => ({
    id: video.id,
    title: video.snippet.title,
    channel: video.snippet.channelTitle,
    description: video.snippet.description?.slice(0, 150) || '',
    image: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || '',
    url: `https://www.youtube.com/watch?v=${video.id}`,
    metrics: {
      views: parseInt(video.statistics?.viewCount || 0, 10),
      likes: parseInt(video.statistics?.likeCount || 0, 10),
      comments: parseInt(video.statistics?.commentCount || 0, 10),
    },
    publishedAt: video.snippet.publishedAt,
    source: 'youtube',
    type: 'video',
  }));
}

/**
 * Get trending music videos
 */
export async function getTrendingMusic(regionCode = 'US', maxResults = 20) {
  return getTrendingVideos(regionCode, '10', maxResults); // Category 10 = Music
}

/**
 * Get trending entertainment videos
 */
export async function getTrendingEntertainment(regionCode = 'US', maxResults = 20) {
  return getTrendingVideos(regionCode, '24', maxResults); // Category 24 = Entertainment
}

/**
 * Search videos
 * @param {string} query
 * @param {number} maxResults
 */
export async function searchVideos(query, maxResults = 10) {
  const params = {
    part: 'snippet',
    q: query,
    type: 'video',
    order: 'viewCount',
    maxResults: maxResults.toString(),
  };

  const data = await youtubeRequest('/search', params);
  if (!data?.items) return [];

  // Get video IDs for statistics
  const videoIds = data.items.map((item) => item.id.videoId).join(',');

  // Fetch full video details with statistics
  const videosData = await youtubeRequest('/videos', {
    part: 'snippet,statistics',
    id: videoIds,
  });

  if (!videosData?.items) {
    // Return basic info without stats
    return data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      description: item.snippet.description?.slice(0, 150) || '',
      image: item.snippet.thumbnails?.high?.url || '',
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      metrics: { views: 0, likes: 0, comments: 0 },
      publishedAt: item.snippet.publishedAt,
      source: 'youtube',
      type: 'video',
    }));
  }

  return videosData.items.map((video) => ({
    id: video.id,
    title: video.snippet.title,
    channel: video.snippet.channelTitle,
    description: video.snippet.description?.slice(0, 150) || '',
    image: video.snippet.thumbnails?.high?.url || '',
    url: `https://www.youtube.com/watch?v=${video.id}`,
    metrics: {
      views: parseInt(video.statistics?.viewCount || 0, 10),
      likes: parseInt(video.statistics?.likeCount || 0, 10),
      comments: parseInt(video.statistics?.commentCount || 0, 10),
    },
    publishedAt: video.snippet.publishedAt,
    source: 'youtube',
    type: 'video',
  }));
}

/**
 * Get video details by ID (useful for link imports)
 * @param {string} videoId
 */
export async function getVideoDetails(videoId) {
  const data = await youtubeRequest('/videos', {
    part: 'snippet,statistics',
    id: videoId,
  });

  if (!data?.items?.[0]) return null;

  const video = data.items[0];
  return {
    id: video.id,
    title: video.snippet.title,
    channel: video.snippet.channelTitle,
    description: video.snippet.description,
    image: video.snippet.thumbnails?.high?.url || '',
    url: `https://www.youtube.com/watch?v=${video.id}`,
    metrics: {
      views: parseInt(video.statistics?.viewCount || 0, 10),
      likes: parseInt(video.statistics?.likeCount || 0, 10),
      comments: parseInt(video.statistics?.commentCount || 0, 10),
    },
    publishedAt: video.snippet.publishedAt,
    source: 'youtube',
    type: 'video',
  };
}

/**
 * Extract video ID from YouTube URL
 * @param {string} url
 */
export function extractVideoId(url) {
  if (!url) return null;

  // Handle various YouTube URL formats
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,                    // youtube.com/watch?v=VIDEO_ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,               // youtu.be/VIDEO_ID
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,     // youtube.com/embed/VIDEO_ID
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,    // youtube.com/shorts/VIDEO_ID
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,         // youtube.com/v/VIDEO_ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      console.log('Matched pattern:', pattern, 'Video ID:', match[1]);
      return match[1];
    }
  }

  console.log('No pattern matched for URL:', url);
  return null;
}

/**
 * Extract channel identifier from YouTube URL
 * @param {string} url
 * @returns {object|null} { type: 'id'|'username'|'handle', value: string }
 */
export function extractChannelInfo(url) {
  if (!url) return null;

  // Channel ID: youtube.com/channel/UC...
  const channelIdMatch = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (channelIdMatch) return { type: 'id', value: channelIdMatch[1] };

  // Handle: youtube.com/@username
  const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/);
  if (handleMatch) return { type: 'handle', value: handleMatch[1] };

  // Legacy username: youtube.com/user/username or youtube.com/c/username
  const userMatch = url.match(/youtube\.com\/(?:user|c)\/([a-zA-Z0-9_-]+)/);
  if (userMatch) return { type: 'username', value: userMatch[1] };

  return null;
}

/**
 * Get channel metrics from a YouTube channel URL
 * @param {string} url - YouTube channel URL
 */
export async function getYouTubeChannelFromUrl(url) {
  if (!isYouTubeConfigured()) return null;

  const channelInfo = extractChannelInfo(url);
  if (!channelInfo) return null;

  let channelData;

  if (channelInfo.type === 'id') {
    // Direct channel ID lookup
    channelData = await youtubeRequest('/channels', {
      part: 'snippet,statistics',
      id: channelInfo.value,
    });
  } else {
    // Search for channel by handle or username
    const searchData = await youtubeRequest('/search', {
      part: 'snippet',
      q: channelInfo.value,
      type: 'channel',
      maxResults: '1',
    });

    if (searchData?.items?.[0]) {
      const channelId = searchData.items[0].snippet.channelId;
      channelData = await youtubeRequest('/channels', {
        part: 'snippet,statistics',
        id: channelId,
      });
    }
  }

  if (!channelData?.items?.[0]) return null;

  const channel = channelData.items[0];
  return {
    title: channel.snippet.title,
    description: channel.snippet.description?.slice(0, 150) || '',
    image: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url || '',
    url: `https://www.youtube.com/channel/${channel.id}`,
    metrics: {
      followers: parseInt(channel.statistics?.subscriberCount || 0, 10),
      views: parseInt(channel.statistics?.viewCount || 0, 10),
      videoCount: parseInt(channel.statistics?.videoCount || 0, 10),
    },
    source: 'youtube',
    type: 'channel',
  };
}

/**
 * Get all trending content for discover page
 */
export async function getYouTubeTrending() {
  if (!isYouTubeConfigured()) {
    return { trending: [], music: [], error: 'YouTube API not configured' };
  }

  const [trending, music] = await Promise.all([
    getTrendingVideos('US', null, 10),
    getTrendingMusic('US', 10),
  ]);

  return { trending, music };
}

/**
 * Get channel details by ID (for subscriber count)
 * @param {string} channelId
 */
export async function getChannelDetails(channelId) {
  const data = await youtubeRequest('/channels', {
    part: 'snippet,statistics',
    id: channelId,
  });

  if (!data?.items?.[0]) return null;

  const channel = data.items[0];
  return {
    id: channel.id,
    name: channel.snippet.title,
    subscribers: parseInt(channel.statistics?.subscriberCount || 0, 10),
    videoCount: parseInt(channel.statistics?.videoCount || 0, 10),
    viewCount: parseInt(channel.statistics?.viewCount || 0, 10),
  };
}

/**
 * Get full metrics for a YouTube URL (video + channel stats)
 * @param {string} url - YouTube video URL
 * @returns {object} { title, channel, image, metrics: { views, likes, comments, followers } }
 */
export async function getYouTubeMetricsFromUrl(url) {
  console.log('getYouTubeMetricsFromUrl called with:', url);

  if (!isYouTubeConfigured()) {
    console.log('YouTube not configured');
    return null;
  }

  const videoId = extractVideoId(url);
  console.log('Extracted video ID:', videoId);

  if (!videoId) {
    console.log('Could not extract video ID');
    return null;
  }

  // Get video details first
  const videoData = await youtubeRequest('/videos', {
    part: 'snippet,statistics',
    id: videoId,
  });

  console.log('Video API response:', videoData);

  if (!videoData?.items?.[0]) {
    console.log('No video data returned');
    return null;
  }

  const video = videoData.items[0];
  const channelId = video.snippet.channelId;

  // Get channel subscriber count
  let subscribers = 0;
  if (channelId) {
    const channelData = await youtubeRequest('/channels', {
      part: 'statistics',
      id: channelId,
    });
    console.log('Channel API response:', channelData);

    if (channelData?.items?.[0]) {
      subscribers = parseInt(channelData.items[0].statistics?.subscriberCount || 0, 10);
    }
  }

  const result = {
    title: video.snippet.title,
    channel: video.snippet.channelTitle,
    description: video.snippet.description?.slice(0, 150) || '',
    image: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || '',
    url: `https://www.youtube.com/watch?v=${videoId}`,
    metrics: {
      views: parseInt(video.statistics?.viewCount || 0, 10),
      likes: parseInt(video.statistics?.likeCount || 0, 10),
      comments: parseInt(video.statistics?.commentCount || 0, 10),
      followers: subscribers,
    },
    source: 'youtube',
    type: 'video',
  };

  console.log('Returning YouTube data:', result);
  return result;
}
