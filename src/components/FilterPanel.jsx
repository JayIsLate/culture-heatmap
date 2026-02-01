import { useState } from 'react';

export default function FilterPanel({
  categories,
  preferences,
  onPreferencesChange,
}) {
  const [newKeyword, setNewKeyword] = useState('');
  const [newExclude, setNewExclude] = useState('');

  const handleCategoryToggle = (categoryId) => {
    const current = preferences.filters.categories;
    let updated;

    if (current.includes(categoryId)) {
      updated = current.filter((id) => id !== categoryId);
    } else {
      updated = [...current, categoryId];
    }

    onPreferencesChange({
      ...preferences,
      filters: {
        ...preferences.filters,
        categories: updated,
      },
    });
  };

  const handleAddKeyword = (e) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    const keyword = newKeyword.trim().toLowerCase();
    if (!preferences.filters.keywords.includes(keyword)) {
      onPreferencesChange({
        ...preferences,
        filters: {
          ...preferences.filters,
          keywords: [...preferences.filters.keywords, keyword],
        },
      });
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (keyword) => {
    onPreferencesChange({
      ...preferences,
      filters: {
        ...preferences.filters,
        keywords: preferences.filters.keywords.filter((k) => k !== keyword),
      },
    });
  };

  const handleAddExclude = (e) => {
    e.preventDefault();
    if (!newExclude.trim()) return;

    const keyword = newExclude.trim().toLowerCase();
    if (!preferences.filters.excludeKeywords.includes(keyword)) {
      onPreferencesChange({
        ...preferences,
        filters: {
          ...preferences.filters,
          excludeKeywords: [...preferences.filters.excludeKeywords, keyword],
        },
      });
    }
    setNewExclude('');
  };

  const handleRemoveExclude = (keyword) => {
    onPreferencesChange({
      ...preferences,
      filters: {
        ...preferences.filters,
        excludeKeywords: preferences.filters.excludeKeywords.filter(
          (k) => k !== keyword
        ),
      },
    });
  };

  const handlePlatformToggle = (platform) => {
    onPreferencesChange({
      ...preferences,
      platforms: {
        ...preferences.platforms,
        [platform]: !preferences.platforms[platform],
      },
    });
  };

  const handleReset = () => {
    onPreferencesChange({
      ...preferences,
      filters: {
        categories: [],
        keywords: [],
        excludeKeywords: [],
      },
    });
  };

  return (
    <div className="filter-panel">
      <div className="filter-section">
        <h4>Categories</h4>
        <p className="filter-hint">
          {preferences.filters.categories.length === 0
            ? 'Showing all categories'
            : `Filtering ${preferences.filters.categories.length} categories`}
        </p>
        <div className="filter-toggles">
          {categories
            .filter((c) => c.enabled !== false)
            .map((category) => (
              <label key={category.id} className="filter-toggle">
                <input
                  type="checkbox"
                  checked={
                    preferences.filters.categories.length === 0 ||
                    preferences.filters.categories.includes(category.id)
                  }
                  onChange={() => handleCategoryToggle(category.id)}
                />
                <span>{category.label}</span>
              </label>
            ))}
        </div>
      </div>

      <div className="filter-section">
        <h4>Include Keywords</h4>
        <p className="filter-hint">
          Only show suggestions containing these words
        </p>
        <form onSubmit={handleAddKeyword} className="keyword-input">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Add keyword..."
          />
          <button type="submit">Add</button>
        </form>
        {preferences.filters.keywords.length > 0 && (
          <div className="keyword-tags">
            {preferences.filters.keywords.map((keyword) => (
              <span key={keyword} className="keyword-tag">
                {keyword}
                <button onClick={() => handleRemoveKeyword(keyword)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="filter-section">
        <h4>Exclude Keywords</h4>
        <p className="filter-hint">Hide suggestions containing these words</p>
        <form onSubmit={handleAddExclude} className="keyword-input">
          <input
            type="text"
            value={newExclude}
            onChange={(e) => setNewExclude(e.target.value)}
            placeholder="Add exclusion..."
          />
          <button type="submit">Add</button>
        </form>
        {preferences.filters.excludeKeywords.length > 0 && (
          <div className="keyword-tags exclude">
            {preferences.filters.excludeKeywords.map((keyword) => (
              <span key={keyword} className="keyword-tag">
                {keyword}
                <button onClick={() => handleRemoveExclude(keyword)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="filter-section">
        <h4>Data Sources</h4>
        <div className="filter-toggles">
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={preferences.platforms.spotify}
              onChange={() => handlePlatformToggle('spotify')}
            />
            <span>🎵 Spotify</span>
          </label>
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={preferences.platforms.googleTrends}
              onChange={() => handlePlatformToggle('googleTrends')}
            />
            <span>📈 Google Trends</span>
          </label>
          <label className="filter-toggle disabled">
            <input
              type="checkbox"
              checked={preferences.platforms.tiktok}
              onChange={() => handlePlatformToggle('tiktok')}
              disabled
            />
            <span>📱 TikTok (Paid API)</span>
          </label>
          <label className="filter-toggle disabled">
            <input
              type="checkbox"
              checked={preferences.platforms.instagram}
              onChange={() => handlePlatformToggle('instagram')}
              disabled
            />
            <span>📸 Instagram (Paid API)</span>
          </label>
        </div>
      </div>

      <button className="btn-reset-filters" onClick={handleReset}>
        Reset Filters
      </button>
    </div>
  );
}
