export type AppScreen = 'name-entry' | 'settings' | 'game' | 'result';
export type MathOperator = '+' | '-' | '×' | '÷';
export type MaxNumber = 30 | 50 | 75;

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
}

export interface GameState {
  remainingNumbers: number[];
  drawnNumbers: number[];
  currentNumber: number | null;
  currentProblem: MathProblem | null;
  isGameOver: boolean;
}
