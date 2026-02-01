export default function ExportControls({ format, onFormatChange, onPreview }) {
  return (
    <div className="export-controls">
      <h3>Export</h3>

      <div className="format-selector">
        <label>
          <input
            type="radio"
            name="format"
            value="feed"
            checked={format === 'feed'}
            onChange={() => onFormatChange('feed')}
          />
          <span>Feed Post (4:5)</span>
          <span className="dims">1080 × 1350</span>
        </label>
        <label>
          <input
            type="radio"
            name="format"
            value="story"
            checked={format === 'story'}
            onChange={() => onFormatChange('story')}
          />
          <span>Story (9:16)</span>
          <span className="dims">1080 × 1920</span>
        </label>
      </div>

      <button onClick={onPreview} className="btn-preview">
        Preview Full Size
      </button>
    </div>
  );
}
