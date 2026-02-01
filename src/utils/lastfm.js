// Last.fm API integration
// Free API - get key at https://www.last.fm/api/account/create

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/';
const LASTFM_KEY_STORAGE = 'culture-heatmap-lastfm-key';

/**
 * Get stored Last.fm API key
 */
export function getLastFmKey() {
  return localStorage.getItem(LASTFM_KEY_STORAGE) || '';
}

/**
 * Save Last.fm API key
 */
export function saveLastFmKey(key) {
  localStorage.setItem(LASTFM_KEY_STORAGE, key);
}

/**
 * Check if Last.fm is configured
 */
export function isLastFmConfigured() {
  return !!getLastFmKey();
}

/**
 * Make Last.fm API request
 */
async function lastfmRequest(method, params = {}) {
  const apiKey = getLastFmKey();
  if (!apiKey) return null;

  const url = new URL(LASTFM_API_BASE);
  url.searchParams.set('method', method);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('format', 'json');

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('Last.fm API error:', response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Last.fm fetch error:', error);
    return null;
  }
}

/**
 * Get top/trending artists
 * @param {number} limit
 */
export async function getTopArtists(limit = 20) {
  const data = await lastfmRequest('chart.gettopartists', { limit });

  if (!data?.artists?.artist) return [];

  return data.artists.artist.map((artist) => ({
    id: artist.mbid || artist.name,
    title: artist.name,
    name: artist.name,
    image: artist.image?.find(i => i.size === 'large')?.['#text'] ||
           artist.image?.find(i => i.size === 'medium')?.['#text'] || '',
    url: artist.url,
    metrics: {
      listeners: parseInt(artist.listeners || 0, 10),
      playcount: parseInt(artist.playcount || 0, 10),
    },
    source: 'lastfm',
    type: 'artist',
    category: 'creators',
  }));
}

/**
 * Get top/trending tracks
 * @param {number} limit
 */
export async function getTopTracks(limit = 20) {
  const data = await lastfmRequest('chart.gettoptracks', { limit });

  if (!data?.tracks?.track) return [];

  return data.tracks.track.map((track) => ({
    id: track.mbid || `${track.artist.name}-${track.name}`,
    title: track.name,
    artist: track.artist.name,
    image: track.image?.find(i => i.size === 'large')?.['#text'] ||
           track.image?.find(i => i.size === 'medium')?.['#text'] || '',
    url: track.url,
    metrics: {
      listeners: parseInt(track.listeners || 0, 10),
      playcount: parseInt(track.playcount || 0, 10),
    },
    source: 'lastfm',
    type: 'track',
    category: 'sounds',
  }));
}

/**
 * Get trending artists from charts
 * Note: The old "hyped" endpoints were deprecated by Last.fm
 * We now use top artists and calculate engagement ratio
 * @param {number} limit
 */
export async function getHypedArtists(limit = 20) {
  const data = await lastfmRequest('chart.gettopartists', { limit });

  if (!data?.artists?.artist) return [];

  // Sort by listeners-to-playcount ratio (higher ratio = more new listeners = "rising")
  const artists = data.artists.artist.map((artist) => {
    const listeners = parseInt(artist.listeners || 0, 10);
    const playcount = parseInt(artist.playcount || 0, 10);
    // Higher ratio means more unique listeners vs plays = broader reach
    const engagementRatio = playcount > 0 ? (listeners / (playcount / 1000)).toFixed(2) : 0;

    return {
      id: artist.mbid || artist.name,
      title: artist.name,
      name: artist.name,
      description: `${formatNumber(listeners)} listeners`,
      image: artist.image?.find(i => i.size === 'large')?.['#text'] ||
             artist.image?.find(i => i.size === 'medium')?.['#text'] || '',
      url: artist.url,
      metrics: {
        listeners,
        playcount,
      },
      popularity: listeners,
      source: 'lastfm',
      type: 'artist',
      category: 'creators',
      isHyped: true,
    };
  });

  return artists;
}

/**
 * Get trending tracks from charts
 * @param {number} limit
 */
export async function getHypedTracks(limit = 20) {
  const data = await lastfmRequest('chart.gettoptracks', { limit });

  if (!data?.tracks?.track) return [];

  return data.tracks.track.map((track) => {
    const listeners = parseInt(track.listeners || 0, 10);
    const playcount = parseInt(track.playcount || 0, 10);

    return {
      id: track.mbid || `${track.artist.name}-${track.name}`,
      title: track.name,
      artist: track.artist.name,
      description: `${formatNumber(listeners)} listeners`,
      image: track.image?.find(i => i.size === 'large')?.['#text'] ||
             track.image?.find(i => i.size === 'medium')?.['#text'] || '',
      url: track.url,
      metrics: {
        listeners,
        playcount,
      },
      popularity: listeners,
      source: 'lastfm',
      type: 'track',
      category: 'sounds',
      isHyped: true,
    };
  });
}

/**
 * Format large numbers for display
 */
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toString();
}

/**
 * Get artist info with bio and stats
 * @param {string} artistName
 */
export async function getArtistInfo(artistName) {
  const data = await lastfmRequest('artist.getinfo', { artist: artistName });

  if (!data?.artist) return null;

  const artist = data.artist;
  return {
    id: artist.mbid || artist.name,
    name: artist.name,
    bio: artist.bio?.summary?.replace(/<[^>]*>/g, '') || '',
    image: artist.image?.find(i => i.size === 'large')?.['#text'] || '',
    url: artist.url,
    metrics: {
      listeners: parseInt(artist.stats?.listeners || 0, 10),
      playcount: parseInt(artist.stats?.playcount || 0, 10),
    },
    tags: artist.tags?.tag?.map(t => t.name) || [],
    similar: artist.similar?.artist?.map(a => a.name) || [],
    source: 'lastfm',
    type: 'artist',
  };
}

/**
 * Search for artists
 * @param {string} query
 * @param {number} limit
 */
export async function searchArtists(query, limit = 10) {
  const data = await lastfmRequest('artist.search', { artist: query, limit });

  if (!data?.results?.artistmatches?.artist) return [];

  return data.results.artistmatches.artist.map((artist) => ({
    id: artist.mbid || artist.name,
    title: artist.name,
    name: artist.name,
    image: artist.image?.find(i => i.size === 'large')?.['#text'] || '',
    url: artist.url,
    metrics: {
      listeners: parseInt(artist.listeners || 0, 10),
    },
    source: 'lastfm',
    type: 'artist',
    category: 'creators',
  }));
}

/**
 * Get top artists by tag/genre
 * @param {string} tag - e.g., "hip-hop", "indie", "electronic"
 * @param {number} limit
 */
export async function getArtistsByTag(tag, limit = 20) {
  const data = await lastfmRequest('tag.gettopartists', { tag, limit });

  if (!data?.topartists?.artist) return [];

  return data.topartists.artist.map((artist) => ({
    id: artist.mbid || artist.name,
    title: artist.name,
    name: artist.name,
    description: `Top ${tag} artist`,
    image: artist.image?.find(i => i.size === 'large')?.['#text'] || '',
    url: artist.url,
    tag,
    source: 'lastfm',
    type: 'artist',
    category: 'creators',
  }));
}

/**
 * Get similar artists - great for discovering underground artists
 * @param {string} artistName
 * @param {number} limit
 */
export async function getSimilarArtists(artistName, limit = 20) {
  const data = await lastfmRequest('artist.getsimilar', { artist: artistName, limit });

  if (!data?.similarartists?.artist) return [];

  return data.similarartists.artist.map((artist) => ({
    id: artist.mbid || artist.name,
    title: artist.name,
    name: artist.name,
    description: `Similar to ${artistName}`,
    image: artist.image?.find(i => i.size === 'large')?.['#text'] ||
           artist.image?.find(i => i.size === 'medium')?.['#text'] || '',
    url: artist.url,
    metrics: {
      matchScore: parseFloat(artist.match || 0),
    },
    matchPercent: Math.round(parseFloat(artist.match || 0) * 100) + '%',
    source: 'lastfm',
    type: 'artist',
    category: 'creators',
  }));
}

/**
 * Get top artists by tag/genre - great for underground genres
 * @param {string} tag - e.g., "hyperpop", "experimental", "underground"
 * @param {number} limit
 */
export async function getArtistsByGenre(tag, limit = 20) {
  const data = await lastfmRequest('tag.gettopartists', { tag, limit });

  if (!data?.topartists?.artist) return [];

  return data.topartists.artist.map((artist) => ({
    id: artist.mbid || artist.name,
    title: artist.name,
    name: artist.name,
    description: tag,
    image: artist.image?.find(i => i.size === 'large')?.['#text'] ||
           artist.image?.find(i => i.size === 'medium')?.['#text'] || '',
    url: artist.url,
    tag,
    source: 'lastfm',
    type: 'artist',
    category: 'creators',
  }));
}

/**
 * Underground genre tags for discovery
 */
export const UNDERGROUND_TAGS = [
  'hyperpop',
  'experimental',
  'underground',
  'indie pop',
  'bedroom pop',
  'art pop',
  'noise pop',
  'shoegaze',
  'post-punk',
  'darkwave',
  'witch house',
  'vaporwave',
  'lo-fi',
  'emo rap',
  'cloud rap',
  'phonk',
  'drill',
  'jersey club',
];

/**
 * Get all Last.fm trending data for discover page
 */
export async function getLastFmTrending() {
  if (!isLastFmConfigured()) {
    return {
      topArtists: [],
      topTracks: [],
      hypedArtists: [],
      hypedTracks: [],
      error: 'Last.fm not configured',
    };
  }

  const [topArtists, topTracks, hypedArtists, hypedTracks] = await Promise.all([
    getTopArtists(15),
    getTopTracks(15),
    getHypedArtists(15),
    getHypedTracks(15),
  ]);

  return { topArtists, topTracks, hypedArtists, hypedTracks };
}
