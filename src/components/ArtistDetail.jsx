import { useState, useEffect } from 'react';
import { getArtistInfo, getSimilarArtists } from '../utils/lastfm';

export default function ArtistDetail({ artist, categories, onAddTrend, onClose, onSelectArtist }) {
  const [loading, setLoading] = useState(true);
  const [artistInfo, setArtistInfo] = useState(null);
  const [similarArtists, setSimilarArtists] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadArtistInfo();
  }, [artist]);

  const loadArtistInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const [info, similar] = await Promise.all([
        getArtistInfo(artist.name || artist.title),
        getSimilarArtists(artist.name || artist.title, 8),
      ]);

      setArtistInfo(info);
      setSimilarArtists(similar);
    } catch (err) {
      setError('Failed to load artist info');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (categoryId) => {
    onAddTrend({
      name: artistInfo?.name || artist.name || artist.title,
      image: artistInfo?.image || artist.image || '',
      category: categoryId,
      sourceUrl: artistInfo?.url || artist.url || '',
      source: 'lastfm',
      metrics: artistInfo?.metrics || artist.metrics || null,
      platform: 'lastfm',
    });
    onClose();
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
  };

  return (
    <div className="artist-detail-overlay" onClick={onClose}>
      <div className="artist-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn-close-modal" onClick={onClose}>×</button>

        {loading ? (
          <div className="artist-detail-loading">
            <div className="spinner"></div>
            <p>Loading artist info...</p>
          </div>
        ) : error ? (
          <div className="artist-detail-error">
            <p>{error}</p>
            <button onClick={loadArtistInfo}>Try Again</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="artist-detail-header">
              {(artistInfo?.image || artist.image) && (
                <div className="artist-detail-image">
                  <img src={artistInfo?.image || artist.image} alt={artistInfo?.name || artist.name} />
                </div>
              )}
              <div className="artist-detail-title">
                <h2>{artistInfo?.name || artist.name || artist.title}</h2>
                {artistInfo?.tags && artistInfo.tags.length > 0 && (
                  <div className="artist-tags">
                    {artistInfo.tags.slice(0, 5).map((tag, i) => (
                      <span key={i} className="artist-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Metrics */}
            {artistInfo?.metrics && (
              <div className="artist-detail-metrics">
                <div className="metric-box">
                  <span className="metric-value">{formatNumber(artistInfo.metrics.listeners)}</span>
                  <span className="metric-label">Listeners</span>
                </div>
                <div className="metric-box">
                  <span className="metric-value">{formatNumber(artistInfo.metrics.playcount)}</span>
                  <span className="metric-label">Scrobbles</span>
                </div>
              </div>
            )}

            {/* Bio */}
            {artistInfo?.bio && (
              <div className="artist-detail-bio">
                <p>{artistInfo.bio.slice(0, 300)}{artistInfo.bio.length > 300 && '...'}</p>
              </div>
            )}

            {/* Add to Heatmap */}
            <div className="artist-detail-actions">
              <span className="add-label">Add to heatmap:</span>
              <div className="add-buttons">
                {categories
                  .filter((c) => c.enabled !== false)
                  .map((cat) => (
                    <button
                      key={cat.id}
                      className="btn-add-category"
                      onClick={() => handleAdd(cat.id)}
                    >
                      + {cat.label}
                    </button>
                  ))}
              </div>
            </div>

            {/* External Link */}
            {(artistInfo?.url || artist.url) && (
              <a
                href={artistInfo?.url || artist.url}
                target="_blank"
                rel="noopener noreferrer"
                className="artist-external-link"
              >
                View on Last.fm ↗
              </a>
            )}

            {/* Similar Artists */}
            {similarArtists.length > 0 && (
              <div className="artist-detail-similar">
                <h3>Similar Artists</h3>
                <div className="similar-artists-grid">
                  {similarArtists.map((similar) => (
                    <button
                      key={similar.id}
                      className="similar-artist-card"
                      onClick={() => onSelectArtist(similar)}
                    >
                      {similar.image && (
                        <img src={similar.image} alt={similar.name} />
                      )}
                      <span className="similar-artist-name">{similar.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
