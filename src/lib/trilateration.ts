export interface AnchorCoordinates {
  x: number;
  y: number;
  distance: number;
}

export interface LocalPosition {
  x: number;
  y: number;
}

export const solvePosition = (anchors: AnchorCoordinates[]): LocalPosition | null => {
  if (anchors.length < 3) return null;
  const sorted = [...anchors].sort((a, b) => a.distance - b.distance);
  const reference = sorted[0];
  let a11 = 0;
  let a12 = 0;
  let a22 = 0;
  let b1 = 0;
  let b2 = 0;
  for (const anchor of sorted.slice(1)) {
    const rowX = 2 * (anchor.x - reference.x);
    const rowY = 2 * (anchor.y - reference.y);
    const rhs = reference.distance ** 2 - anchor.distance ** 2 + anchor.x ** 2 - reference.x ** 2 + anchor.y ** 2 - reference.y ** 2;
    const weight = 1 / Math.max(anchor.distance, 0.5) ** 2;
    a11 += weight * rowX * rowX;
    a12 += weight * rowX * rowY;
    a22 += weight * rowY * rowY;
    b1 += weight * rowX * rhs;
    b2 += weight * rowY * rhs;
  }
  const det = a11 * a22 - a12 * a12;
  if (Math.abs(det) < 1e-9) return null;
  const x = (a22 * b1 - a12 * b2) / det;
  const y = (a11 * b2 - a12 * b1) / det;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
};

export function calculatePrecisePosition(anchors: [AnchorCoordinates, AnchorCoordinates, AnchorCoordinates]): LocalPosition {
  const solved = solvePosition(anchors);
  if (solved) return solved;
  return { x: (anchors[0].x + anchors[1].x + anchors[2].x) / 3, y: (anchors[0].y + anchors[1].y + anchors[2].y) / 3 };
}
