import { useState } from 'react';
import { toPng } from 'html-to-image';
import Heatmap from './Heatmap';

export default function ExportPreview({ trends, categories, branding, format, onClose }) {
  const [exporting, setExporting] = useState(false);

  const dimensions = {
    feed: { width: 1080, height: 1350 },
    story: { width: 1080, height: 1920 },
  };
  const { width, height } = dimensions[format];

  const handleExport = async () => {
    setExporting(true);
    const node = document.getElementById('export-preview-heatmap');
    if (!node) {
      setExporting(false);
      return;
    }

    try {
      const dataUrl = await toPng(node, {
        width,
        height,
        pixelRatio: 1,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });

      const link = document.createElement('a');
      link.download = `culture-heatmap-${format}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
    setExporting(false);
  };

  return (
    <div className="export-preview-overlay" onClick={onClose}>
      <div className="export-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-preview-header">
          <h2>Export Preview</h2>
          <span className="export-dims">{width} × {height}</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="export-preview-content">
          <div
            className="export-preview-scroll"
            style={{
              maxHeight: 'calc(80vh - 140px)',
              overflow: 'auto',
            }}
          >
            <div
              id="export-preview-heatmap"
              style={{
                width: width,
                height: height,
                position: 'relative',
                transformOrigin: 'top left',
              }}
            >
              <Heatmap
                trends={trends}
                categories={categories}
                branding={branding}
                format={format}
                scale={1}
              />
            </div>
          </div>
        </div>

        <div className="export-preview-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-export"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Download PNG'}
          </button>
        </div>
      </div>
    </div>
  );
}
