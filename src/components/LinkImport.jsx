import { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { detectPlatform, suggestCategory, extractTrendName } from '../utils/platforms';
import { parseMetricsFromDescription, extractMetricsFromText, formatMetric, parseMetricString, calculateAttentionScore, getPostAge, calculateMomentumFromAge } from '../utils/metrics';
import { isYouTubeConfigured, getYouTubeMetricsFromUrl, extractChannelInfo, getYouTubeChannelFromUrl } from '../utils/youtube';

const MICROLINK_API = 'https://api.microlink.io';
const SCRAPER_API = import.meta.env.VITE_SCRAPER_API || 'http://localhost:3001/api/scrape';

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export default function LinkImport({ categories, onImport, onCancel }) {
  const [postUrl, setPostUrl] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [platform, setPlatform] = useState(null);

  // OCR and manual metrics
  const [scanningOcr, setScanningOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [manualMetrics, setManualMetrics] = useState({
    views: '',
    likes: '',
    comments: '',
    followers: '',
  });
  const [manualPostedAt, setManualPostedAt] = useState('');
  const [customImage, setCustomImage] = useState(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Show manual metrics for platforms without full API support (TikTok, Instagram, etc.)
  // Even if we parsed some metrics from description, let users add/edit
  const showManualMetrics = platform &&
    !['youtube'].includes(platform.platform?.toLowerCase());

  const fetchMetadata = async () => {
    if (!postUrl.trim()) {
      setError('Please enter a post URL');
      return;
    }

    setLoading(true);
    setError('');
    setPreview(null);
    setCustomImage(null);

    try {
      const detected = detectPlatform(postUrl);
      setPlatform(detected);

      // Check if it's a YouTube URL and we have the API configured
      const isYouTube = postUrl.includes('youtube.com') || postUrl.includes('youtu.be');

      if (isYouTube && isYouTubeConfigured()) {
        try {
          const channelInfo = extractChannelInfo(postUrl);

          if (channelInfo) {
            const channelData = await getYouTubeChannelFromUrl(postUrl);
            if (channelData) {
              setPreview({
                title: channelData.title,
                description: channelData.description,
                image: channelData.image,
                url: channelData.url,
                platform: detected,
                metrics: {
                  views: channelData.metrics.views || 0,
                  likes: 0,
                  comments: 0,
                  followers: channelData.metrics.followers || 0,
                },
                channel: channelData.title,
                isChannel: true,
              });
              setLoading(false);
              return;
            }
          } else {
            const ytData = await getYouTubeMetricsFromUrl(postUrl);
            if (ytData && ytData.metrics) {
              setPreview({
                title: ytData.title,
                description: ytData.description,
                image: ytData.image,
                url: ytData.url,
                platform: detected,
                metrics: ytData.metrics,
                channel: ytData.channel,
              });
              setLoading(false);
              return;
            }
          }
        } catch (ytError) {
          console.error('YouTube API error:', ytError);
        }
      }

      // Try local Puppeteer scraper first for Instagram/TikTok
      const isInstagram = postUrl.includes('instagram.com');
      const isTikTok = postUrl.includes('tiktok.com');

      if (isInstagram || isTikTok) {
        try {
          const scraperResponse = await fetch(SCRAPER_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postUrl, profileUrl: profileUrl.trim() || null })
          });

          const scraperResult = await scraperResponse.json();

          if (scraperResult.success) {
            const metrics = scraperResult.metrics;

            setPreview({
              title: scraperResult.title || 'Untitled',
              description: '',
              image: scraperResult.image || '',
              url: postUrl,
              platform: detected,
              metrics: metrics,
              profileUrl: profileUrl.trim() || null,
              postedAt: scraperResult.postedAt,
              channel: scraperResult.creator,
            });

            setManualMetrics({
              views: metrics.views ? formatMetric(metrics.views) : '',
              likes: metrics.likes ? formatMetric(metrics.likes) : '',
              comments: metrics.comments ? formatMetric(metrics.comments) : '',
              followers: metrics.followers ? formatMetric(metrics.followers) : '',
            });

            setLoading(false);
            return;
          }
        } catch (scraperError) {
          console.log('Scraper not available, falling back to Microlink:', scraperError.message);
        }
      }

      // Fallback to Microlink for other platforms or if scraper fails
      const response = await fetch(
        `${MICROLINK_API}?url=${encodeURIComponent(postUrl)}`
      );
      const result = await response.json();

      if (result.status === 'success' && result.data) {
        const data = result.data;

        // Try to parse metrics from description
        const description = data.description || '';
        const parsedMetrics = parseMetricsFromDescription(description);
        const hasMetrics = Object.values(parsedMetrics).some(v => v > 0);

        setPreview({
          title: extractTrendName(data),
          description: description,
          image: data.image?.url || data.logo?.url || '',
          url: data.url || postUrl,
          platform: detected,
          metrics: hasMetrics ? parsedMetrics : null,
          profileUrl: profileUrl.trim() || null,
        });

        // Pre-fill manual metrics if we found any
        if (hasMetrics) {
          setManualMetrics({
            views: parsedMetrics.views ? formatMetric(parsedMetrics.views) : '',
            likes: parsedMetrics.likes ? formatMetric(parsedMetrics.likes) : '',
            comments: parsedMetrics.comments ? formatMetric(parsedMetrics.comments) : '',
            followers: parsedMetrics.followers ? formatMetric(parsedMetrics.followers) : '',
          });
        }
      } else {
        setError(result.message || 'Could not fetch link data');
      }
    } catch (err) {
      setError('Failed to fetch link data. Please try again.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle screenshot upload for OCR
  const handleScreenshotUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setScanningOcr(true);
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      console.log('OCR Text:', text);

      const metrics = extractMetricsFromText(text);
      console.log('Extracted Metrics:', metrics);

      setManualMetrics({
        views: metrics.views ? formatMetric(metrics.views) : '',
        likes: metrics.likes ? formatMetric(metrics.likes) : '',
        comments: metrics.comments ? formatMetric(metrics.comments) : '',
        followers: metrics.followers ? formatMetric(metrics.followers) : '',
      });
    } catch (error) {
      console.error('OCR Error:', error);
      setError('Failed to scan screenshot. Try entering metrics manually.');
    } finally {
      setScanningOcr(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle custom image upload (to replace thumbnail with play button)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleImport = () => {
    if (!preview) return;

    const suggestedCategoryId = suggestCategory(postUrl, categories);

    // Use API metrics, or manual metrics if entered
    let metrics = preview.metrics || null;

    const hasManualMetrics = manualMetrics.views || manualMetrics.likes ||
                             manualMetrics.comments || manualMetrics.followers;

    if (hasManualMetrics) {
      metrics = {
        views: parseMetricString(manualMetrics.views) || 0,
        likes: parseMetricString(manualMetrics.likes) || 0,
        comments: parseMetricString(manualMetrics.comments) || 0,
        followers: parseMetricString(manualMetrics.followers) || 0,
      };
    } else if (!metrics) {
      const parsedMetrics = parseMetricsFromDescription(preview.description);
      metrics = Object.keys(parsedMetrics).length > 0 ? parsedMetrics : null;
    }

    // Use manual date if provided, otherwise use scraped date
    const finalPostedAt = manualPostedAt || preview.postedAt || null;

    // Calculate momentum from post age
    const momentum = finalPostedAt
      ? calculateMomentumFromAge(finalPostedAt, metrics)
      : null;

    onImport({
      name: preview.title,
      image: customImage || preview.image,
      sourceUrl: preview.url,
      profileUrl: profileUrl.trim() || null,
      platform: platform?.platform || null,
      suggestedCategory: suggestedCategoryId,
      metrics,
      postedAt: finalPostedAt,
      calculatedMomentum: momentum,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchMetadata();
    }
  };

  // Calculate attention score from manual metrics
  const calculatedScore = manualMetrics.views || manualMetrics.likes || manualMetrics.followers
    ? calculateAttentionScore({
        views: parseMetricString(manualMetrics.views) || 0,
        likes: parseMetricString(manualMetrics.likes) || 0,
        comments: parseMetricString(manualMetrics.comments) || 0,
        followers: parseMetricString(manualMetrics.followers) || 0,
      })
    : null;

  return (
    <div className="link-import">
      <div className="link-import-header">
        <h3>Import from Link</h3>
        <button type="button" className="btn-back-small" onClick={onCancel}>
          ← Back
        </button>
      </div>

      <div className="import-url-section">
        <div className="import-url-field">
          <label>Post URL <span className="required">*</span></label>
          <div className="import-url-input">
            <input
              type="url"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste TikTok/Instagram post or reel URL..."
              disabled={loading}
            />
          </div>
          <span className="field-hint">For likes, comments, shares, saves</span>
        </div>

        <div className="import-url-field">
          <label>Profile URL <span className="optional">(optional)</span></label>
          <div className="import-url-input">
            <input
              type="url"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="Paste creator's profile URL..."
              disabled={loading}
            />
          </div>
          <span className="field-hint">For follower count</span>
        </div>

        <div className="mcp-scan-note">
          🤖 <strong>Auto-scrape:</strong> Clicks "Fetch Metadata" to automatically pull metrics from Instagram/TikTok
        </div>

        <button
          type="button"
          onClick={fetchMetadata}
          disabled={loading || !postUrl.trim()}
          className="btn-fetch"
        >
          {loading ? 'Fetching...' : 'Fetch Metadata'}
        </button>
      </div>

      {error && <div className="import-error">{error}</div>}

      {preview && (
        <div className="import-preview">
          {platform && (
            <div className="import-platform">
              <span className="platform-icon">{platform.icon}</span>
              <span className="platform-name">{platform.name}</span>
              {preview.isChannel && <span className="platform-type">Creator Profile</span>}
            </div>
          )}

          {/* Image with option to replace */}
          <div className="import-image-section">
            {(customImage || preview.image) && (
              <div className="import-image">
                <img src={customImage || preview.image} alt={preview.title} />
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn-change-image-small"
              onClick={() => imageInputRef.current?.click()}
            >
              {customImage ? 'Change Image' : 'Replace Image'}
            </button>
          </div>

          <div className="import-details">
            <div className="import-title">{preview.title}</div>
            {preview.channel && (
              <div className="import-channel">{preview.channel}</div>
            )}
            {preview.postedAt && (() => {
              const { ageText, decayLevel } = getPostAge(preview.postedAt);
              const momentum = calculateMomentumFromAge(preview.postedAt, preview.metrics);
              return (
                <div className={`import-posted-date decay-${decayLevel}`}>
                  <span className="posted-label">Posted:</span>
                  <span className="posted-value">{ageText}</span>
                  <span className={`momentum-badge ${momentum >= 0 ? 'positive' : 'negative'}`}>
                    {momentum >= 0 ? '+' : ''}{momentum}%
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Show API metrics if available (only for YouTube which has full API) */}
          {preview.metrics && platform?.platform?.toLowerCase() === 'youtube' && (
            <div className="import-metrics">
              {preview.metrics.followers > 0 && (
                <div className="import-metric">
                  <span className="metric-value">{formatNumber(preview.metrics.followers)}</span>
                  <span className="metric-label">subscribers</span>
                </div>
              )}
              {preview.metrics.views > 0 && (
                <div className="import-metric">
                  <span className="metric-value">{formatNumber(preview.metrics.views)}</span>
                  <span className="metric-label">{preview.isChannel ? 'total views' : 'views'}</span>
                </div>
              )}
              {preview.metrics.likes > 0 && (
                <div className="import-metric">
                  <span className="metric-value">{formatNumber(preview.metrics.likes)}</span>
                  <span className="metric-label">likes</span>
                </div>
              )}
              {preview.metrics.comments > 0 && (
                <div className="import-metric">
                  <span className="metric-value">{formatNumber(preview.metrics.comments)}</span>
                  <span className="metric-label">comments</span>
                </div>
              )}
            </div>
          )}

          {/* Manual metrics section for platforms without full API */}
          {showManualMetrics && (
            <div className="manual-metrics-section">
              <div className="manual-metrics-header">
                <span>{preview?.metrics ? 'Edit Metrics' : 'Add Metrics'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn-scan"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={scanningOcr}
                >
                  {scanningOcr ? `Scanning ${ocrProgress}%` : '📷 Scan Screenshot'}
                </button>
              </div>

              <div className="metrics-grid-small">
                <div className="metric-input-small">
                  <label>Views</label>
                  <input
                    type="text"
                    value={manualMetrics.views}
                    onChange={(e) => setManualMetrics({ ...manualMetrics, views: e.target.value })}
                    placeholder="1.2M"
                  />
                </div>
                <div className="metric-input-small">
                  <label>Likes</label>
                  <input
                    type="text"
                    value={manualMetrics.likes}
                    onChange={(e) => setManualMetrics({ ...manualMetrics, likes: e.target.value })}
                    placeholder="50K"
                  />
                </div>
                <div className="metric-input-small">
                  <label>Comments</label>
                  <input
                    type="text"
                    value={manualMetrics.comments}
                    onChange={(e) => setManualMetrics({ ...manualMetrics, comments: e.target.value })}
                    placeholder="1.2K"
                  />
                </div>
                <div className="metric-input-small">
                  <label>Followers</label>
                  <input
                    type="text"
                    value={manualMetrics.followers}
                    onChange={(e) => setManualMetrics({ ...manualMetrics, followers: e.target.value })}
                    placeholder="500K"
                  />
                </div>
              </div>

              <div className="metric-input-small date-input">
                <label>Date Posted {!preview?.postedAt && <span className="optional">(optional)</span>}</label>
                <input
                  type="date"
                  value={manualPostedAt || (preview?.postedAt ? preview.postedAt.split('T')[0] : '')}
                  onChange={(e) => setManualPostedAt(e.target.value)}
                />
              </div>

              {calculatedScore && (
                <div className="calculated-score-small">
                  Attention Score: <strong>{calculatedScore}</strong>
                </div>
              )}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-primary" onClick={handleImport}>
              Continue
            </button>
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!preview && !loading && (
        <div className="import-help">
          <p>Supported platforms:</p>
          <div className="platform-list">
            <span>📱 TikTok</span>
            <span>📸 Instagram</span>
            <span>🎵 Spotify</span>
            <span>▶️ YouTube</span>
            <span>𝕏 X/Twitter</span>
          </div>
          <p className="import-tip">
            All platforms auto-pull metrics. Make sure the scraper server is running (npm start in /server).
          </p>
        </div>
      )}
    </div>
  );
}
