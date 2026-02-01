import { forwardRef } from 'react';
import TrendBlock from './TrendBlock';
import { calculateLayout } from '../utils/layout';
import { RISING_COLOR, FALLING_COLOR } from '../utils/colors';

const Heatmap = forwardRef(function Heatmap(
  { trends, categories, branding, format, onTrendClick, scale = 1 },
  ref
) {
  const dimensions = {
    feed: { width: 1080, height: 1350 },
    story: { width: 1080, height: 1920 },
  };

  const { width, height } = dimensions[format] || dimensions.feed;
  const headerHeight = format === 'story' ? 140 : 120;
  const footerHeight = format === 'story' ? 90 : 80;
  const contentHeight = height - headerHeight - footerHeight;

  // Group trends by category
  const grouped = {};
  trends.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  // Filter enabled categories
  const sortedCategories = categories
    .filter((cat) => cat.enabled !== false && grouped[cat.id] && grouped[cat.id].length > 0)
    .sort((a, b) => a.order - b.order);

  // Only count enabled categories for scaling
  const enabledTrends = trends.filter((t) => {
    const cat = categories.find((c) => c.id === t.category);
    return cat && cat.enabled !== false;
  });
  const totalSize = enabledTrends.reduce((sum, t) => sum + t.size, 0);

  let currentY = headerHeight;
  const categoryHeaderHeight = 50;

  const sections = sortedCategories.map((cat) => {
    const catItems = grouped[cat.id];
    const catSize = catItems.reduce((sum, t) => sum + t.size, 0);
    const catHeight = (catSize / totalSize) * contentHeight;
    const section = {
      category: cat,
      items: catItems,
      y: currentY,
      height: catHeight,
    };
    currentY += catHeight;
    return section;
  });

  return (
    <div
      ref={ref}
      id="heatmap-export"
      style={{
        width,
        height,
        position: 'relative',
        backgroundColor: '#000000',
        overflow: 'hidden',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Header - Zora-inspired dark theme */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #222',
        }}
      >
        <h1 style={{
          fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: format === 'story' ? '72px' : '68px',
          fontWeight: 700,
          color: '#ffffff',
          margin: 0,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          textTransform: 'uppercase',
        }}>
          {branding.title}
        </h1>
      </div>

      {/* Content */}
      {sections.map(({ category, items, y, height: sectionHeight }) => {
        const contentH = sectionHeight - categoryHeaderHeight;
        const layouts = calculateLayout(items, width - 60, contentH, 6);

        return (
          <div
            key={category.id}
            style={{
              position: 'absolute',
              top: y,
              left: 30,
              right: 30,
              height: sectionHeight,
            }}
          >
            {/* Category label */}
            <div style={{
              height: categoryHeaderHeight,
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid #333',
            }}>
              <span style={{
                fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
                fontSize: '16px',
                fontWeight: 600,
                color: '#00FF66',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                {category.label}
              </span>
            </div>

            {/* Blocks */}
            <div style={{ position: 'relative', height: contentH }}>
              {layouts.map((layout) => (
                <TrendBlock
                  key={layout.id}
                  item={layout}
                  style={layout}
                  onClick={onTrendClick}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: footerHeight,
          padding: '0 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#000000',
          borderTop: '1px solid #222',
        }}
      >
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 16, height: 16, backgroundColor: RISING_COLOR, borderRadius: 2 }} />
            <span style={{
              fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '0.05em',
            }}>
              RISING
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 16, height: 16, backgroundColor: FALLING_COLOR, borderRadius: 2 }} />
            <span style={{
              fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '0.05em',
            }}>
              FALLING
            </span>
          </div>
          {branding.context && (
            <>
              <div style={{ width: 1, height: 20, backgroundColor: '#333' }} />
              <span style={{
                fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
                fontSize: '13px',
                fontWeight: 400,
                color: '#888',
              }}>
                {branding.context}
              </span>
            </>
          )}
        </div>

        {/* Brand */}
        <span style={{
          fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: '22px',
          fontWeight: 600,
          color: '#ffffff',
          letterSpacing: '0.02em',
        }}>
          {branding.footerBrand}
        </span>
      </div>
    </div>
  );
});

export default Heatmap;
