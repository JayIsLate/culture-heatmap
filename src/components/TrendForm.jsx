import { useState, useEffect, useRef } from 'react';
import { generateId } from '../utils/storage';
import { getPreviousWeekTrend, calculateChange } from '../utils/history';
import { calculateAttentionScore, formatMetric, getPostAge } from '../utils/metrics';

export default function TrendForm({
  trend,
  categories,
  onSave,
  onCancel,
  onDelete,
  importedData = null,
}) {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    category: categories[0]?.id || '',
    size: 50,
    change: 0,
    image: '',
    imagePosition: 'center center',
    sourceUrl: '',
    notes: '',
    postedAt: null,
  });
  const [metrics, setMetrics] = useState({
    views: '',
    likes: '',
    comments: '',
    followers: '',
  });
  const [previousWeek, setPreviousWeek] = useState(null);
  const [autoCalculate, setAutoCalculate] = useState(false);
  const [autoSize, setAutoSize] = useState(false);

  // Function to calculate size and momentum from metrics
  const calculateFromMetrics = (metricsInput) => {
    const metricsObj = {
      views: Number(metricsInput.views) || 0,
      likes: Number(metricsInput.likes) || 0,
      comments: Number(metricsInput.comments) || 0,
      followers: Number(metricsInput.followers) || 0,
    };

    const hasMetrics = metricsObj.views > 0 || metricsObj.likes > 0 || metricsObj.followers > 0;
    if (!hasMetrics) return null;

    const calculatedSize = calculateAttentionScore(metricsObj);

    // Calculate "momentum" based on performance vs audience
    let calculatedChange = 0;

    if (metricsObj.followers > 0) {
      if (metricsObj.views > 0) {
        // REELS/VIDEOS: views vs followers
        // views > followers = viral (positive)
        // views < followers = underperforming (negative)
        const viralityRatio = metricsObj.views / metricsObj.followers;
        calculatedChange = Math.round((viralityRatio - 1) * 100);
        // Cap at reasonable range
        calculatedChange = Math.max(-90, Math.min(900, calculatedChange));
      } else if (metricsObj.likes > 0) {
        // IMAGE POSTS (no views): likes vs followers
        // Good engagement is ~3-10% of followers liking
        // likes/followers > 0.05 (5%) = doing well (positive)
        // likes/followers < 0.02 (2%) = underperforming (negative)
        const likeRatio = metricsObj.likes / metricsObj.followers;
        // Scale: 3% = 0, 10% = +100, 1% = -50
        calculatedChange = Math.round((likeRatio - 0.03) * 2000);
        calculatedChange = Math.max(-90, Math.min(500, calculatedChange));
      }
    } else if (metricsObj.views > 0 && metricsObj.likes > 0) {
      // No follower data - use engagement rate
      const engagementRate = (metricsObj.likes / metricsObj.views) * 100;
      // Good engagement is 3-10%, 5% = baseline
      calculatedChange = Math.round((engagementRate - 5) * 15);
      calculatedChange = Math.max(-90, Math.min(300, calculatedChange));
    }

    console.log('Calculated:', { size: calculatedSize, change: calculatedChange, metrics: metricsObj });
    return { size: calculatedSize, change: calculatedChange };
  };

  // Handle metric input change - recalculate immediately
  const handleMetricChange = (field, value) => {
    const newMetrics = { ...metrics, [field]: value };
    setMetrics(newMetrics);

    const calculated = calculateFromMetrics(newMetrics);
    if (calculated) {
      setFormData((prev) => ({
        ...prev,
        size: calculated.size,
        change: calculated.change,
      }));
      setAutoSize(true);
    }
  };

  // Initialize from trend, importedData, or defaults
  useEffect(() => {
    if (trend) {
      setFormData({
        name: trend.name,
        category: trend.category,
        size: trend.size,
        change: trend.change,
        image: trend.image || '',
        imagePosition: trend.imagePosition || 'center center',
        sourceUrl: trend.sourceUrl || '',
        notes: trend.notes || '',
        postedAt: trend.postedAt || null,
      });
      if (trend.metrics) {
        setMetrics({
          views: trend.metrics.views || '',
          likes: trend.metrics.likes || '',
          comments: trend.metrics.comments || '',
          followers: trend.metrics.followers || '',
        });
      }
      const prevData = getPreviousWeekTrend(trend.name);
      setPreviousWeek(prevData);
    } else if (importedData) {
      const importedMetrics = importedData.metrics ? {
        views: importedData.metrics.views || '',
        likes: importedData.metrics.likes || '',
        comments: importedData.metrics.comments || '',
        followers: importedData.metrics.followers || '',
      } : { views: '', likes: '', comments: '', followers: '' };

      setMetrics(importedMetrics);

      // Calculate size/change from metrics if available
      const calculated = calculateFromMetrics(importedMetrics);

      // Use time-decay momentum if available, otherwise use calculated
      const momentum = importedData.calculatedMomentum !== null && importedData.calculatedMomentum !== undefined
        ? importedData.calculatedMomentum
        : (calculated?.change || 0);

      setFormData({
        name: importedData.name || '',
        category: importedData.suggestedCategory || categories[0]?.id || '',
        size: calculated?.size || 50,
        change: momentum,
        image: importedData.image || '',
        imagePosition: 'center center',
        sourceUrl: importedData.sourceUrl || '',
        notes: '',
        postedAt: importedData.postedAt || null,
      });

      if (calculated) {
        setAutoSize(true);
      }
    }
  }, [trend, importedData, categories]);

  // Auto-calculate change when size changes and we have previous data
  useEffect(() => {
    if (autoCalculate && previousWeek && formData.size) {
      const calculatedChange = calculateChange(formData.size, previousWeek.size);
      setFormData((prev) => ({
        ...prev,
        change: Math.round(calculatedChange * 10) / 10,
      }));
    }
  }, [formData.size, previousWeek, autoCalculate]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const metricsObj = {
      views: Number(metrics.views) || 0,
      likes: Number(metrics.likes) || 0,
      comments: Number(metrics.comments) || 0,
      followers: Number(metrics.followers) || 0,
    };
    // Only include metrics if at least one value is set
    const hasMetrics = Object.values(metricsObj).some((v) => v > 0);

    onSave({
      id: trend?.id || generateId(),
      name: formData.name,
      category: formData.category,
      size: Number(formData.size),
      change: Number(formData.change),
      image: formData.image,
      imagePosition: formData.imagePosition,
      sourceUrl: formData.sourceUrl,
      notes: formData.notes,
      metrics: hasMetrics ? metricsObj : null,
      postedAt: formData.postedAt,
    });
  };

  const handleAutoCalculateToggle = () => {
    setAutoCalculate(!autoCalculate);
    if (!autoCalculate && previousWeek) {
      const calculatedChange = calculateChange(formData.size, previousWeek.size);
      setFormData((prev) => ({
        ...prev,
        change: Math.round(calculatedChange * 10) / 10,
      }));
    }
  };

  // Research links
  const searchName = formData.name || trend?.name || '';
  const searchLinks = searchName ? [
    { label: 'Google', url: `https://www.google.com/search?q=${encodeURIComponent(searchName + ' trend 2024')}` },
    { label: 'TikTok', url: `https://www.tiktok.com/search?q=${encodeURIComponent(searchName)}` },
    { label: 'Instagram', url: `https://www.instagram.com/explore/tags/${encodeURIComponent(searchName.toLowerCase().replace(/\s+/g, ''))}` },
    { label: 'X/Twitter', url: `https://twitter.com/search?q=${encodeURIComponent(searchName)}` },
    { label: 'Google Trends', url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(searchName)}` },
  ] : [];

  return (
    <form onSubmit={handleSubmit} className="trend-form">
      <h3>{trend ? 'Edit Trend' : 'Add Trend'}</h3>

      {/* Research links - only show when editing */}
      {trend && searchName && (
        <div className="research-links">
          <label>Research</label>
          <div className="link-buttons">
            {searchLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="research-btn"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Brat Summer"
          required
        />
      </div>

      <div className="form-group">
        <label>Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Previous week indicator */}
      {previousWeek && (
        <div className="previous-week-info">
          <span className="prev-label">Last week:</span>
          <span className="prev-size">Size {previousWeek.size}</span>
          <span className={`prev-change ${previousWeek.change >= 0 ? 'positive' : 'negative'}`}>
            {previousWeek.change >= 0 ? '+' : ''}{previousWeek.change}%
          </span>
        </div>
      )}

      {/* Posted date with time decay */}
      {formData.postedAt && (() => {
        const { ageText, decayLevel } = getPostAge(formData.postedAt);
        return (
          <div className={`posted-date-info decay-${decayLevel}`}>
            <span className="posted-label">Posted:</span>
            <span className="posted-value">{ageText}</span>
            <span className="decay-indicator">
              {decayLevel === 'hot' && '🔥 Fresh'}
              {decayLevel === 'warm' && '✨ Recent'}
              {decayLevel === 'cooling' && '📉 Cooling'}
              {decayLevel === 'cold' && '❄️ Cold'}
              {decayLevel === 'stale' && '💀 Stale'}
            </span>
          </div>
        );
      })()}

      {/* Metrics Section */}
      <div className="metrics-section">
        <div className="metrics-header">
          <label>Metrics</label>
          <button
            type="button"
            className={`btn-auto-calc ${autoSize ? 'active' : ''}`}
            onClick={() => setAutoSize(!autoSize)}
            title="Auto-calculate size from metrics"
          >
            Auto Size
          </button>
        </div>
        <div className="metrics-grid">
          <div className="metric-input">
            <label>Views</label>
            <input
              type="number"
              value={metrics.views}
              onChange={(e) => handleMetricChange('views', e.target.value)}
              placeholder="600000"
            />
          </div>
          <div className="metric-input">
            <label>Followers</label>
            <input
              type="number"
              value={metrics.followers}
              onChange={(e) => handleMetricChange('followers', e.target.value)}
              placeholder="123000"
            />
          </div>
          <div className="metric-input">
            <label>Likes</label>
            <input
              type="number"
              value={metrics.likes}
              onChange={(e) => handleMetricChange('likes', e.target.value)}
              placeholder="20000"
            />
          </div>
          <div className="metric-input">
            <label>Comments</label>
            <input
              type="number"
              value={metrics.comments}
              onChange={(e) => handleMetricChange('comments', e.target.value)}
              placeholder="380"
            />
          </div>
        </div>
        {autoSize && (
          <div className="auto-size-preview">
            Calculated attention: <strong>{formData.size}</strong>
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>
            Size (1-100)
            {autoSize && <span className="auto-badge">Auto</span>}
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            disabled={autoSize}
          />
        </div>

        <div className="form-group">
          <label>
            Momentum %
            {autoSize && <span className="auto-badge">Auto</span>}
            {!autoSize && previousWeek && (
              <button
                type="button"
                className={`btn-auto-calc ${autoCalculate ? 'active' : ''}`}
                onClick={handleAutoCalculateToggle}
                title="Auto-calculate from last week's size"
              >
                Auto
              </button>
            )}
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.change}
            onChange={(e) => setFormData({ ...formData, change: e.target.value })}
            disabled={autoCalculate || autoSize}
          />
          {autoSize && formData.change !== 0 && (
            <span className="change-hint">
              {formData.change > 0 ? '↑' : '↓'} views vs followers
            </span>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Notes / Context Links</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Add links to related posts, reels, or additional context..."
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Image</label>
        {formData.image ? (
          <div className="image-preview-section">
            <div className="image-preview" style={{ overflow: 'hidden' }}>
              <img
                src={formData.image}
                alt="Trend"
                style={{ objectPosition: formData.imagePosition }}
              />
              <button type="button" className="remove-image" onClick={handleRemoveImage}>
                ×
              </button>
            </div>
            <div className="image-position-controls">
              <label>Image Position</label>
              <div className="position-grid">
                {[
                  { value: 'left top', label: '↖' },
                  { value: 'center top', label: '↑' },
                  { value: 'right top', label: '↗' },
                  { value: 'left center', label: '←' },
                  { value: 'center center', label: '●' },
                  { value: 'right center', label: '→' },
                  { value: 'left bottom', label: '↙' },
                  { value: 'center bottom', label: '↓' },
                  { value: 'right bottom', label: '↘' },
                ].map((pos) => (
                  <button
                    key={pos.value}
                    type="button"
                    className={`position-btn ${formData.imagePosition === pos.value ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, imagePosition: pos.value })}
                    title={pos.value}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="image-upload">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              id="image-upload"
            />
            <label htmlFor="image-upload" className="upload-btn">
              Upload
            </label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="or paste URL"
            />
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {trend ? 'Save' : 'Add'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        {trend && onDelete && (
          <button
            type="button"
            className="btn-danger"
            onClick={() => onDelete(trend.id)}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
