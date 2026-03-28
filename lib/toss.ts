export const TOSS_BALLS = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Returns a 5×5 grid of numbers 1–25 in random order. */
export function generateTossGrid(): number[][] {
  const nums = shuffle(Array.from({ length: 25 }, (_, i) => i + 1));
  return Array.from({ length: 5 }, (_, r) => nums.slice(r * 5, r * 5 + 5));
}

export interface TossLineResult {
  /** Set of "r,c" keys belonging to at least one completed line. */
  cells: Set<string>;
  /** Number of completed lines (rows + cols + diags). */
  count: number;
}

export function checkTossLines(marked: boolean[][]): TossLineResult {
  const cells = new Set<string>();
  let count = 0;

  for (let r = 0; r < 5; r++) {
    if (marked[r].every(Boolean)) {
      count++;
      for (let c = 0; c < 5; c++) cells.add(`${r},${c}`);
    }
  }
  for (let c = 0; c < 5; c++) {
    if (marked.every(row => row[c])) {
      count++;
      for (let r = 0; r < 5; r++) cells.add(`${r},${c}`);
    }
  }
  if (marked.every((row, i) => row[i])) {
    count++;
    for (let i = 0; i < 5; i++) cells.add(`${i},${i}`);
  }
  if (marked.every((row, i) => row[4 - i])) {
    count++;
    for (let i = 0; i < 5; i++) cells.add(`${i},${4 - i}`);
  }

  return { cells, count };
}

/** Sum of all numbers in cells that are part of at least one bingo line. */
export function calcTossScore(grid: number[][], lineCells: Set<string>): number {
  let total = 0;
  for (const key of lineCells) {
    const [r, c] = key.split(',').map(Number);
    total += grid[r][c];
  }
  return total;
}

// ── Gauge mechanics ───────────────────────────────────────────────────────────

export type GaugeZone = 'perfect' | 'good' | 'ok' | 'miss';

/**
 * Determine which zone the gauge needle landed in.
 * 0° = 12 o'clock (top), increases clockwise.
 * PERFECT: within ±15° of top
 * GOOD:    within ±60°  (excluding PERFECT)
 * OK:      within ±120° (excluding GOOD)
 * MISS:    remaining bottom arc
 */
export function getZoneFromAngle(angle: number): GaugeZone {
  const dist = angle <= 180 ? angle : 360 - angle;
  if (dist < 15)  return 'perfect';
  if (dist < 60)  return 'good';
  if (dist < 120) return 'ok';
  return 'miss';
}

/**
 * Calculate the actual cell the ball lands on, given the aimed target and
 * the gauge zone that was hit.
 * - perfect → exact target
 * - good    → target or ≤1 Manhattan distance (weighted toward target)
 * - ok      → target or ≤2 Manhattan distance (weighted toward target)
 * - miss    → any random unmarked cell
 */
export function calcLandingCell(
  targetRow: number,
  targetCol: number,
  zone: GaugeZone,
  marked: boolean[][],
): [number, number] {
  const unmarked: [number, number][] = [];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 5; c++)
      if (!marked[r][c]) unmarked.push([r, c]);

  if (unmarked.length === 0) return [targetRow, targetCol];

  if (zone === 'perfect') return [targetRow, targetCol];

  if (zone === 'miss') {
    return unmarked[Math.floor(Math.random() * unmarked.length)];
  }

  const spread = zone === 'good' ? 1 : 2;
  const candidates = unmarked.filter(
    ([r, c]) => Math.abs(r - targetRow) + Math.abs(c - targetCol) <= spread,
  );
  const pool = candidates.length > 0 ? candidates : unmarked;

  // Weight: distance=0 → 6, distance=1 → 2, distance≥2 → 1
  const weights = pool.map(([r, c]) => {
    const d = Math.abs(r - targetRow) + Math.abs(c - targetCol);
    return d === 0 ? 6 : d === 1 ? 2 : 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
