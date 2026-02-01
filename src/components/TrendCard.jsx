import { formatMetric } from '../utils/metrics';

const SOURCE_CONFIG = {
  lastfm: { icon: '🎸', label: 'Last.fm', color: '#d51007' },
  spotify: { icon: '🎵', label: 'Spotify', color: '#1DB954' },
  youtube: { icon: '▶️', label: 'YouTube', color: '#FF0000' },
  tiktok: { icon: '📱', label: 'TikTok', color: '#000000' },
  instagram: { icon: '📸', label: 'Instagram', color: '#E4405F' },
  googleTrends: { icon: '📈', label: 'Google', color: '#4285F4' },
};

const TYPE_LABELS = {
  video: 'Video',
  sound: 'Sound',
  track: 'Track',
  album: 'Album',
  hashtag: 'Hashtag',
  reel: 'Reel',
  post: 'Post',
  playlist: 'Playlist',
};

export default function TrendCard({
  trend,
  categories,
  onAdd,
  onClick,
  compact = false,
  showAddButtons = true,
  highlightKeywords = [],
}) {
  const source = SOURCE_CONFIG[trend.source] || { icon: '🔗', label: 'Web', color: '#666' };

  const handleAdd = (categoryId) => {
    onAdd({
      name: trend.artist ? `${trend.title} - ${trend.artist}` : trend.title || trend.name,
      image: trend.image || '',
      category: categoryId,
      sourceUrl: trend.url || '',
      source: trend.source,
      metrics: trend.metrics || null,
      platform: trend.source,
    });
  };

  // Get primary metric to display
  const getPrimaryMetric = () => {
    if (!trend.metrics) return null;

    if (trend.metrics.views) {
      return { label: 'views', value: formatMetric(trend.metrics.views) };
    }
    if (trend.metrics.likes) {
      return { label: 'likes', value: formatMetric(trend.metrics.likes) };
    }
    if (trend.metrics.videoCount) {
      return { label: 'videos', value: formatMetric(trend.metrics.videoCount) };
    }
    if (trend.metrics.postCount) {
      return { label: 'posts', value: formatMetric(trend.metrics.postCount) };
    }
    return null;
  };

  // Get secondary metrics
  const getSecondaryMetrics = () => {
    if (!trend.metrics) return [];

    const metrics = [];
    if (trend.metrics.likes && trend.metrics.views) {
      metrics.push({ label: 'likes', value: formatMetric(trend.metrics.likes) });
    }
    if (trend.metrics.comments) {
      metrics.push({ label: 'comments', value: formatMetric(trend.metrics.comments) });
    }
    if (trend.metrics.shares) {
      metrics.push({ label: 'shares', value: formatMetric(trend.metrics.shares) });
    }
    return metrics.slice(0, 2);
  };

  const primaryMetric = getPrimaryMetric();
  const secondaryMetrics = getSecondaryMetrics();

  // Highlight matching keywords
  const highlightText = (text) => {
    if (!highlightKeywords.length || !text) return text;

    let result = text;
    for (const keyword of highlightKeywords) {
      const regex = new RegExp(`(${keyword})`, 'gi');
      result = result.replace(regex, '<mark>$1</mark>');
    }
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  if (compact) {
    return (
      <div className={`trend-card compact ${onClick ? 'clickable' : ''}`} onClick={onClick}>
        <div className="trend-card-source">
          <span className="source-icon">{source.icon}</span>
        </div>
        <div className="trend-card-info">
          <div className="trend-card-title">
            {onClick ? (
              <span className="trend-title-link">{highlightText(trend.title || trend.name)}</span>
            ) : trend.url ? (
              <a href={trend.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                {highlightText(trend.title || trend.name)}
              </a>
            ) : (
              highlightText(trend.title || trend.name)
            )}
          </div>
          {(trend.artist || trend.author || trend.channel) && (
            <div className="trend-card-artist">
              {trend.artist || trend.author || trend.channel}
            </div>
          )}
        </div>
        {primaryMetric && (
          <div className="trend-card-metric">
            <span className="metric-value">{primaryMetric.value}</span>
            <span className="metric-label">{primaryMetric.label}</span>
          </div>
        )}
        {showAddButtons && (
          <div className="trend-card-add-compact">
            <select onChange={(e) => e.target.value && handleAdd(e.target.value)}>
              <option value="">+ Add</option>
              {categories
                .filter((c) => c.enabled !== false)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`trend-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="trend-card-header">
        <div className="trend-card-source" style={{ backgroundColor: source.color }}>
          <span className="source-icon">{source.icon}</span>
          <span className="source-label">{source.label}</span>
        </div>
        {trend.type && TYPE_LABELS[trend.type] && (
          <span className="trend-card-type">{TYPE_LABELS[trend.type]}</span>
        )}
      </div>

      <div className="trend-card-body">
        {trend.image && (
          <div className="trend-card-image">
            <img src={trend.image} alt={trend.title || trend.name} />
          </div>
        )}

        <div className="trend-card-content">
          <h3 className="trend-card-title">
            {onClick ? (
              <span className="trend-title-link">{highlightText(trend.title || trend.name)}</span>
            ) : trend.url ? (
              <a href={trend.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                {highlightText(trend.title || trend.name)}
              </a>
            ) : (
              highlightText(trend.title || trend.name)
            )}
          </h3>

          {(trend.artist || trend.author || trend.channel) && (
            <div className="trend-card-artist">
              {trend.artist || trend.author || trend.channel}
            </div>
          )}

          {trend.description && (
            <p className="trend-card-description">
              {highlightText(trend.description.slice(0, 120))}
              {trend.description.length > 120 && '...'}
            </p>
          )}

          {trend.hashtags && trend.hashtags.length > 0 && (
            <div className="trend-card-hashtags">
              {trend.hashtags.slice(0, 3).map((tag, i) => (
                <span key={i} className="hashtag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {(primaryMetric || secondaryMetrics.length > 0) && (
        <div className="trend-card-metrics">
          {primaryMetric && (
            <div className="metric primary">
              <span className="metric-value">{primaryMetric.value}</span>
              <span className="metric-label">{primaryMetric.label}</span>
            </div>
          )}
          {secondaryMetrics.map((m, i) => (
            <div key={i} className="metric">
              <span className="metric-value">{m.value}</span>
              <span className="metric-label">{m.label}</span>
            </div>
          ))}
        </div>
      )}

      {showAddButtons && (
        <div className="trend-card-actions">
          <span className="add-label">Add to:</span>
          <div className="add-buttons">
            {categories
              .filter((c) => c.enabled !== false)
              .map((cat) => (
                <button
                  key={cat.id}
                  className="btn-add-to-category"
                  onClick={() => handleAdd(cat.id)}
                >
                  + {cat.label}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
