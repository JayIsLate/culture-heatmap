import { useState, useEffect } from 'react';

export default function BrandingSettings({ branding, onSave }) {
  const [formData, setFormData] = useState(branding);

  useEffect(() => {
    setFormData(branding);
  }, [branding]);

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onSave(updated);
  };

  return (
    <div className="branding-settings">
      <h3>Branding</h3>

      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="CULTURE MAP"
        />
      </div>

      <div className="form-group">
        <label>Subtitle</label>
        <input
          type="text"
          value={formData.subtitle}
          onChange={(e) => handleChange('subtitle', e.target.value)}
          placeholder="Weekly velocity of cultural trends"
        />
      </div>

      <div className="form-group">
        <label>Context (explains the map)</label>
        <input
          type="text"
          value={formData.context || ''}
          onChange={(e) => handleChange('context', e.target.value)}
          placeholder="Size = attention · Color = momentum"
        />
        <span className="hint">Helps viewers understand what the map shows</span>
      </div>

      <div className="form-group">
        <label>Footer Brand</label>
        <input
          type="text"
          value={formData.footerBrand}
          onChange={(e) => handleChange('footerBrand', e.target.value)}
          placeholder="YOUR BRAND"
        />
      </div>
    </div>
  );
}
