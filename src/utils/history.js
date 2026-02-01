// Historical tracking utilities

const HISTORY_KEY = 'culture-heatmap-history';

/**
 * Get ISO week number and year from a date
 * @param {Date} date
 * @returns {{ year: number, week: number, key: string }}
 */
export function getISOWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday (for ISO week calculation)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  // Get first Thursday of year
  const yearStart = new Date(d.getFullYear(), 0, 4);
  yearStart.setDate(yearStart.getDate() + 3 - ((yearStart.getDay() + 6) % 7));
  // Calculate week number
  const weekNumber = Math.round(((d - yearStart) / 86400000 + 1) / 7) + 1;
  const year = d.getFullYear();

  return {
    year,
    week: weekNumber,
    key: `${year}-W${String(weekNumber).padStart(2, '0')}`,
  };
}

/**
 * Get the previous week's key
 * @param {string} weekKey - Current week key (e.g., "2024-W04")
 * @returns {string}
 */
export function getPreviousWeekKey(weekKey) {
  const match = weekKey.match(/(\d{4})-W(\d{2})/);
  if (!match) return null;

  let year = parseInt(match[1], 10);
  let week = parseInt(match[2], 10);

  week--;
  if (week < 1) {
    year--;
    // Get number of weeks in previous year (52 or 53)
    const lastDayOfYear = new Date(year, 11, 31);
    const { week: lastWeek } = getISOWeek(lastDayOfYear);
    week = lastWeek;
  }

  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Load all history from localStorage
 * @returns {Object}
 */
export function getHistory() {
  const stored = localStorage.getItem(HISTORY_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Save a weekly snapshot
 * @param {Array} trends - Current trends
 * @param {string} weekKey - Optional week key (defaults to current week)
 */
export function saveWeeklySnapshot(trends, weekKey = null) {
  const history = getHistory();
  const key = weekKey || getISOWeek().key;

  history[key] = {
    trends: trends.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      size: t.size,
      change: t.change,
    })),
    timestamp: new Date().toISOString(),
  };

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

/**
 * Get a specific week's snapshot
 * @param {string} weekKey
 * @returns {Object | null}
 */
export function getWeekSnapshot(weekKey) {
  const history = getHistory();
  return history[weekKey] || null;
}

/**
 * Get the previous week's data for a specific trend (by name)
 * @param {string} trendName
 * @param {string} currentWeekKey
 * @returns {Object | null}
 */
export function getPreviousWeekTrend(trendName, currentWeekKey = null) {
  const key = currentWeekKey || getISOWeek().key;
  const prevKey = getPreviousWeekKey(key);
  if (!prevKey) return null;

  const snapshot = getWeekSnapshot(prevKey);
  if (!snapshot) return null;

  return snapshot.trends.find(
    (t) => t.name.toLowerCase() === trendName.toLowerCase()
  ) || null;
}

/**
 * Calculate change percentage from previous week
 * @param {number} currentSize
 * @param {number} previousSize
 * @returns {number}
 */
export function calculateChange(currentSize, previousSize) {
  if (!previousSize || previousSize === 0) return 0;
  return ((currentSize - previousSize) / previousSize) * 100;
}

/**
 * Auto-calculate change for a trend based on history
 * @param {Object} trend - Current trend data
 * @returns {number}
 */
export function autoCalculateChange(trend) {
  const prevTrend = getPreviousWeekTrend(trend.name);
  if (!prevTrend) return trend.change || 0;

  return calculateChange(trend.size, prevTrend.size);
}

/**
 * Get trend history over multiple weeks
 * @param {string} trendName
 * @param {number} weeks - Number of weeks to look back
 * @returns {Array}
 */
export function getTrendHistory(trendName, weeks = 4) {
  const history = getHistory();
  const results = [];
  let currentKey = getISOWeek().key;

  for (let i = 0; i < weeks; i++) {
    const snapshot = history[currentKey];
    if (snapshot) {
      const trend = snapshot.trends.find(
        (t) => t.name.toLowerCase() === trendName.toLowerCase()
      );
      if (trend) {
        results.push({
          week: currentKey,
          ...trend,
          timestamp: snapshot.timestamp,
        });
      }
    }
    currentKey = getPreviousWeekKey(currentKey);
    if (!currentKey) break;
  }

  return results.reverse();
}

/**
 * Get all available week keys in history (sorted newest first)
 * @returns {string[]}
 */
export function getAvailableWeeks() {
  const history = getHistory();
  return Object.keys(history).sort().reverse();
}

/**
 * Delete a week's snapshot
 * @param {string} weekKey
 */
export function deleteWeekSnapshot(weekKey) {
  const history = getHistory();
  delete history[weekKey];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/**
 * Clear all history
 */
export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
