import { useState, useEffect, useRef } from 'react';
import Heatmap from './components/Heatmap';
import TrendForm from './components/TrendForm';
import BrandingSettings from './components/BrandingSettings';
import ExportControls from './components/ExportControls';
import ExportPreview from './components/ExportPreview';
import CategoryManager from './components/CategoryManager';
import LinkImport from './components/LinkImport';
import ScreenshotImport from './components/ScreenshotImport';
import DiscoverPage from './pages/DiscoverPage';
import {
  getTrends,
  saveTrends,
  getBranding,
  saveBranding,
  getCategories,
  saveCategories,
  generateId,
} from './utils/storage';
import { saveWeeklySnapshot } from './utils/history';
import { calculateEngagementScore } from './utils/metrics';
import './App.css';

function App() {
  const [trends, setTrends] = useState([]);
  const [branding, setBranding] = useState({ title: '', subtitle: '', footerBrand: '', context: '' });
  const [categories, setCategories] = useState([]);
  const [format, setFormat] = useState('feed');
  const [editingTrend, setEditingTrend] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [activePanel, setActivePanel] = useState('trends');
  const [showLinkImport, setShowLinkImport] = useState(false);
  const [showScreenshotImport, setShowScreenshotImport] = useState(false);
  const [importedData, setImportedData] = useState(null);
  const [currentView, setCurrentView] = useState('heatmap'); // 'heatmap' or 'discover'
  const heatmapRef = useRef(null);

  // Load from localStorage on mount
  useEffect(() => {
    setTrends(getTrends());
    setBranding(getBranding());
    setCategories(getCategories());
  }, []);

  // Handlers
  const handleSaveTrend = (trend) => {
    let updated;
    if (editingTrend) {
      updated = trends.map((t) => (t.id === trend.id ? trend : t));
    } else {
      updated = [...trends, trend];
    }
    setTrends(updated);
    saveTrends(updated);
    saveWeeklySnapshot(updated);
    setShowForm(false);
    setEditingTrend(null);
    setImportedData(null);
  };

  const handleDeleteTrend = (id) => {
    const updated = trends.filter((t) => t.id !== id);
    setTrends(updated);
    saveTrends(updated);
    setShowForm(false);
    setEditingTrend(null);
  };

  const handleTrendClick = (trend) => {
    setEditingTrend(trend);
    setShowForm(true);
    setActivePanel('trends');
  };

  const handleBrandingSave = (newBranding) => {
    setBranding(newBranding);
    saveBranding(newBranding);
  };

  const handleCategoriesSave = (newCategories) => {
    setCategories(newCategories);
    saveCategories(newCategories);
  };

  // Handle link import
  const handleLinkImport = (data) => {
    setImportedData(data);
    setShowLinkImport(false);
    setShowForm(true);
    setEditingTrend(null);
  };

  // Handle screenshot import (with metrics)
  const handleScreenshotImport = (data) => {
    const newTrend = {
      id: generateId(),
      name: data.name,
      category: data.suggestedCategory || categories[0]?.id,
      size: data.size || 50,
      change: data.change || 0,
      image: data.image || '',
      sourceUrl: data.sourceUrl || '',
      platform: data.platform || '',
      metrics: data.metrics || null,
    };
    const updated = [...trends, newTrend];
    setTrends(updated);
    saveTrends(updated);
    saveWeeklySnapshot(updated);
    setShowScreenshotImport(false);
  };

  // Handle add trend from suggestions/discover
  const handleAddFromSuggestion = (suggestionData) => {
    // Calculate size from metrics if available
    let size = 50;
    if (suggestionData.popularity) {
      size = suggestionData.popularity; // Spotify popularity is already 0-100
    } else if (suggestionData.metrics) {
      size = calculateEngagementScore(suggestionData.metrics, suggestionData.platform || 'unknown');
    }

    const newTrend = {
      id: generateId(),
      name: suggestionData.name,
      category: suggestionData.category,
      size,
      change: 0,
      image: suggestionData.image || '',
      sourceUrl: suggestionData.sourceUrl || '',
      platform: suggestionData.source || '',
      metrics: suggestionData.metrics || null,
    };
    const updated = [...trends, newTrend];
    setTrends(updated);
    saveTrends(updated);
    saveWeeklySnapshot(updated);
  };

  // Calculate scale to fit preview
  const previewScale = format === 'story' ? 0.35 : 0.4;

  // Render Discover page as full screen
  if (currentView === 'discover') {
    return (
      <DiscoverPage
        categories={categories}
        onAddTrend={handleAddFromSuggestion}
        onBack={() => setCurrentView('heatmap')}
      />
    );
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <h1>Culture Heatmap</h1>
            <button
              className="btn-discover"
              onClick={() => setCurrentView('discover')}
            >
              Discover ↗
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={activePanel === 'trends' ? 'active' : ''}
            onClick={() => setActivePanel('trends')}
          >
            Trends
          </button>
          <button
            className={activePanel === 'categories' ? 'active' : ''}
            onClick={() => setActivePanel('categories')}
          >
            Categories
          </button>
          <button
            className={activePanel === 'branding' ? 'active' : ''}
            onClick={() => setActivePanel('branding')}
          >
            Branding
          </button>
          <button
            className={activePanel === 'export' ? 'active' : ''}
            onClick={() => setActivePanel('export')}
          >
            Export
          </button>
        </nav>

        <div className="sidebar-content">
          {activePanel === 'trends' && (
            <div className="trends-panel">
              {showScreenshotImport ? (
                <ScreenshotImport
                  categories={categories}
                  onImport={handleScreenshotImport}
                  onCancel={() => setShowScreenshotImport(false)}
                />
              ) : showLinkImport ? (
                <LinkImport
                  categories={categories}
                  onImport={handleLinkImport}
                  onCancel={() => setShowLinkImport(false)}
                />
              ) : showForm ? (
                <TrendForm
                  trend={editingTrend}
                  categories={categories}
                  onSave={handleSaveTrend}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingTrend(null);
                    setImportedData(null);
                  }}
                  onDelete={editingTrend ? handleDeleteTrend : null}
                  importedData={importedData}
                />
              ) : (
                <>
                  <div className="add-trend-buttons">
                    <button
                      className="btn-add"
                      onClick={() => {
                        setEditingTrend(null);
                        setImportedData(null);
                        setShowForm(true);
                      }}
                    >
                      + Manual
                    </button>
                    <button
                      className="btn-screenshot"
                      onClick={() => setShowScreenshotImport(true)}
                    >
                      📸 Screenshot
                    </button>
                    <button
                      className="btn-import"
                      onClick={() => setShowLinkImport(true)}
                    >
                      🔗 Link
                    </button>
                  </div>
                  <div className="trend-list-grouped">
                    {categories
                      .filter((category) => category.enabled !== false)
                      .map((category) => {
                        const categoryTrends = trends.filter(
                          (t) => t.category === category.id
                        );
                        if (categoryTrends.length === 0) return null;
                        return (
                          <div key={category.id} className="trend-group">
                            <div className="trend-group-header">
                              {category.label}
                            </div>
                            <div className="trend-list">
                              {categoryTrends.map((trend) => (
                                <div
                                  key={trend.id}
                                  className="trend-item"
                                  onClick={() => handleTrendClick(trend)}
                                >
                                  <div className="trend-item-info">
                                    <span className="trend-name">{trend.name}</span>
                                    {trend.metrics && (
                                      <span className="trend-metrics-badge">
                                        📊
                                      </span>
                                    )}
                                  </div>
                                  <div className="trend-item-stats">
                                    <span className="trend-size">{trend.size}</span>
                                    <span
                                      className={`trend-change ${
                                        trend.change >= 0 ? 'positive' : 'negative'
                                      }`}
                                    >
                                      {trend.change >= 0 ? '+' : ''}
                                      {trend.change}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          )}

          {activePanel === 'categories' && (
            <CategoryManager
              categories={categories}
              onSave={handleCategoriesSave}
            />
          )}

          {activePanel === 'branding' && (
            <BrandingSettings branding={branding} onSave={handleBrandingSave} />
          )}

          {activePanel === 'export' && (
            <ExportControls
              format={format}
              onFormatChange={setFormat}
              onPreview={() => setShowExportPreview(true)}
            />
          )}
        </div>
      </aside>

      {/* Main preview area */}
      <main className="preview-area">
        <div className="preview-container">
          <div
            className="preview-wrapper"
            style={{
              width: format === 'story' ? 1080 * previewScale : 1080 * previewScale,
              height: format === 'story' ? 1920 * previewScale : 1350 * previewScale,
            }}
          >
            <Heatmap
              ref={heatmapRef}
              trends={trends}
              categories={categories}
              branding={branding}
              format={format}
              onTrendClick={handleTrendClick}
              scale={previewScale}
            />
          </div>
          <p className="preview-label">
            Preview ({format === 'story' ? '1080×1920' : '1080×1350'}) — Click a
            trend to edit
          </p>
        </div>
      </main>

      {/* Export Preview Modal */}
      {showExportPreview && (
        <ExportPreview
          trends={trends}
          categories={categories}
          branding={branding}
          format={format}
          onClose={() => setShowExportPreview(false)}
        />
      )}
    </div>
  );
}

export default App;
