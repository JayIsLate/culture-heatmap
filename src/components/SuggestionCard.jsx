export default function SuggestionCard({
  suggestion,
  categories,
  onAdd,
  showImage = true,
}) {
  const {
    title,
    artist,
    description,
    image,
    url,
    change,
    popularity,
    source,
  } = suggestion;

  const handleAddToCategory = (categoryId) => {
    onAdd({
      name: artist ? `${title} - ${artist}` : title,
      image: image || '',
      category: categoryId,
      sourceUrl: url,
      source,
      popularity,
    });
  };

  const getSourceIcon = () => {
    switch (source) {
      case 'spotify':
        return '🎵';
      case 'googleTrends':
        return '📈';
      case 'tiktok':
        return '📱';
      case 'instagram':
        return '📸';
      default:
        return '🔗';
    }
  };

  const getSourceLabel = () => {
    switch (source) {
      case 'spotify':
        return 'Spotify';
      case 'googleTrends':
        return 'Google Trends';
      case 'tiktok':
        return 'TikTok';
      case 'instagram':
        return 'Instagram';
      default:
        return 'Web';
    }
  };

  return (
    <div className="suggestion-card">
      <div className="suggestion-content">
        {showImage && image && (
          <div className="suggestion-image">
            <img src={image} alt={title} />
          </div>
        )}

        <div className="suggestion-info">
          <div className="suggestion-header">
            <span className="suggestion-source">
              {getSourceIcon()} {getSourceLabel()}
            </span>
            {change && (
              <span
                className={`suggestion-change ${
                  change.startsWith('+') ? 'positive' : 'negative'
                }`}
              >
                {change}
              </span>
            )}
            {popularity !== undefined && (
              <span className="suggestion-popularity">
                Popularity: {popularity}
              </span>
            )}
          </div>

          <h4 className="suggestion-title">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {title}
              </a>
            ) : (
              title
            )}
          </h4>

          {artist && <div className="suggestion-artist">{artist}</div>}

          {description && (
            <div className="suggestion-description">{description}</div>
          )}
        </div>
      </div>

      <div className="suggestion-actions">
        <span className="add-label">Add to:</span>
        <div className="add-buttons">
          {categories
            .filter((c) => c.enabled !== false)
            .map((category) => (
              <button
                key={category.id}
                className="btn-add-category"
                onClick={() => handleAddToCategory(category.id)}
              >
                + {category.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
