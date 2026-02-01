import { useState } from 'react';

export default function TrendSearch({ trend, onClose }) {
  const [loading, setLoading] = useState(false);

  const searchLinks = [
    {
      label: 'Google',
      url: `https://www.google.com/search?q=${encodeURIComponent(trend.name + ' trend')}`,
    },
    {
      label: 'TikTok',
      url: `https://www.tiktok.com/search?q=${encodeURIComponent(trend.name)}`,
    },
    {
      label: 'Instagram',
      url: `https://www.instagram.com/explore/tags/${encodeURIComponent(trend.name.toLowerCase().replace(/\s+/g, ''))}`,
    },
    {
      label: 'Twitter/X',
      url: `https://twitter.com/search?q=${encodeURIComponent(trend.name)}&src=typed_query`,
    },
    {
      label: 'YouTube',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(trend.name)}`,
    },
    {
      label: 'Google Trends',
      url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(trend.name)}`,
    },
  ];

  return (
    <div className="trend-search">
      <div className="trend-search-header">
        <h4>Research: {trend.name}</h4>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <p className="trend-search-hint">Open links to research this trend:</p>

      <div className="search-links">
        {searchLinks.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="search-link"
          >
            {link.label}
            <span className="arrow">↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}
