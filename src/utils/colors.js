// Zora-inspired colors with neon green accent
export const getColor = (change) => {
  const intensity = Math.min(Math.abs(change) / 200, 1);

  if (change > 0) {
    // Neon green range (Zora brand)
    const r = Math.round(0 + 30 * intensity);
    const g = Math.round(200 + 55 * intensity);
    const b = Math.round(80 + 20 * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Magenta/pink for falling (Zora style)
    const r = Math.round(220 + 35 * intensity);
    const g = Math.round(0 + 40 * intensity);
    const b = Math.round(220 + 35 * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// Legend colors - Zora-inspired
export const RISING_COLOR = '#00FF66';
export const FALLING_COLOR = '#FF00FF';
