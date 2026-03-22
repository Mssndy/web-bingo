import type { GameState } from './types';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createInitialGameState(maxNumber: number): GameState {
  const pool = Array.from({ length: maxNumber }, (_, i) => i + 1);
  return {
    remainingNumbers: shuffle(pool),
    drawnNumbers: [],
    currentNumber: null,
    currentProblem: null,
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
