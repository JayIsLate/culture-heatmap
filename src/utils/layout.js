// Squarified Treemap Algorithm
// Based on Bruls, Huizing, van Wijk - optimizes for square-ish aspect ratios

export const calculateLayout = (items, containerWidth, containerHeight, padding = 3) => {
  if (!items || items.length === 0) return [];

  const totalSize = items.reduce((sum, item) => sum + item.size, 0);
  if (totalSize === 0) return [];

  // Normalize sizes to fit the container area
  const totalArea = containerWidth * containerHeight;
  const normalizedItems = items
    .map(item => ({
      ...item,
      normalizedSize: (item.size / totalSize) * totalArea,
    }))
    .sort((a, b) => b.normalizedSize - a.normalizedSize);

  const layouts = [];

  // Squarify algorithm
  function squarify(children, row, width, x, y, vertical) {
    if (children.length === 0) {
      layoutRow(row, width, x, y, vertical);
      return;
    }

    const rowWithChild = [...row, children[0]];

    if (row.length === 0 || worst(row, width) >= worst(rowWithChild, width)) {
      // Adding this child improves or maintains the aspect ratio
      squarify(children.slice(1), rowWithChild, width, x, y, vertical);
    } else {
      // This child makes it worse - finalize current row
      const rowArea = row.reduce((sum, item) => sum + item.normalizedSize, 0);
      const rowLength = rowArea / width;

      layoutRow(row, width, x, y, vertical);

      // Start new row with remaining children
      if (vertical) {
        squarify(children, [], containerHeight - (y + rowLength - 0), x + rowLength, 0, !vertical);
      } else {
        squarify(children, [], containerWidth - (x + rowLength - 0), 0, y + rowLength, !vertical);
      }
    }
  }

  function worst(row, width) {
    if (row.length === 0) return Infinity;

    const sum = row.reduce((s, item) => s + item.normalizedSize, 0);
    const rowMin = Math.min(...row.map(item => item.normalizedSize));
    const rowMax = Math.max(...row.map(item => item.normalizedSize));

    const s2 = sum * sum;
    const w2 = width * width;

    return Math.max(
      (w2 * rowMax) / s2,
      s2 / (w2 * rowMin)
    );
  }

  function layoutRow(row, width, startX, startY, vertical) {
    if (row.length === 0) return;

    const rowArea = row.reduce((sum, item) => sum + item.normalizedSize, 0);
    const rowLength = rowArea / width;

    let offset = 0;

    row.forEach(item => {
      const itemLength = item.normalizedSize / rowLength;

      let x, y, w, h;

      if (vertical) {
        x = startX;
        y = startY + offset;
        w = rowLength;
        h = itemLength;
      } else {
        x = startX + offset;
        y = startY;
        w = itemLength;
        h = rowLength;
      }

      layouts.push({
        ...item,
        x: x + padding / 2,
        y: y + padding / 2,
        width: Math.max(w - padding, 0),
        height: Math.max(h - padding, 0),
      });

      offset += itemLength;
    });
  }

  // Determine initial orientation based on container aspect ratio
  const vertical = containerWidth >= containerHeight;
  const initialWidth = vertical ? containerHeight : containerWidth;

  // Use recursive subdivision approach for better results
  layoutSquarified(normalizedItems, 0, 0, containerWidth, containerHeight);

  function layoutSquarified(items, x, y, width, height) {
    if (items.length === 0) return;

    if (items.length === 1) {
      layouts.push({
        ...items[0],
        x: x + padding / 2,
        y: y + padding / 2,
        width: Math.max(width - padding, 0),
        height: Math.max(height - padding, 0),
      });
      return;
    }

    // Decide split direction based on aspect ratio
    const vertical = width >= height;
    const side = vertical ? height : width;

    // Find the best row using squarify heuristic
    const row = [];
    let rowArea = 0;
    let i = 0;

    while (i < items.length) {
      const testRow = [...row, items[i]];
      const testArea = rowArea + items[i].normalizedSize;

      if (row.length === 0) {
        row.push(items[i]);
        rowArea = testArea;
        i++;
        continue;
      }

      // Calculate aspect ratios
      const currentWorst = worstRatio(row, rowArea, side);
      const testWorst = worstRatio(testRow, testArea, side);

      if (testWorst <= currentWorst) {
        row.push(items[i]);
        rowArea = testArea;
        i++;
      } else {
        break;
      }
    }

    // Layout the row
    const rowLength = rowArea / side;
    let offset = 0;

    row.forEach(item => {
      const itemSize = item.normalizedSize / rowLength;

      if (vertical) {
        layouts.push({
          ...item,
          x: x + padding / 2,
          y: y + offset + padding / 2,
          width: Math.max(rowLength - padding, 0),
          height: Math.max(itemSize - padding, 0),
        });
      } else {
        layouts.push({
          ...item,
          x: x + offset + padding / 2,
          y: y + padding / 2,
          width: Math.max(itemSize - padding, 0),
          height: Math.max(rowLength - padding, 0),
        });
      }

      offset += itemSize;
    });

    // Recurse on remaining items
    const remaining = items.slice(row.length);
    if (remaining.length > 0) {
      if (vertical) {
        layoutSquarified(remaining, x + rowLength, y, width - rowLength, height);
      } else {
        layoutSquarified(remaining, x, y + rowLength, width, height - rowLength);
      }
    }
  }

  function worstRatio(row, area, side) {
    if (row.length === 0) return Infinity;

    const length = area / side;
    let worst = 0;

    row.forEach(item => {
      const itemSide = item.normalizedSize / length;
      const ratio = Math.max(length / itemSide, itemSide / length);
      worst = Math.max(worst, ratio);
    });

    return worst;
  }

  // Clear and use the recursive function
  layouts.length = 0;
  layoutSquarified(normalizedItems, 0, 0, containerWidth, containerHeight);

  return layouts;
};
