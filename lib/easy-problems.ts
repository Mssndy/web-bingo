import type { EasyProblem } from './types';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateEasyProblem(operators: Array<'+' | '-'>): EasyProblem {
  const op = operators[Math.floor(Math.random() * operators.length)];

  if (op === '+') {
    const a = randomInt(1, 9);
    const b = randomInt(1, 9);
    return { operator: '+', operandA: a, operandB: b, answer: a + b, expression: `${a} ＋ ${b}` };
  } else {
    // Subtraction: result always >= 1 so children don't see 0 or negatives
    const a = randomInt(2, 15);
    const b = randomInt(1, a - 1);
    return { operator: '-', operandA: a, operandB: b, answer: a - b, expression: `${a} － ${b}` };
  }
}

/** Generate 8 shuffled answer choices that include the correct answer */
export function generateChoices(answer: number): number[] {
  const choices = new Set<number>([answer]);
  const diffs = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  for (const d of diffs) {
    if (choices.size >= 8) break;
    if (answer + d >= 0) choices.add(answer + d);
    if (choices.size >= 8) break;
    if (answer - d >= 0) choices.add(answer - d);
  }

  return shuffle([...choices]);
}
