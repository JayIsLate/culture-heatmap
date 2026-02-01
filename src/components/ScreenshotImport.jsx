import { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import {
  extractMetricsFromText,
  calculateEngagementScore,
  formatMetric,
  parseMetricString,
} from '../utils/metrics';
import { detectPlatform, suggestCategory } from '../utils/platforms';

export default function ScreenshotImport({ categories, onImport, onCancel }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedMetrics, setExtractedMetrics] = useState(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    platform: '',
    url: '',
    likes: '',
    comments: '',
    shares: '',
    saves: '',
    views: '',
    followers: '',
  });
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setExtractedMetrics(null);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
        setExtractedMetrics(null);
        break;
      }
    }
  };

  const runOCR = async () => {
    if (!image) return;

    setLoading(true);
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(image, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      console.log('OCR Text:', text);

      // Extract metrics from OCR text
      const metrics = extractMetricsFromText(text);
      console.log('Extracted Metrics:', metrics);

      // Detect platform from any URL in the text
      const urlMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]+)/);
      const detectedPlatform = urlMatch ? detectPlatform(`https://${urlMatch[1]}`) : null;

      setExtractedMetrics(metrics);
      setFormData((prev) => ({
        ...prev,
        platform: detectedPlatform?.platform || prev.platform,
        likes: metrics.likes ? formatMetric(metrics.likes) : '',
        comments: metrics.comments ? formatMetric(metrics.comments) : '',
        shares: metrics.shares ? formatMetric(metrics.shares) : '',
        saves: metrics.saves ? formatMetric(metrics.saves) : '',
        views: metrics.views ? formatMetric(metrics.views) : '',
        followers: metrics.followers ? formatMetric(metrics.followers) : '',
      }));
    } catch (error) {
      console.error('OCR Error:', error);
      setManualEntry(true);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    const metrics = {
      likes: parseMetricString(formData.likes),
      comments: parseMetricString(formData.comments),
      shares: parseMetricString(formData.shares),
      saves: parseMetricString(formData.saves),
      views: parseMetricString(formData.views),
      followers: parseMetricString(formData.followers),
    };

    const platform = formData.platform || 'unknown';
    const engagementScore = calculateEngagementScore(metrics, platform);
    const suggestedCategoryId = suggestCategory(formData.url || `https://${platform}.com`, categories);

    onImport({
      name: formData.name,
      image: imagePreview,
      sourceUrl: formData.url,
      platform,
      metrics,
      size: engagementScore,
      change: 0, // Will be calculated from historical data
      suggestedCategory: suggestedCategoryId,
    });
  };

  const platforms = [
    { id: 'tiktok', label: 'TikTok' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'twitter', label: 'X/Twitter' },
    { id: 'spotify', label: 'Spotify' },
    { id: 'threads', label: 'Threads' },
    { id: 'other', label: 'Other' },
  ];

  const hasMetrics = formData.likes || formData.comments || formData.shares || formData.saves || formData.views || formData.followers;
  const calculatedSize = hasMetrics
    ? calculateEngagementScore(
        {
          likes: parseMetricString(formData.likes),
          comments: parseMetricString(formData.comments),
          shares: parseMetricString(formData.shares),
          saves: parseMetricString(formData.saves),
          views: parseMetricString(formData.views),
        },
        formData.platform || 'unknown'
      )
    : 0;

  return (
    <div className="screenshot-import" onPaste={handlePaste}>
      <div className="screenshot-import-header">
        <h3>Import from Screenshot</h3>
        <button type="button" className="btn-back-small" onClick={onCancel}>
          ← Back
        </button>
      </div>

      {!imagePreview ? (
        <div className="screenshot-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">📸</div>
            <div className="upload-text">
              Click to upload or paste screenshot
            </div>
            <div className="upload-hint">
              Screenshot should show visible metrics (likes, comments, etc.)
            </div>
          </div>
        </div>
      ) : (
        <div className="screenshot-preview">
          <img src={imagePreview} alt="Screenshot" />
          <button
            className="btn-change-image"
            onClick={() => {
              setImagePreview('');
              setImage(null);
              setExtractedMetrics(null);
            }}
          >
            Change
          </button>
        </div>
      )}

      {imagePreview && !extractedMetrics && !manualEntry && (
        <div className="ocr-section">
          <button
            className="btn-primary btn-extract"
            onClick={runOCR}
            disabled={loading}
          >
            {loading ? `Extracting... ${ocrProgress}%` : 'Extract Metrics'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => setManualEntry(true)}
          >
            Enter Manually
          </button>
        </div>
      )}

      {(extractedMetrics || manualEntry) && (
        <div className="metrics-form">
          <div className="form-group">
            <label>Trend Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Not Very Chinese of You"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Platform</label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              >
                <option value="">Select...</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>URL (optional)</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="metrics-grid">
            <div className="form-group">
              <label>Likes</label>
              <input
                type="text"
                value={formData.likes}
                onChange={(e) => setFormData({ ...formData, likes: e.target.value })}
                placeholder="747K"
              />
            </div>
            <div className="form-group">
              <label>Comments</label>
              <input
                type="text"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="16.4K"
              />
            </div>
            <div className="form-group">
              <label>Shares</label>
              <input
                type="text"
                value={formData.shares}
                onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
                placeholder="5K"
              />
            </div>
            <div className="form-group">
              <label>Saves</label>
              <input
                type="text"
                value={formData.saves}
                onChange={(e) => setFormData({ ...formData, saves: e.target.value })}
                placeholder="51.8K"
              />
            </div>
            <div className="form-group">
              <label>Views</label>
              <input
                type="text"
                value={formData.views}
                onChange={(e) => setFormData({ ...formData, views: e.target.value })}
                placeholder="2.5M"
              />
            </div>
            <div className="form-group">
              <label>Followers</label>
              <input
                type="text"
                value={formData.followers}
                onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
                placeholder="1.2M"
              />
            </div>
          </div>

          {hasMetrics && (
            <div className="calculated-score">
              <span className="score-label">Calculated Attention Score:</span>
              <span className="score-value">{calculatedSize}</span>
              <span className="score-hint">(1-100 scale based on engagement)</span>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleImport}
              disabled={!formData.name || !hasMetrics}
            >
              Add Trend
            </button>
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="import-tips">
        <h4>Tips for best results:</h4>
        <ul>
          <li>Screenshot should clearly show the metrics (likes, comments, etc.)</li>
          <li>For TikTok, expand the video to show all engagement numbers</li>
          <li>If OCR misses some numbers, you can edit them manually</li>
        </ul>
      </div>
    </div>
  );
}
