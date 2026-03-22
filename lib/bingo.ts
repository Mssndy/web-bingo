import type { BingoCard, GameState } from './types';

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createInitialGameState(
  maxNumber: number,
  card: BingoCard | null = null
): GameState {
  const pool = Array.from({ length: maxNumber }, (_, i) => i + 1);
  return {
    remainingNumbers: shuffle(pool),
    drawnNumbers: [],
    currentNumber: null,
    currentProblem: null,
    awaitingAnswer: false,
    lastMatchFound: null,
    lastAnswerWrong: false,
    bingoCard: card,
    isGameOver: false,
  };
}

export function drawNextNumber(state: GameState): GameState {
  if (state.remainingNumbers.length === 0) {
    return { ...state, isGameOver: true };
  }
  const [next, ...rest] = state.remainingNumbers;
  return {
    ...state,
    remainingNumbers: rest,
    drawnNumbers: [...state.drawnNumbers, next],
    currentNumber: next,
    isGameOver: rest.length === 0,
  };
}

// ─── Bingo card helpers ────────────────────────────────────────────────────

/** Generate a fresh 5×5 bingo card from numbers 1..maxNumber */
export function generateBingoCard(maxNumber: number): BingoCard {
  const numbers = shuffle(Array.from({ length: maxNumber }, (_, i) => i + 1)).slice(0, 24);
  const cells: (number | 'FREE')[][] = [];
  const marked: boolean[][] = [];
  let idx = 0;
  for (let r = 0; r < 5; r++) {
    cells.push([]);
    marked.push([]);
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        cells[r].push('FREE');
        marked[r].push(true); // FREE is always marked
      } else {
        cells[r].push(numbers[idx++]);
        marked[r].push(false);
      }
    }
  }
  return { cells, marked };
}

/** Return true if number n appears on the card (not already marked) */
export function isNumberOnCard(card: BingoCard, n: number): boolean {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (card.cells[r][c] === n && !card.marked[r][c]) return true;
    }
  }
  return false;
}

/** Return a new card with n marked */
export function markNumber(card: BingoCard, n: number): BingoCard {
  const marked = card.marked.map((row) => [...row]);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (card.cells[r][c] === n) marked[r][c] = true;
    }
  }
  return { ...card, marked };
}

/** Returns true if there is a completed bingo line */
export function checkBingo(card: BingoCard): boolean {
  const { marked } = card;
  // Rows
  for (let r = 0; r < 5; r++) {
    if (marked[r].every(Boolean)) return true;
  }
  // Columns
  for (let c = 0; c < 5; c++) {
    if (marked.every((row) => row[c])) return true;
  }
  // Diagonals
  if ([0, 1, 2, 3, 4].every((i) => marked[i][i])) return true;
  if ([0, 1, 2, 3, 4].every((i) => marked[i][4 - i])) return true;
  return false;
}

/** Returns set of [r,c] pairs that are part of a completed bingo line */
export function getBingoLines(card: BingoCard): Set<string> {
  const { marked } = card;
  const hits = new Set<string>();
  const add = (r: number, c: number) => hits.add(`${r},${c}`);

  for (let r = 0; r < 5; r++) {
    if (marked[r].every(Boolean)) {
      for (let c = 0; c < 5; c++) add(r, c);
    }
  }
  for (let c = 0; c < 5; c++) {
    if (marked.every((row) => row[c])) {
      for (let r = 0; r < 5; r++) add(r, c);
    }
  }
  if ([0, 1, 2, 3, 4].every((i) => marked[i][i])) {
    [0, 1, 2, 3, 4].forEach((i) => add(i, i));
  }
  if ([0, 1, 2, 3, 4].every((i) => marked[i][4 - i])) {
    [0, 1, 2, 3, 4].forEach((i) => add(i, 4 - i));
  }
  return hits;
}
