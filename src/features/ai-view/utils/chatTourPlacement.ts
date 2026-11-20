interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Side = 'right' | 'below' | 'above';

interface Size {
  width: number;
  height: number;
}

export interface ChatTourPlacement {
  spotlight: Box | null;
  card: Box;
  side: Side | null;
  arrow: number;
}

const EDGE = 12;
const TARGET_PADDING = 4;
const GAP = 14;
const ARROW_HALF = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function getChatTourPlacement(
  target: Box | null,
  cardSize: Size,
  viewport: Size,
  preferred: 'right' | 'below'
): ChatTourPlacement {
  const { width, height } = cardSize;
  const maxLeft = viewport.width - width - EDGE;
  const maxTop = viewport.height - height - EDGE;
  const centered = {
    spotlight: null,
    card: { width, height, left: clamp(maxLeft / 2 + EDGE / 2, EDGE, maxLeft), top: clamp(maxTop / 2 + EDGE / 2, EDGE, maxTop) },
    side: null,
    arrow: 0,
  };

  if (!target || target.width === 0 || target.height === 0) return centered;

  const left = Math.max(EDGE / 2, target.left - TARGET_PADDING);
  const top = Math.max(EDGE / 2, target.top - TARGET_PADDING);
  const right = Math.min(viewport.width - EDGE / 2, target.left + target.width + TARGET_PADDING);
  const bottom = Math.min(viewport.height - EDGE / 2, target.top + target.height + TARGET_PADDING);
  if (right <= left || bottom <= top) return centered;

  const spotlight = { left, top, width: right - left, height: bottom - top };
  const centerX = left + spotlight.width / 2;
  const centerY = top + spotlight.height / 2;
  const cardX = clamp(centerX - width / 2, EDGE, maxLeft);
  const cardY = clamp(centerY - height / 2, EDGE, maxTop);
  const sides: Side[] = preferred === 'right' ? ['right', 'below', 'above'] : ['below', 'above', 'right'];
  for (const side of sides) {
    if (side === 'right' && right + GAP <= maxLeft) {
      return {
        spotlight,
        card: { width, height, left: right + GAP, top: cardY },
        side,
        arrow: clamp(centerY - cardY - ARROW_HALF, 12, height - 22),
      };
    }
    const cardTop = side === 'below' ? bottom + GAP : top - GAP - height;
    if (side !== 'right' && cardTop >= EDGE && cardTop <= maxTop) {
      return {
        spotlight,
        card: { width, height, left: cardX, top: cardTop },
        side,
        arrow: clamp(centerX - cardX - ARROW_HALF, 12, width - 22),
      };
    }
  }
  return { ...centered, spotlight };
}
