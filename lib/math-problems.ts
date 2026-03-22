import type { MathOperator, MathProblem } from './types';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAddition(n: number): MathProblem {
  if (n === 1) return { expression: `0 + 1`, answer: 1 };
  const a = randInt(1, n - 1);
  return { expression: `${a} + ${n - a}`, answer: n };
}

function generateSubtraction(n: number): MathProblem {
  const b = randInt(1, Math.min(10, 99 - n));
  const a = n + b;
  return { expression: `${a} - ${b}`, answer: n };
}

function factorPairs(n: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let a = 2; a <= Math.min(n / 2, 12); a++) {
    if (n % a === 0) {
      const b = n / a;
      if (b >= 2 && b <= 12) pairs.push([a, b]);
    }
  }
  return pairs;
}

function generateMultiplication(n: number): MathProblem | null {
  const pairs = factorPairs(n);
  if (pairs.length === 0) return null;
  const [a, b] = pickRandom(pairs);
  return { expression: `${a} × ${b}`, answer: n };
}

function generateDivision(n: number): MathProblem | null {
  // divisors in [2,12]
  const divisors: number[] = [];
  for (let d = 2; d <= 12; d++) {
    const dividend = n * d;
    if (dividend <= 144) divisors.push(d); // stay reasonable
  }
  if (divisors.length === 0) return null;
  const d = pickRandom(divisors);
  return { expression: `${n * d} ÷ ${d}`, answer: n };
}

export function generateProblem(
  n: number,
  operators: MathOperator[]
): MathProblem {
  const shuffled = [...operators].sort(() => Math.random() - 0.5);
  for (const op of shuffled) {
    let result: MathProblem | null = null;
    if (op === '+') result = generateAddition(n);
    else if (op === '-') result = generateSubtraction(n);
    else if (op === '×') result = generateMultiplication(n);
    else if (op === '÷') result = generateDivision(n);
    if (result) return result;
  }
  // fallback: always works
  return generateAddition(n);
}
