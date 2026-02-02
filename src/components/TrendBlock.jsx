import { getColor, RISING_COLOR, FALLING_COLOR } from '../utils/colors';

export default function TrendBlock({ item, style, onClick }) {
  const isLarge = style.width > 200 && style.height > 150;
  const isMedium = style.width > 100 && style.height > 70;
  const isTiny = style.width < 80 || style.height < 50;
  const hasImage = item.image && item.image.length > 0;

  // Calculate font size based on block size - Zora style
  const nameFontSize = isLarge ? '28px' : isMedium ? '18px' : '12px';
  const changeFontSize = isLarge ? '16px' : isMedium ? '13px' : '10px';

  // Border/padding proportional to block size
  const borderSize = isLarge ? 8 : isMedium ? 5 : 3;

  // Image fills the entire inner area
  const imageWidth = style.width - (borderSize * 2);
  const imageHeight = style.height - (borderSize * 2);

  return (
    <div
      onClick={() => onClick && onClick(item)}
      style={{
        position: 'absolute',
        left: style.x,
        top: style.y,
        width: style.width,
        height: style.height,
        backgroundColor: getColor(item.change),
        padding: borderSize,
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease',
        borderRadius: '0px',
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* Image container with overlays */}
      <div
        style={{
          position: 'relative',
          width: imageWidth,
          height: imageHeight,
          borderRadius: '0px',
          overflow: 'hidden',
          backgroundColor: hasImage ? 'transparent' : 'rgba(255,255,255,0.05)',
        }}
      >
        {/* Background image */}
        {hasImage && (
          <img
            src={item.image}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: item.imagePosition || 'center center',
            }}
          />
        )}

        {/* Name - TOP LEFT, color matches border (green=rising, red=falling) */}
        <div
          style={{
            position: 'absolute',
            top: isLarge ? 12 : isMedium ? 8 : 4,
            left: isLarge ? 12 : isMedium ? 8 : 4,
            fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: nameFontSize,
            fontWeight: 700,
            color: '#000000',
            backgroundColor: item.change >= 0 ? RISING_COLOR : FALLING_COLOR,
            padding: isLarge ? '6px 12px' : isMedium ? '4px 8px' : '2px 5px',
            lineHeight: 1.1,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            zIndex: 10,
          }}
        >
          {item.name}
        </div>

        {/* Change % - BOTTOM LEFT, color matches border */}
        {!isTiny && (
          <div
            style={{
              position: 'absolute',
              bottom: isLarge ? 12 : isMedium ? 8 : 4,
              left: isLarge ? 12 : isMedium ? 8 : 4,
              fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: changeFontSize,
              fontWeight: 700,
              color: '#000000',
              backgroundColor: item.change >= 0 ? RISING_COLOR : FALLING_COLOR,
              padding: isLarge ? '4px 10px' : isMedium ? '3px 7px' : '2px 5px',
              zIndex: 10,
              letterSpacing: '-0.5px',
            }}
          >
            {item.change > 0 ? '+' : ''}{item.change.toFixed(0)}%
          </div>
        )}
      </div>
    </div>
  );
}
