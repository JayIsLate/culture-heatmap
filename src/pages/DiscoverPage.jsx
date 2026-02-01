import { useState, useEffect, useCallback } from 'react';
import TrendCard from '../components/TrendCard';
import WatchlistPanel from '../components/WatchlistPanel';
import APISettings from '../components/APISettings';
import ArtistDetail from '../components/ArtistDetail';
import {
  fetchAllTrending,
  flattenTrends,
  filterByCategory,
  filterBySource,
  searchTrends,
  detectCrossPlatformTrends,
  getWatchlistMatches,
  getPlatformStatus,
  getCacheStatus,
  clearCache,
} from '../utils/aggregator';
import { getResearchLinks } from '../utils/googleTrends';
import { getSimilarArtists, getArtistsByGenre, searchArtists, UNDERGROUND_TAGS } from '../utils/lastfm';

export default function DiscoverPage({ categories, onAddTrend, onBack }) {
  // Data state
  const [rawData, setRawData] = useState(null);
  const [allTrends, setAllTrends] = useState([]);
  const [crossPlatformTrends, setCrossPlatformTrends] = useState([]);
  const [watchlistMatches, setWatchlistMatches] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('trending');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSources, setSelectedSources] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAPISettings, setShowAPISettings] = useState(false);
  const [platformStatus, setPlatformStatus] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  // Artist discovery state
  const [artistSearch, setArtistSearch] = useState('');
  const [similarArtists, setSimilarArtists] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [genreArtists, setGenreArtists] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      setPlatformStatus(getPlatformStatus());
      const data = await fetchAllTrending(forceRefresh);
      setRawData(data);

      const trends = flattenTrends(data);
      setAllTrends(trends);

      const crossPlatform = detectCrossPlatformTrends(trends);
      setCrossPlatformTrends(crossPlatform);

      const matches = getWatchlistMatches(data);
      setWatchlistMatches(matches);

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    clearCache();
    loadData(true);
  };

  const handleWatchlistChange = () => {
    if (rawData) {
      const matches = getWatchlistMatches(rawData);
      setWatchlistMatches(matches);
    }
  };

  const handleSourceToggle = (source) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  // Search for similar artists
  const handleArtistSearch = async (e) => {
    e.preventDefault();
    if (!artistSearch.trim() || !platformStatus.lastfm) return;

    setDiscoveryLoading(true);
    setGenreArtists([]); // Clear genre results
    setSelectedGenre('');
    try {
      const results = await getSimilarArtists(artistSearch.trim(), 20);
      setSimilarArtists(results);
      if (results.length === 0) {
        console.log('No similar artists found for:', artistSearch);
      }
    } catch (err) {
      console.error('Artist search error:', err);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  // Browse by genre
  const handleGenreSelect = async (genre) => {
    if (!platformStatus.lastfm) return;

    setSelectedGenre(genre);
    setDiscoveryLoading(true);
    setSimilarArtists([]); // Clear search results
    try {
      const results = await getArtistsByGenre(genre, 20);
      setGenreArtists(results);
    } catch (err) {
      console.error('Genre search error:', err);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  // Filter trends based on current filters
  const getFilteredTrends = useCallback(() => {
    let filtered = allTrends;

    if (selectedCategory !== 'all') {
      filtered = filterByCategory(filtered, selectedCategory);
    }

    if (selectedSources.length > 0) {
      filtered = filterBySource(filtered, selectedSources);
    }

    if (searchQuery) {
      filtered = searchTrends(filtered, searchQuery);
    }

    return filtered;
  }, [allTrends, selectedCategory, selectedSources, searchQuery]);

  const filteredTrends = getFilteredTrends();
  const researchLinks = getResearchLinks();

  // Organize trends by source
  const trendsBySource = {
    spotify: allTrends.filter((t) => t.source === 'spotify'),
    youtube: allTrends.filter((t) => t.source === 'youtube'),
    tiktok: allTrends.filter((t) => t.source === 'tiktok'),
    instagram: allTrends.filter((t) => t.source === 'instagram'),
    lastfm: allTrends.filter((t) => t.source === 'lastfm'),
    googleTrends: allTrends.filter((t) => t.source === 'googleTrends'),
  };

  // Get hyped/rising artists specifically
  const hypedArtists = rawData?.lastfm?.hypedArtists || [];
  const hypedTracks = rawData?.lastfm?.hypedTracks || [];

  const configuredSourceCount = Object.values(platformStatus).filter(Boolean).length;

  return (
    <div className="discover-page">
      {/* Header */}
      <header className="discover-header">
        <div className="discover-header-left">
          <button className="btn-back" onClick={onBack}>
            ← Back to Heatmap
          </button>
          <h1>Discover Trends</h1>
          {lastUpdated && (
            <span className="last-updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="discover-header-right">
          <button
            className="btn-settings"
            onClick={() => setShowAPISettings(true)}
          >
            ⚙️ APIs ({configuredSourceCount}/4)
          </button>
          <button
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? '↻ Loading...' : '↻ Refresh'}
          </button>
        </div>
      </header>

      <div className="discover-body">
        {/* Sidebar */}
        <aside className="discover-sidebar">
          {/* Watchlist */}
          <WatchlistPanel
            onWatchlistChange={handleWatchlistChange}
            matchResults={watchlistMatches}
          />

          {/* Filters */}
          <div className="discover-filters">
            <h3>Filters</h3>

            <div className="filter-group">
              <label>Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories
                  .filter((c) => c.enabled !== false)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Platforms</label>
              <div className="platform-toggles">
                {[
                  { id: 'lastfm', icon: '🎸', label: 'Last.fm' },
                  { id: 'spotify', icon: '🎵', label: 'Spotify' },
                  { id: 'youtube', icon: '▶️', label: 'YouTube' },
                  { id: 'tiktok', icon: '📱', label: 'TikTok' },
                  { id: 'instagram', icon: '📸', label: 'Instagram' },
                  { id: 'googleTrends', icon: '📈', label: 'Google' },
                ].map((platform) => (
                  <button
                    key={platform.id}
                    className={`platform-toggle ${
                      selectedSources.length === 0 || selectedSources.includes(platform.id)
                        ? 'active'
                        : ''
                    } ${platformStatus[platform.id] ? 'configured' : 'not-configured'}`}
                    onClick={() => handleSourceToggle(platform.id)}
                    title={platformStatus[platform.id] ? 'Configured' : 'Not configured'}
                  >
                    {platform.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trends..."
              />
            </div>
          </div>

          {/* Research Links */}
          <div className="research-links-section">
            <h3>🔍 Research Links</h3>
            <div className="research-links-list">
              {researchLinks.slice(0, 6).map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="research-link"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="discover-main">
          {/* Section tabs */}
          <nav className="discover-sections">
            <button
              className={activeSection === 'trending' ? 'active' : ''}
              onClick={() => setActiveSection('trending')}
            >
              🔥 Trending Now
            </button>
            <button
              className={activeSection === 'watchlist' ? 'active' : ''}
              onClick={() => setActiveSection('watchlist')}
            >
              👁️ Watchlist Matches
              {watchlistMatches.length > 0 && (
                <span className="badge">{watchlistMatches.length}</span>
              )}
            </button>
            <button
              className={activeSection === 'crossplatform' ? 'active' : ''}
              onClick={() => setActiveSection('crossplatform')}
            >
              🌐 Cross-Platform
              {crossPlatformTrends.length > 0 && (
                <span className="badge">{crossPlatformTrends.length}</span>
              )}
            </button>
            <button
              className={activeSection === 'music' ? 'active' : ''}
              onClick={() => setActiveSection('music')}
            >
              🎵 Music
            </button>
            <button
              className={activeSection === 'all' ? 'active' : ''}
              onClick={() => setActiveSection('all')}
            >
              📋 All ({filteredTrends.length})
            </button>
          </nav>

          {/* Content */}
          <div className="discover-content">
            {loading && allTrends.length === 0 ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading trends from all sources...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>Error: {error}</p>
                <button onClick={handleRefresh}>Try Again</button>
              </div>
            ) : (
              <>
                {/* Trending Now */}
                {activeSection === 'trending' && (
                  <div className="section-trending">
                    {/* Platform sections */}
                    {platformStatus.spotify && trendsBySource.spotify.length > 0 && (
                      <div className="trend-section">
                        <h2>🎵 Spotify Viral</h2>
                        <div className="trend-grid">
                          {trendsBySource.spotify.slice(0, 8).map((trend) => (
                            <TrendCard
                              key={trend.id}
                              trend={trend}
                              categories={categories}
                              onAdd={onAddTrend}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {platformStatus.youtube && trendsBySource.youtube.length > 0 && (
                      <div className="trend-section">
                        <h2>▶️ YouTube Trending</h2>
                        <div className="trend-grid">
                          {trendsBySource.youtube.slice(0, 6).map((trend) => (
                            <TrendCard
                              key={trend.id}
                              trend={trend}
                              categories={categories}
                              onAdd={onAddTrend}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {platformStatus.tiktok && trendsBySource.tiktok.length > 0 && (
                      <div className="trend-section">
                        <h2>📱 TikTok Trending</h2>
                        <div className="trend-grid">
                          {trendsBySource.tiktok.slice(0, 8).map((trend) => (
                            <TrendCard
                              key={trend.id}
                              trend={trend}
                              categories={categories}
                              onAdd={onAddTrend}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {platformStatus.instagram && trendsBySource.instagram.length > 0 && (
                      <div className="trend-section">
                        <h2>📸 Instagram Trending</h2>
                        <div className="trend-grid">
                          {trendsBySource.instagram.slice(0, 6).map((trend) => (
                            <TrendCard
                              key={trend.id}
                              trend={trend}
                              categories={categories}
                              onAdd={onAddTrend}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {trendsBySource.googleTrends.length > 0 && (
                      <div className="trend-section">
                        <h2>📈 Google Trends</h2>
                        <div className="trend-grid">
                          {trendsBySource.googleTrends.map((trend) => (
                            <TrendCard
                              key={trend.id}
                              trend={trend}
                              categories={categories}
                              onAdd={onAddTrend}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {configuredSourceCount === 0 && (
                      <div className="empty-state">
                        <h2>No APIs Configured</h2>
                        <p>Configure at least one API to see trending data</p>
                        <button
                          className="btn-primary"
                          onClick={() => setShowAPISettings(true)}
                        >
                          Configure APIs
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Watchlist Matches */}
                {activeSection === 'watchlist' && (
                  <div className="section-watchlist">
                    {watchlistMatches.length > 0 ? (
                      watchlistMatches.map((match) => (
                        <div key={match.keyword.id} className="watchlist-match-group">
                          <div className="match-header">
                            <h2>"{match.keyword.displayTerm}"</h2>
                            <span className="match-count">
                              {match.matchCount} matches across{' '}
                              {match.sources.map((s) => getSourceIcon(s)).join(' ')}
                            </span>
                          </div>
                          <div className="trend-grid">
                            {match.matches.slice(0, 6).map((trend, i) => (
                              <TrendCard
                                key={`${trend.id}-${i}`}
                                trend={trend}
                                categories={categories}
                                onAdd={onAddTrend}
                                highlightKeywords={[match.keyword.term]}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <h2>No Watchlist Matches</h2>
                        <p>Add keywords to your watchlist to track trends</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cross-Platform */}
                {activeSection === 'crossplatform' && (
                  <div className="section-crossplatform">
                    {crossPlatformTrends.length > 0 ? (
                      crossPlatformTrends.map((group, i) => (
                        <div key={i} className="crossplatform-group">
                          <div className="crossplatform-header">
                            <h2>{group.name}</h2>
                            <span className="source-badges">
                              {group.sources.map((s) => (
                                <span key={s} className="source-badge">
                                  {getSourceIcon(s)}
                                </span>
                              ))}
                            </span>
                            <span className="platform-count">
                              {group.sourceCount} platforms
                            </span>
                          </div>
                          <div className="trend-grid compact">
                            {group.trends.slice(0, 4).map((trend, j) => (
                              <TrendCard
                                key={`${trend.id}-${j}`}
                                trend={trend}
                                categories={categories}
                                onAdd={onAddTrend}
                                compact
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <h2>No Cross-Platform Trends</h2>
                        <p>Cross-platform trends appear when the same topic is trending on multiple platforms</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Music - Combined artists, tracks, search, genres */}
                {activeSection === 'music' && (
                  <div className="section-music">
                    {platformStatus.lastfm ? (
                      <>
                        {/* Artist Search */}
                        <div className="artist-search-section">
                          <h2>🔍 Find Similar Artists</h2>
                          <p className="section-desc">
                            Enter an artist you like to discover similar underground artists
                          </p>
                          <form onSubmit={handleArtistSearch} className="artist-search-form">
                            <input
                              type="text"
                              value={artistSearch}
                              onChange={(e) => setArtistSearch(e.target.value)}
                              placeholder="e.g., The Snowstrippers, 100 gecs, Bladee..."
                              className="artist-search-input"
                            />
                            <button
                              type="submit"
                              disabled={discoveryLoading || !artistSearch.trim()}
                              className="btn-search"
                            >
                              {discoveryLoading ? 'Searching...' : 'Find Similar'}
                            </button>
                          </form>
                        </div>

                        {/* Similar Artists Results */}
                        {similarArtists.length > 0 && (
                          <div className="trend-section">
                            <h2>Artists similar to "{artistSearch}"</h2>
                            <div className="trend-grid">
                              {similarArtists.map((trend) => (
                                <TrendCard
                                  key={trend.id}
                                  trend={trend}
                                  categories={categories}
                                  onAdd={onAddTrend}
                                  onClick={() => setSelectedArtist(trend)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No results message */}
                        {artistSearch && similarArtists.length === 0 && !discoveryLoading && !genreArtists.length && (
                          <div className="no-results-message">
                            <p>No similar artists found for "{artistSearch}". Try a different spelling or a more well-known artist.</p>
                          </div>
                        )}

                        {/* Genre Tags */}
                        <div className="genre-section">
                          <h2>🎸 Browse by Genre</h2>
                          <div className="genre-tags">
                            {UNDERGROUND_TAGS.map((tag) => (
                              <button
                                key={tag}
                                className={`genre-tag ${selectedGenre === tag ? 'active' : ''}`}
                                onClick={() => handleGenreSelect(tag)}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Genre Results */}
                        {genreArtists.length > 0 && selectedGenre && (
                          <div className="trend-section">
                            <h2>Top "{selectedGenre}" artists</h2>
                            <div className="trend-grid">
                              {genreArtists.map((trend) => (
                                <TrendCard
                                  key={trend.id}
                                  trend={trend}
                                  categories={categories}
                                  onAdd={onAddTrend}
                                  onClick={() => setSelectedArtist(trend)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top Artists */}
                        {hypedArtists.length > 0 && !similarArtists.length && !genreArtists.length && (
                          <div className="trend-section">
                            <h2>🚀 Trending Artists</h2>
                            <div className="trend-grid">
                              {hypedArtists.map((trend) => (
                                <TrendCard
                                  key={trend.id}
                                  trend={trend}
                                  categories={categories}
                                  onAdd={onAddTrend}
                                  onClick={() => setSelectedArtist(trend)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top Tracks */}
                        {hypedTracks.length > 0 && !similarArtists.length && !genreArtists.length && (
                          <div className="trend-section">
                            <h2>🎵 Top Tracks</h2>
                            <div className="trend-grid">
                              {hypedTracks.map((trend) => (
                                <TrendCard
                                  key={trend.id}
                                  trend={trend}
                                  categories={categories}
                                  onAdd={onAddTrend}
                                  onClick={() => setSelectedArtist(trend)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="empty-state">
                        <h2>Connect Last.fm</h2>
                        <p>Last.fm lets you discover artists, browse genres, and see trending music</p>
                        <button
                          className="btn-primary"
                          onClick={() => setShowAPISettings(true)}
                        >
                          Configure Last.fm (Free)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* All */}
                {activeSection === 'all' && (
                  <div className="section-all">
                    <div className="trend-grid">
                      {filteredTrends.map((trend) => (
                        <TrendCard
                          key={trend.id}
                          trend={trend}
                          categories={categories}
                          onAdd={onAddTrend}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* API Settings Modal */}
      {showAPISettings && (
        <APISettings
          onClose={() => setShowAPISettings(false)}
          onSave={() => {
            setPlatformStatus(getPlatformStatus());
            loadData(true);
          }}
        />
      )}

      {/* Artist Detail Modal */}
      {selectedArtist && (
        <ArtistDetail
          artist={selectedArtist}
          categories={categories}
          onAddTrend={onAddTrend}
          onClose={() => setSelectedArtist(null)}
          onSelectArtist={(artist) => setSelectedArtist(artist)}
        />
      )}
    </div>
  );
}

function getSourceIcon(source) {
  const icons = {
    spotify: '🎵',
    youtube: '▶️',
    tiktok: '📱',
    instagram: '📸',
    googleTrends: '📈',
  };
  return icons[source] || '🔗';
}
