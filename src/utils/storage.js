const TRENDS_KEY = 'culture-heatmap-trends';
const BRANDING_KEY = 'culture-heatmap-branding';
const CATEGORIES_KEY = 'culture-heatmap-categories';

// Default placeholder categories (user will customize)
export const DEFAULT_CATEGORIES = [
  { id: 'sounds', label: 'SOUNDS', order: 1 },
  { id: 'creators', label: 'CREATORS', order: 2 },
  { id: 'aesthetics', label: 'AESTHETICS', order: 3 },
  { id: 'memes', label: 'MEMES', order: 4 },
];

// Default branding
export const DEFAULT_BRANDING = {
  title: 'CULTURE MAP',
  subtitle: 'Weekly velocity of cultural trends',
  context: 'Size = attention · Color = momentum',
  footerBrand: 'YOUR BRAND',
};

// Sample trends for demo
export const DEFAULT_TRENDS = [
  { id: '1', name: 'APT.', category: 'sounds', size: 95, change: 12.4 },
  { id: '2', name: 'Die With A Smile', category: 'sounds', size: 88, change: -3.2 },
  { id: '3', name: 'Saturn', category: 'sounds', size: 72, change: 28.5 },
  { id: '4', name: 'Sabrina Carpenter', category: 'creators', size: 92, change: 18.9 },
  { id: '5', name: 'Alex Earle', category: 'creators', size: 85, change: 2.1 },
  { id: '6', name: 'Keith Lee', category: 'creators', size: 78, change: -4.8 },
  { id: '7', name: 'Coquette', category: 'aesthetics', size: 68, change: -12.4 },
  { id: '8', name: 'Office Siren', category: 'aesthetics', size: 58, change: 8.7 },
  { id: '9', name: 'Subway Chronicles', category: 'memes', size: 52, change: 67.2 },
  { id: '10', name: 'Very Demure', category: 'memes', size: 38, change: -42.7 },
];

// Trends
export const getTrends = () => {
  const stored = localStorage.getItem(TRENDS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_TRENDS;
    }
  }
  return DEFAULT_TRENDS;
};

export const saveTrends = (trends) => {
  localStorage.setItem(TRENDS_KEY, JSON.stringify(trends));
};

// Branding
export const getBranding = () => {
  const stored = localStorage.getItem(BRANDING_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_BRANDING;
    }
  }
  return DEFAULT_BRANDING;
};

export const saveBranding = (branding) => {
  localStorage.setItem(BRANDING_KEY, JSON.stringify(branding));
};

// Categories
export const getCategories = () => {
  const stored = localStorage.getItem(CATEGORIES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }
  return DEFAULT_CATEGORIES;
};

export const saveCategories = (categories) => {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
};

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
