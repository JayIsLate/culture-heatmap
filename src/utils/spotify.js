// Spotify API client for trend suggestions
// Requires Spotify Developer credentials (free to obtain)

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token';

// Storage key for credentials
const SPOTIFY_CREDS_KEY = 'culture-heatmap-spotify-creds';

/**
 * Get stored Spotify credentials
 * @returns {{ clientId: string, clientSecret: string, accessToken: string, expiresAt: number } | null}
 */
export function getSpotifyCredentials() {
  const stored = localStorage.getItem(SPOTIFY_CREDS_KEY);
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
 * Save Spotify credentials
 * @param {Object} credentials
 */
export function saveSpotifyCredentials(credentials) {
  localStorage.setItem(SPOTIFY_CREDS_KEY, JSON.stringify(credentials));
}

/**
 * Check if Spotify is configured
 * @returns {boolean}
 */
export function isSpotifyConfigured() {
  const creds = getSpotifyCredentials();
  return !!(creds?.clientId && creds?.clientSecret);
}

/**
 * Get access token using client credentials flow
 * @returns {Promise<string | null>}
 */
export async function getAccessToken() {
  const creds = getSpotifyCredentials();
  if (!creds?.clientId || !creds?.clientSecret) {
    return null;
  }

  // Check if existing token is still valid
  if (creds.accessToken && creds.expiresAt && Date.now() < creds.expiresAt) {
    return creds.accessToken;
  }

  // Request new token
  try {
    const response = await fetch(SPOTIFY_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' + btoa(`${creds.clientId}:${creds.clientSecret}`),
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      console.error('Spotify auth failed:', response.status);
      return null;
    }

    const data = await response.json();
    const newCreds = {
      ...creds,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000 - 60000, // 1 min buffer
    };
    saveSpotifyCredentials(newCreds);
    return data.access_token;
  } catch (error) {
    console.error('Spotify auth error:', error);
    return null;
  }
}

/**
 * Make authenticated Spotify API request
 * @param {string} endpoint
 * @returns {Promise<Object | null>}
 */
async function spotifyFetch(endpoint) {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('Spotify API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Spotify fetch error:', error);
    return null;
  }
}

/**
 * Get featured playlists (good for viral/trending content)
 * @param {string} country - ISO country code (default: US)
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getFeaturedPlaylists(country = 'US', limit = 10) {
  const data = await spotifyFetch(
    `/browse/featured-playlists?country=${country}&limit=${limit}`
  );
  if (!data?.playlists?.items) return [];

  return data.playlists.items.map((playlist) => ({
    id: playlist.id,
    title: playlist.name,
    description: playlist.description,
    image: playlist.images?.[0]?.url || '',
    url: playlist.external_urls?.spotify || '',
    type: 'playlist',
    source: 'spotify',
  }));
}

/**
 * Get new releases
 * @param {string} country
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getNewReleases(country = 'US', limit = 20) {
  const data = await spotifyFetch(
    `/browse/new-releases?country=${country}&limit=${limit}`
  );
  if (!data?.albums?.items) return [];

  return data.albums.items.map((album) => ({
    id: album.id,
    title: album.name,
    artist: album.artists?.map((a) => a.name).join(', ') || '',
    description: `${album.album_type} • ${album.release_date}`,
    image: album.images?.[0]?.url || '',
    url: album.external_urls?.spotify || '',
    type: 'album',
    source: 'spotify',
  }));
}

/**
 * Get tracks from a playlist
 * @param {string} playlistId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getPlaylistTracks(playlistId, limit = 20) {
  const data = await spotifyFetch(
    `/playlists/${playlistId}/tracks?limit=${limit}`
  );
  if (!data?.items) return [];

  return data.items
    .filter((item) => item.track)
    .map((item) => {
      const track = item.track;
      return {
        id: track.id,
        title: track.name,
        artist: track.artists?.map((a) => a.name).join(', ') || '',
        description: track.album?.name || '',
        image: track.album?.images?.[0]?.url || '',
        url: track.external_urls?.spotify || '',
        popularity: track.popularity,
        type: 'track',
        source: 'spotify',
      };
    });
}

/**
 * Search for tracks
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function searchTracks(query, limit = 10) {
  const data = await spotifyFetch(
    `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`
  );
  if (!data?.tracks?.items) return [];

  return data.tracks.items.map((track) => ({
    id: track.id,
    title: track.name,
    artist: track.artists?.map((a) => a.name).join(', ') || '',
    description: track.album?.name || '',
    image: track.album?.images?.[0]?.url || '',
    url: track.external_urls?.spotify || '',
    popularity: track.popularity,
    type: 'track',
    source: 'spotify',
  }));
}

/**
 * Get Spotify's Viral 50 playlist (Global or by country)
 * These are unofficial playlist IDs - Spotify maintains these
 * @param {string} country - 'global' or country code
 * @returns {Promise<Array>}
 */
export async function getViralChart(country = 'global') {
  // Viral 50 playlist IDs (maintained by Spotify)
  const viralPlaylists = {
    global: '37i9dQZEVXbLiRSasKsNU9',
    us: '37i9dQZEVXbKuaTI1Z1Afx',
    uk: '37i9dQZEVXbL3DLHfQeDmV',
  };

  const playlistId =
    viralPlaylists[country.toLowerCase()] || viralPlaylists.global;
  return getPlaylistTracks(playlistId, 50);
}

/**
 * Get Spotify's Top 50 playlist
 * @param {string} country
 * @returns {Promise<Array>}
 */
export async function getTopChart(country = 'global') {
  // Top 50 playlist IDs
  const topPlaylists = {
    global: '37i9dQZEVXbMDoHDwVN2tF',
    us: '37i9dQZEVXbLRQDuF5jeBp',
    uk: '37i9dQZEVXbLnolsZ8PSNw',
  };

  const playlistId = topPlaylists[country.toLowerCase()] || topPlaylists.global;
  return getPlaylistTracks(playlistId, 50);
}

/**
 * Get combined trending music data
 * @returns {Promise<{ viral: Array, top: Array, newReleases: Array }>}
 */
export async function getTrendingMusic() {
  if (!isSpotifyConfigured()) {
    return { viral: [], top: [], newReleases: [], error: 'Spotify not configured' };
  }

  const [viral, top, newReleases] = await Promise.all([
    getViralChart('global'),
    getTopChart('global'),
    getNewReleases('US', 10),
  ]);

  return { viral, top, newReleases };
}
