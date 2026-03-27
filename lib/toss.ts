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
