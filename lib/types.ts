export type AppScreen = 'name-entry' | 'settings' | 'game' | 'result';
export type MathOperator = '+' | '-' | '×' | '÷';
export type MaxNumber = 30 | 50 | 75;
export type CardMode = 'paper' | 'web';

export interface PlayerStats {
  name: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

export interface MathProblem {
  expression: string; // e.g. "12 × 5"
  answer: number;
}

export interface GameSettings {
  mode: 'standard' | 'calculation';
  operators: MathOperator[];
  maxNumber: MaxNumber;
  cardMode: CardMode;
}

/** 5×5 bingo card */
export interface BingoCard {
  /** cells[row][col]: number or 'FREE' (center) */
  cells: (number | 'FREE')[][];
  /** marked[row][col]: whether the cell is marked */
  marked: boolean[][];
}

export interface GameState {
  remainingNumbers: number[];
  drawnNumbers: number[];
  currentNumber: number | null;
  currentProblem: MathProblem | null;
  /** true = last draw matched card, false = missed, null = no draw yet */
  lastMatchFound: boolean | null;
  bingoCard: BingoCard | null;
  isGameOver: boolean;
}
