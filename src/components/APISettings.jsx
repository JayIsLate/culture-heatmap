import { useState, useEffect } from 'react';
import { getSpotifyCredentials, saveSpotifyCredentials, isSpotifyConfigured } from '../utils/spotify';
import { getYouTubeKey, saveYouTubeKey, isYouTubeConfigured } from '../utils/youtube';
import { getLastFmKey, saveLastFmKey, isLastFmConfigured } from '../utils/lastfm';
import { getTikTokKey, saveTikTokKey, isTikTokConfigured } from '../utils/tiktok';
import { getInstagramKey, saveInstagramKey, isInstagramConfigured } from '../utils/instagram';

export default function APISettings({ onClose, onSave }) {
  const [spotify, setSpotify] = useState({ clientId: '', clientSecret: '' });
  const [youtube, setYouTube] = useState('');
  const [lastfm, setLastFm] = useState('');
  const [tiktok, setTikTok] = useState({ apiKey: '', host: 'tiktok-api23.p.rapidapi.com' });
  const [instagram, setInstagram] = useState({ apiKey: '', host: 'instagram-scraper-api2.p.rapidapi.com' });
  const [activeTab, setActiveTab] = useState('lastfm');

  // Load existing credentials
  useEffect(() => {
    const spotifyCreds = getSpotifyCredentials();
    if (spotifyCreds) {
      setSpotify({
        clientId: spotifyCreds.clientId || '',
        clientSecret: spotifyCreds.clientSecret || '',
      });
    }

    setYouTube(getYouTubeKey() || '');
    setLastFm(getLastFmKey() || '');

    const tiktokCreds = getTikTokKey();
    if (tiktokCreds) {
      setTikTok({
        apiKey: tiktokCreds.apiKey || '',
        host: tiktokCreds.host || 'tiktok-api23.p.rapidapi.com',
      });
    }

    const instagramCreds = getInstagramKey();
    if (instagramCreds) {
      setInstagram({
        apiKey: instagramCreds.apiKey || '',
        host: instagramCreds.host || 'instagram-scraper-api2.p.rapidapi.com',
      });
    }
  }, []);

  const handleSave = () => {
    // Save all credentials
    if (spotify.clientId || spotify.clientSecret) {
      saveSpotifyCredentials(spotify);
    }

    if (youtube) {
      saveYouTubeKey(youtube);
    }

    if (lastfm) {
      saveLastFmKey(lastfm);
    }

    if (tiktok.apiKey) {
      saveTikTokKey(tiktok.apiKey, tiktok.host);
    }

    if (instagram.apiKey) {
      saveInstagramKey(instagram.apiKey, instagram.host);
    }

    onSave?.();
    onClose();
  };

  const tabs = [
    { id: 'lastfm', label: '🎸 Last.fm', configured: isLastFmConfigured(), free: true },
    { id: 'youtube', label: '▶️ YouTube', configured: isYouTubeConfigured(), free: true },
    { id: 'spotify', label: '🎵 Spotify', configured: isSpotifyConfigured(), free: true },
    { id: 'tiktok', label: '📱 TikTok', configured: isTikTokConfigured(), free: false },
    { id: 'instagram', label: '📸 Instagram', configured: isInstagramConfigured(), free: false },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="api-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="api-settings-header">
          <h2>API Settings</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="api-settings-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`api-tab ${activeTab === tab.id ? 'active' : ''} ${tab.configured ? 'configured' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.configured && <span className="configured-badge">✓</span>}
              {!tab.free && <span className="paid-badge">$</span>}
            </button>
          ))}
        </div>

        <div className="api-settings-content">
          {activeTab === 'lastfm' && (
            <div className="api-section">
              <h3>Last.fm API (Free)</h3>
              <p className="api-description">
                Discover up-and-coming artists and trending music. Shows "hyped" artists gaining listeners fast.
              </p>
              <ol className="api-steps">
                <li>Go to <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener noreferrer">Last.fm API Account</a></li>
                <li>Create an account or log in</li>
                <li>Fill in app name (anything) and description</li>
                <li>Copy your <strong>API Key</strong></li>
              </ol>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="text"
                  value={lastfm}
                  onChange={(e) => setLastFm(e.target.value)}
                  placeholder="Enter Last.fm API Key"
                />
              </div>
            </div>
          )}

          {activeTab === 'spotify' && (
            <div className="api-section">
              <h3>Spotify API (Free)</h3>
              <p className="api-description">
                Get viral charts, trending music, and new releases.
              </p>
              <ol className="api-steps">
                <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">Spotify Developer Dashboard</a></li>
                <li>Create a new app (any name)</li>
                <li>Copy the Client ID and Client Secret</li>
              </ol>
              <div className="form-group">
                <label>Client ID</label>
                <input
                  type="text"
                  value={spotify.clientId}
                  onChange={(e) => setSpotify({ ...spotify, clientId: e.target.value })}
                  placeholder="Enter Client ID"
                />
              </div>
              <div className="form-group">
                <label>Client Secret</label>
                <input
                  type="password"
                  value={spotify.clientSecret}
                  onChange={(e) => setSpotify({ ...spotify, clientSecret: e.target.value })}
                  placeholder="Enter Client Secret"
                />
              </div>
            </div>
          )}

          {activeTab === 'youtube' && (
            <div className="api-section">
              <h3>YouTube Data API (Free)</h3>
              <p className="api-description">
                Get trending videos and music charts. Free with daily quota limits.
              </p>
              <ol className="api-steps">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                <li>Create a project and enable YouTube Data API v3</li>
                <li>Create an API key (restrict to YouTube Data API)</li>
              </ol>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={youtube}
                  onChange={(e) => setYouTube(e.target.value)}
                  placeholder="Enter YouTube API Key"
                />
              </div>
            </div>
          )}

          {activeTab === 'tiktok' && (
            <div className="api-section">
              <h3>TikTok API (RapidAPI - ~$15/mo)</h3>
              <p className="api-description">
                Get trending sounds, hashtags, and video metrics. Requires RapidAPI subscription.
              </p>
              <ol className="api-steps">
                <li>Go to <a href="https://rapidapi.com/search/tiktok" target="_blank" rel="noopener noreferrer">RapidAPI TikTok APIs</a></li>
                <li>Subscribe to a TikTok API (e.g., "TikTok API" or "TikTok Data")</li>
                <li>Copy your RapidAPI key and the API host</li>
              </ol>
              <div className="form-group">
                <label>RapidAPI Key</label>
                <input
                  type="password"
                  value={tiktok.apiKey}
                  onChange={(e) => setTikTok({ ...tiktok, apiKey: e.target.value })}
                  placeholder="Enter RapidAPI Key"
                />
              </div>
              <div className="form-group">
                <label>API Host</label>
                <input
                  type="text"
                  value={tiktok.host}
                  onChange={(e) => setTikTok({ ...tiktok, host: e.target.value })}
                  placeholder="e.g., tiktok-api23.p.rapidapi.com"
                />
              </div>
            </div>
          )}

          {activeTab === 'instagram' && (
            <div className="api-section">
              <h3>Instagram API (RapidAPI - ~$15/mo)</h3>
              <p className="api-description">
                Get trending reels, hashtags, and post metrics. Requires RapidAPI subscription.
              </p>
              <ol className="api-steps">
                <li>Go to <a href="https://rapidapi.com/search/instagram" target="_blank" rel="noopener noreferrer">RapidAPI Instagram APIs</a></li>
                <li>Subscribe to an Instagram API (e.g., "Instagram Scraper")</li>
                <li>Copy your RapidAPI key and the API host</li>
              </ol>
              <div className="form-group">
                <label>RapidAPI Key</label>
                <input
                  type="password"
                  value={instagram.apiKey}
                  onChange={(e) => setInstagram({ ...instagram, apiKey: e.target.value })}
                  placeholder="Enter RapidAPI Key"
                />
              </div>
              <div className="form-group">
                <label>API Host</label>
                <input
                  type="text"
                  value={instagram.host}
                  onChange={(e) => setInstagram({ ...instagram, host: e.target.value })}
                  placeholder="e.g., instagram-scraper-api2.p.rapidapi.com"
                />
              </div>
            </div>
          )}
        </div>

        <div className="api-settings-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
