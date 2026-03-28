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

// Fun emoji for multiplication group visuals — varied and 4yo-friendly
const MULT_EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍓', '⭐', '🐱', '🐶', '🚗', '🌸', '🎀', '🍩'];

export function generateEasyProblem(operators: Array<'+' | '-' | '×'>): EasyProblem {
  const op = operators[Math.floor(Math.random() * operators.length)];

  if (op === '+') {
    // 4yo-friendly: single digit + single digit, sum ≤ 10
    const a = randomInt(1, 5);
    const b = randomInt(1, 5);
    return { operator: '+', operandA: a, operandB: b, answer: a + b, expression: `${a} ＋ ${b}` };
  }

  if (op === '-') {
    // 4yo-friendly: result always ≥ 1, max starting number 10
    const a = randomInt(2, 10);
    const b = randomInt(1, a - 1);
    return { operator: '-', operandA: a, operandB: b, answer: a - b, expression: `${a} － ${b}` };
  }

  // Multiplication: small groups (2–5 × 2–5) — visual makes it concrete
  const a = randomInt(2, 5);
  const b = randomInt(2, 5);
  const emoji = MULT_EMOJIS[Math.floor(Math.random() * MULT_EMOJIS.length)];
  return {
    operator: '×',
    operandA: a,
    operandB: b,
    answer: a * b,
    expression: `${a} × ${b}`,
    emoji,
  };
}

/** Generate 4 shuffled answer choices that include the correct answer */
export function generateChoices(answer: number): number[] {
  const choices = new Set<number>([answer]);
  const diffs = shuffle([1, 2, 3, 4, 5, 6]);

  for (const d of diffs) {
    if (choices.size >= 4) break;
    if (answer + d > 0) choices.add(answer + d);
    if (choices.size >= 4) break;
    if (answer - d > 0) choices.add(answer - d);
  }

  // Fallback: fill with small positive numbers
  for (let v = 1; choices.size < 4; v++) {
    if (!choices.has(v)) choices.add(v);
  }

  return shuffle([...choices]);
}
