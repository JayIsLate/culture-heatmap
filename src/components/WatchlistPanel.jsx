import { useState } from 'react';
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  clearWatchlist,
} from '../utils/watchlist';

export default function WatchlistPanel({ onWatchlistChange, matchResults = [] }) {
  const [watchlist, setWatchlist] = useState(getWatchlist());
  const [newKeyword, setNewKeyword] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    const updated = addToWatchlist(newKeyword.trim());
    setWatchlist(updated);
    setNewKeyword('');
    onWatchlistChange?.(updated);
  };

  const handleRemove = (id) => {
    const updated = removeFromWatchlist(id);
    setWatchlist(updated);
    onWatchlistChange?.(updated);
  };

  const handleClear = () => {
    if (confirm('Clear all watchlist keywords?')) {
      const updated = clearWatchlist();
      setWatchlist(updated);
      onWatchlistChange?.(updated);
    }
  };

  // Find match count for each keyword
  const getMatchCount = (keywordId) => {
    const match = matchResults.find((m) => m.keyword.id === keywordId);
    return match?.matchCount || 0;
  };

  const getSources = (keywordId) => {
    const match = matchResults.find((m) => m.keyword.id === keywordId);
    return match?.sources || [];
  };

  return (
    <div className="watchlist-panel">
      <div
        className="watchlist-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="watchlist-title">
          <span className="watchlist-icon">👁️</span>
          <span>Watchlist</span>
          {watchlist.keywords.length > 0 && (
            <span className="watchlist-count">{watchlist.keywords.length}</span>
          )}
        </div>
        <button className="btn-expand">{isExpanded ? '−' : '+'}</button>
      </div>

      {isExpanded && (
        <div className="watchlist-content">
          <form onSubmit={handleAdd} className="watchlist-form">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Add keyword to track..."
            />
            <button type="submit" disabled={!newKeyword.trim()}>
              Add
            </button>
          </form>

          {watchlist.keywords.length > 0 ? (
            <>
              <div className="watchlist-keywords">
                {watchlist.keywords.map((kw) => {
                  const matchCount = getMatchCount(kw.id);
                  const sources = getSources(kw.id);

                  return (
                    <div
                      key={kw.id}
                      className={`watchlist-keyword ${matchCount > 0 ? 'has-matches' : ''}`}
                    >
                      <div className="keyword-info">
                        <span className="keyword-term">{kw.displayTerm}</span>
                        {matchCount > 0 && (
                          <span className="keyword-matches">
                            {matchCount} match{matchCount !== 1 && 'es'}
                          </span>
                        )}
                        {sources.length > 0 && (
                          <span className="keyword-sources">
                            {sources.map((s) => getSourceIcon(s)).join(' ')}
                          </span>
                        )}
                      </div>
                      <button
                        className="btn-remove-keyword"
                        onClick={() => handleRemove(kw.id)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              <button className="btn-clear-watchlist" onClick={handleClear}>
                Clear All
              </button>
            </>
          ) : (
            <div className="watchlist-empty">
              <p>No keywords being tracked</p>
              <p className="hint">Add keywords to get alerts when they appear in trends</p>
            </div>
          )}
        </div>
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
