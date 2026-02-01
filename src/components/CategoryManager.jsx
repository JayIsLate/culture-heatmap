import { useState } from 'react';
import { generateId } from '../utils/storage';

export default function CategoryManager({ categories, onSave }) {
  const [editingId, setEditingId] = useState(null);
  const [newLabel, setNewLabel] = useState('');

  const enabledCount = categories.filter((c) => c.enabled !== false).length;

  const handleToggle = (id) => {
    onSave(
      categories.map((cat) =>
        cat.id === id ? { ...cat, enabled: cat.enabled === false ? true : false } : cat
      )
    );
  };

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const newCat = {
      id: generateId(),
      label: newLabel.toUpperCase(),
      order: categories.length + 1,
      enabled: true,
    };
    onSave([...categories, newCat]);
    setNewLabel('');
  };

  const handleUpdate = (id, label) => {
    onSave(
      categories.map((cat) =>
        cat.id === id ? { ...cat, label: label.toUpperCase() } : cat
      )
    );
    setEditingId(null);
  };

  const handleDelete = (id) => {
    onSave(categories.filter((cat) => cat.id !== id));
  };

  const handleReorder = (id, direction) => {
    const index = categories.findIndex((c) => c.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categories.length - 1)
    ) {
      return;
    }

    const newCats = [...categories];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newCats[index], newCats[swapIndex]] = [newCats[swapIndex], newCats[index]];

    newCats.forEach((cat, i) => {
      cat.order = i + 1;
    });

    onSave(newCats);
  };

  return (
    <div className="category-manager">
      <h3>Categories</h3>

      <p className="category-hint">
        {enabledCount > 2
          ? `${enabledCount} active — recommend 1-2 for readability`
          : `${enabledCount} active`
        }
      </p>

      <div className="category-list">
        {categories
          .sort((a, b) => a.order - b.order)
          .map((cat) => (
            <div
              key={cat.id}
              className={`category-item ${cat.enabled === false ? 'disabled' : ''}`}
            >
              <label className="category-toggle">
                <input
                  type="checkbox"
                  checked={cat.enabled !== false}
                  onChange={() => handleToggle(cat.id)}
                />
              </label>
              {editingId === cat.id ? (
                <input
                  type="text"
                  defaultValue={cat.label}
                  autoFocus
                  onBlur={(e) => handleUpdate(cat.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdate(cat.id, e.target.value);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
              ) : (
                <span
                  className="category-label"
                  onClick={() => setEditingId(cat.id)}
                >
                  {cat.label}
                </span>
              )}
              <div className="category-actions">
                <button onClick={() => handleReorder(cat.id, 'up')}>↑</button>
                <button onClick={() => handleReorder(cat.id, 'down')}>↓</button>
                <button
                  className="delete"
                  onClick={() => handleDelete(cat.id)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
      </div>

      <div className="add-category">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New category"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button onClick={handleAdd}>Add</button>
      </div>
    </div>
  );
}
