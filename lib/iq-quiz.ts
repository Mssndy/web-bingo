/**
 * "ひらめき診断" (IQ-style) quiz problems.
 * Two modes:
 *   - kid    : visual, age-tuned so 0〜12 year olds can play
 *   - adult  : text/number-heavy puzzles for grownups
 *
 * Difficulty model:
 *   1. Age (or adult mode) decides a "base" difficulty:
 *        0〜5  → easy
 *        6〜8  → medium
 *        9〜12 → hard
 *        adult → adult
 *   2. Within that age, a SubLevel shifts the resolved difficulty up/down:
 *        easy   →  -1 step
 *        normal →  ±0
 *        hard   →  +1 step
 *      Clamped at the easy/adult ends.
 */

export type IqMode = 'kid' | 'adult';
export type IqDifficulty = 'easy' | 'medium' | 'hard' | 'adult';
/** Per-age sub-difficulty (UI: かんたん/ふつう/むずかしい) */
export type SubLevel = 'easy' | 'normal' | 'hard';
export const SUB_LEVELS: readonly SubLevel[] = ['easy', 'normal', 'hard'] as const;
export const DEFAULT_SUB_LEVEL: SubLevel = 'normal';

export interface IqChoice {
  /** what to show on the choice button */
  label: string;
  /** true if this is the correct answer */
  correct: boolean;
}

export interface IqProblem {
  /** stable id used as React key when re-rendering */
  id: string;
  /** the kind of problem (used for the small kicker label above the question) */
  kind: IqProblemKind;
  /** prompt shown above the visual */
  prompt: string;
  /** array of "tokens" to render as the visual question — emoji string or '?' for blank */
  visual: string[];
  /** 4 choices, exactly one is correct */
  choices: IqChoice[];
}

export type IqProblemKind =
  | 'pattern'         // つぎはどれ？  ○●○●○?
  | 'odd-one-out'     // なかまはずれ
  | 'count'           // いくつある？
  | 'sequence'        // すうじのつづき
  | 'size-order'      // いちばん大きいのは？
  | 'logic'           // ちょっとかんがえる
  // Adult-only kinds:
  | 'adv-sequence'    // 非線形数列 (×2+1, n²,  Fibonacci, …)
  | 'letter-seq'      // アルファベット列
  | 'mental-math'     // 暗算
  | 'long-logic'      // 4項以上の三段論法
  | 'analogy';        // 類推 (A : B = C : ?)

// ── Difficulty mapping ───────────────────────────────────────────────────────
//
// Two independent axes:
//   1. Age (or adult mode) decides WHICH kinds of problems appear.
//   2. SubLevel decides parameter intensity within those kinds, AND the IQ
//      score range (cap) the player can hit.
// They are intentionally decoupled so that e.g. a 7-year-old's むずかしい still
// shows 7-year-old style problems — never crosses into another age band.

/** Param difficulty — ONLY drives generator parameters (counts, periods, ...). */
export function paramFor(mode: IqMode, sub: SubLevel = DEFAULT_SUB_LEVEL): IqDifficulty {
  if (mode === 'adult') return 'adult';
  if (sub === 'easy')   return 'easy';
  if (sub === 'normal') return 'medium';
  return 'hard';
}

/** @deprecated kept only for back-compat with older callsites. */
export function difficultyForAge(age: number): IqDifficulty {
  if (age <= 5) return 'easy';
  if (age <= 8) return 'medium';
  return 'hard';
}

/** Available session lengths — players pick one before starting. */
export const QUIZ_LENGTH_OPTIONS = [5, 10, 20, 50, 100] as const;
export type QuizLength = typeof QUIZ_LENGTH_OPTIONS[number];
export const DEFAULT_QUIZ_LENGTH: QuizLength = 5;
/** Cap retries when trying to dedupe random problems. */
const DEDUPE_MAX_TRIES = 25;

// ── Helpers ──────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeChoices(correct: string, distractors: string[]): IqChoice[] {
  const pool = [correct, ...distractors.filter((d) => d !== correct)].slice(0, 4);
  while (pool.length < 4) pool.push('❓');
  return shuffle(pool).map((label) => ({ label, correct: label === correct }));
}

// ── Visual emoji palettes ────────────────────────────────────────────────────

const SHAPES   = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'];
const FACES    = ['😀', '😺', '🐶', '🐰', '🐻', '🐯', '🐸'];
const FOODS    = ['🍎', '🍊', '🍇', '🍓', '🍌', '🍉', '🍒'];
const VEHICLES = ['🚗', '🚕', '🚌', '🚲', '✈️', '🚂', '🚀'];
const TOOLS    = ['✏️', '📚', '🖍️', '🎨', '🧸', '⚽'];
const ANIMALS  = ['🐘', '🐶', '🐱', '🐭', '🦒', '🐻', '🐰'];

// ── Generators (one per problem kind) ─────────────────────────────────────────

function genPattern(diff: IqDifficulty): IqProblem {
  // Build a repeating sequence of `period` tokens, hide the next one.
  const period = diff === 'easy' ? 2 : diff === 'medium' ? 3 : pick([3, 4]);
  const reps   = diff === 'easy' ? 3 : 2;
  const tokens = shuffle(SHAPES).slice(0, period);

  const visual: string[] = [];
  for (let r = 0; r < reps; r++) visual.push(...tokens);
  // hidden index marks the next token in the sequence
  const hiddenIdx = visual.length;
  const answer   = tokens[hiddenIdx % period];
  visual.push('?');

  const distractors = SHAPES.filter((s) => s !== answer);
  return {
    id: `pattern-${Date.now()}-${Math.random()}`,
    kind: 'pattern',
    prompt: 'つぎは どれかな？',
    visual,
    choices: makeChoices(answer, shuffle(distractors).slice(0, 3)),
  };
}

function genOddOneOut(diff: IqDifficulty): IqProblem {
  // Pick a "main" category and one "odd" item from a different category.
  const groups = [FOODS, VEHICLES, ANIMALS, TOOLS, FACES];
  const [main, other] = shuffle(groups).slice(0, 2);
  const mainCount = diff === 'easy' ? 3 : 3; // always 3 same + 1 odd visually
  const sameItems = shuffle(main).slice(0, mainCount);
  const oddItem   = pick(other);

  const visual = shuffle([...sameItems, oddItem]);
  // For the choice list, ask the child to pick which one doesn't fit.
  const choices = visual.map((label) => ({ label, correct: label === oddItem }));

  return {
    id: `odd-${Date.now()}-${Math.random()}`,
    kind: 'odd-one-out',
    prompt: 'なかまはずれは どれ？',
    visual: [], // visual is the choice grid itself
    choices: shuffle(choices),
  };
}

function genCount(diff: IqDifficulty): IqProblem {
  const max = diff === 'easy' ? 6 : diff === 'medium' ? 12 : 18;
  const min = diff === 'easy' ? 3 : 5;
  const count = randomInt(min, max);
  const item = pick([...FACES, ...FOODS, ...ANIMALS]);

  const visual = Array.from({ length: count }, () => item);
  const distractors = shuffle([
    count + 1, count - 1, count + 2, count - 2, count + 3,
  ].filter((n) => n > 0 && n !== count));

  return {
    id: `count-${Date.now()}-${Math.random()}`,
    kind: 'count',
    prompt: 'いくつ ある？',
    visual,
    choices: makeChoices(String(count), distractors.slice(0, 3).map(String)),
  };
}

function genSequence(diff: IqDifficulty): IqProblem {
  // Arithmetic progression
  const step = diff === 'medium' ? pick([1, 2, 3]) : pick([2, 3, 5, 10]);
  const start = randomInt(1, diff === 'medium' ? 10 : 20);
  const len = 4;
  const seq = Array.from({ length: len }, (_, i) => start + step * i);
  const answer = start + step * len;

  const visual = [...seq.map(String), '?'];
  const distractors = shuffle([
    answer + step, answer - step, answer + 1, answer - 1, answer + step * 2,
  ].filter((n) => n > 0 && n !== answer));

  return {
    id: `seq-${Date.now()}-${Math.random()}`,
    kind: 'sequence',
    prompt: 'つぎの すうじは？',
    visual,
    choices: makeChoices(String(answer), distractors.slice(0, 3).map(String)),
  };
}

function genSizeOrder(): IqProblem {
  // Animals roughly ordered from largest to smallest
  const ordered = ['🐘', '🦒', '🐻', '🐯', '🐶', '🐱', '🐭', '🐜'];
  const sample = shuffle(ordered).slice(0, 4);
  const askBiggest = Math.random() < 0.5;
  const sortedByOrder = [...sample].sort(
    (a, b) => ordered.indexOf(a) - ordered.indexOf(b),
  );
  const answer = askBiggest ? sortedByOrder[0] : sortedByOrder[sortedByOrder.length - 1];
  const distractors = sample.filter((x) => x !== answer);

  return {
    id: `size-${Date.now()}-${Math.random()}`,
    kind: 'size-order',
    prompt: askBiggest ? 'いちばん 大きいのは どれ？' : 'いちばん 小さいのは どれ？',
    visual: sample,
    choices: makeChoices(answer, distractors),
  };
}

function genLogic(diff: IqDifficulty): IqProblem {
  // A > B, B > C  →  who is biggest?
  // Use simple named tokens ("あ", "い", "う") to keep it abstract & fair.
  const names = shuffle(['あ', 'い', 'う']);
  const [biggest, mid, smallest] = names;
  const ask = pick(['biggest', 'smallest'] as const);
  const answer = ask === 'biggest' ? biggest : smallest;

  const promptLines = [
    `${biggest} は ${mid} より おおきい`,
    `${mid} は ${smallest} より おおきい`,
  ];
  const visual = promptLines;

  const distractors = names.filter((n) => n !== answer);
  return {
    id: `logic-${Date.now()}-${Math.random()}`,
    kind: 'logic',
    prompt: ask === 'biggest'
      ? `いちばん おおきいのは どれ？ (${diff === 'hard' ? 'むずかしい！' : 'よく かんがえてね'})`
      : 'いちばん ちいさいのは どれ？',
    visual,
    choices: makeChoices(answer, distractors),
  };
}

// ── Adult-only generators ───────────────────────────────────────────────────

/** Non-linear number sequences. Picks one rule at random and shows 4 terms. */
type AdvRule = { name: string; gen: () => { seq: number[]; next: number } };

// Easier rules — straightforward arithmetic
const ADV_RULES_EASY: AdvRule[] = [
  { name: '+n',
    gen: () => {
      const start = randomInt(1, 5), step = randomInt(2, 5);
      const seq = [start, start + step, start + 2 * step, start + 3 * step];
      return { seq, next: start + 4 * step };
    } },
  { name: '×2',
    gen: () => {
      const start = randomInt(1, 4);
      const seq = [start, start * 2, start * 4, start * 8];
      return { seq, next: start * 16 };
    } },
];

// Standard non-linear rules (current behavior)
const ADV_RULES_NORMAL: AdvRule[] = [
  { name: '×2+1',
    gen: () => {
      const a = randomInt(1, 5);
      const seq = [a];
      for (let i = 0; i < 3; i++) seq.push(seq[i] * 2 + 1);
      return { seq, next: seq[3] * 2 + 1 };
    } },
  { name: 'square',
    gen: () => {
      const start = randomInt(2, 4);
      const seq = [start, start + 1, start + 2, start + 3].map((n) => n * n);
      return { seq, next: (start + 4) * (start + 4) };
    } },
  { name: 'fib',
    gen: () => {
      const a = randomInt(1, 4), b = randomInt(2, 5);
      const seq = [a, b, a + b, a + 2 * b];
      return { seq, next: 2 * a + 3 * b };
    } },
  { name: 'incdiff',
    gen: () => {
      const start = randomInt(1, 5);
      const k = randomInt(1, 3);
      const seq = [start];
      let inc = randomInt(1, 3);
      for (let i = 0; i < 3; i++) { seq.push(seq[i] + inc); inc += k; }
      return { seq, next: seq[3] + inc };
    } },
  { name: '×3-1',
    gen: () => {
      const a = randomInt(1, 3);
      const seq = [a];
      for (let i = 0; i < 3; i++) seq.push(seq[i] * 3 - 1);
      return { seq, next: seq[3] * 3 - 1 };
    } },
];

// Genius-tier rules for adult+むずかしい
const ADV_RULES_HARD: AdvRule[] = [
  { name: 'tribonacci',  // a + b + c
    gen: () => {
      const a = randomInt(1, 3), b = randomInt(1, 4), c = randomInt(2, 5);
      const t4 = a + b + c;
      const t5 = b + c + t4;
      return { seq: [a, b, c, t4], next: t5 };
    } },
  { name: 'square+const',  // n² + k
    gen: () => {
      const start = randomInt(3, 5), k = randomInt(2, 7);
      const seq = [start, start + 1, start + 2, start + 3].map((n) => n * n + k);
      return { seq, next: (start + 4) * (start + 4) + k };
    } },
  { name: 'cubic',  // n³
    gen: () => {
      const start = randomInt(2, 3);
      const seq = [start, start + 1, start + 2, start + 3].map((n) => n ** 3);
      return { seq, next: (start + 4) ** 3 };
    } },
  { name: 'mul-n+n',  // ×2+2, ×2+3, ×2+4 ... (each step's add increments)
    gen: () => {
      const a = randomInt(1, 4);
      const seq = [a];
      for (let i = 0; i < 3; i++) seq.push(seq[i] * 2 + (i + 2));
      return { seq, next: seq[3] * 2 + 5 };
    } },
  { name: 'primes',  // 連続素数
    gen: () => {
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
      const startIdx = randomInt(0, primes.length - 6);
      const seq = primes.slice(startIdx, startIdx + 4);
      return { seq, next: primes[startIdx + 4] };
    } },
  { name: 'factorial',  // 1, 2, 6, 24, 120, 720
    gen: () => {
      const fact = [1, 2, 6, 24, 120, 720, 5040];
      const startIdx = randomInt(0, 2);
      const seq = fact.slice(startIdx, startIdx + 4);
      return { seq, next: fact[startIdx + 4] };
    } },
  { name: 'product-prev',  // a, b, a*b, b*(a*b), …
    gen: () => {
      const a = randomInt(2, 3), b = randomInt(2, 4);
      const c = a * b;
      const d = b * c;
      const e = c * d;
      return { seq: [a, b, c, d], next: e };
    } },
];

function genAdvSequence(sub: SubLevel): IqProblem {
  const rules =
    sub === 'easy'   ? ADV_RULES_EASY :
    sub === 'normal' ? ADV_RULES_NORMAL :
    [...ADV_RULES_NORMAL, ...ADV_RULES_HARD];  // hard mixes normal + genius rules

  const { seq, next } = pick(rules).gen();
  const visual = [...seq.map(String), '?'];
  // Distractors near the answer (off by ±1, ±2, plus a "step" miscount).
  const distractors = shuffle([
    next + 1, next - 1, next + 2, next - 2,
    seq[3] + (seq[3] - seq[2]),
  ].filter((n) => n > 0 && n !== next));

  return {
    id: `advseq-${Date.now()}-${Math.random()}`,
    kind: 'adv-sequence',
    prompt: '次に来る数は？',
    visual,
    choices: makeChoices(String(next), distractors.slice(0, 3).map(String)),
  };
}

/** Letter sequence with arithmetic step on character index. */
function genLetterSeq(sub: SubLevel): IqProblem {
  const toLetter = (c: number) => String.fromCharCode(65 + c);

  // Hard variant: alternating step pattern, e.g. +2, +3, +2, +3, … or +1, +2, +3, +4
  if (sub === 'hard' && Math.random() < 0.5) {
    // increasing-step: A, B, D, G, K, P  (+1, +2, +3, +4 → +5)
    const start = randomInt(0, 5);
    const codes = [start, start + 1, start + 1 + 2, start + 1 + 2 + 3]; // +1,+2,+3
    const nextCode = codes[3] + 4;
    if (nextCode < 26) {
      const visual = [...codes.map(toLetter), '?'];
      const answer = toLetter(nextCode);
      const distractors = shuffle([
        nextCode + 1, nextCode - 1, nextCode + 2, nextCode - 2,
      ].filter((c) => c >= 0 && c < 26 && c !== nextCode)).map(toLetter);
      return {
        id: `letter-${Date.now()}-${Math.random()}`,
        kind: 'letter-seq',
        prompt: '次のアルファベットは？',
        visual,
        choices: makeChoices(answer, distractors.slice(0, 3)),
      };
    }
  }

  // Default: linear arithmetic step. easy=1-2, normal=1-4, hard=3-6
  const stepRange =
    sub === 'easy'   ? [1, 2] :
    sub === 'normal' ? [1, 4] : [3, 6];
  const step = randomInt(stepRange[0], stepRange[1]);
  const startCode = randomInt(0, Math.max(0, 26 - step * 5));
  const codes = [0, 1, 2, 3].map((i) => startCode + step * i);
  const nextCode = startCode + step * 4;

  const visual = [...codes.map(toLetter), '?'];
  const answer = toLetter(nextCode);
  const distractors = shuffle([
    nextCode + 1, nextCode - 1, nextCode + step, nextCode - step,
  ].filter((c) => c >= 0 && c < 26 && c !== nextCode)).map(toLetter);

  return {
    id: `letter-${Date.now()}-${Math.random()}`,
    kind: 'letter-seq',
    prompt: '次のアルファベットは？',
    visual,
    choices: makeChoices(answer, distractors.slice(0, 3)),
  };
}

/** Mental arithmetic. Difficulty controls digit count and operation complexity. */
function genMentalMath(sub: SubLevel): IqProblem {
  type Op = () => { expr: string; ans: number };
  const opsEasy: Op[] = [
    () => { // single-digit ops, larger
      const a = randomInt(7, 12), b = randomInt(3, 9);
      return { expr: `${a} × ${b}`, ans: a * b };
    },
    () => { // 2-digit + 2-digit
      const a = randomInt(20, 80), b = randomInt(15, 60);
      return { expr: `${a} + ${b}`, ans: a + b };
    },
    () => { // small division
      const b = randomInt(2, 6), q = randomInt(3, 9);
      return { expr: `${b * q} ÷ ${b}`, ans: q };
    },
  ];
  const opsNormal: Op[] = [
    () => { // 2-digit × 1-digit
      const a = randomInt(11, 19), b = randomInt(3, 9);
      return { expr: `${a} × ${b}`, ans: a * b };
    },
    () => { // squaring 2-digit teen
      const a = randomInt(12, 19);
      return { expr: `${a}²`, ans: a * a };
    },
    () => { // integer division
      const b = randomInt(3, 12), q = randomInt(6, 15);
      return { expr: `${b * q} ÷ ${b}`, ans: q };
    },
    () => { // a + b - c
      const a = randomInt(40, 90), b = randomInt(20, 60), c = randomInt(10, 50);
      return { expr: `${a} + ${b} - ${c}`, ans: a + b - c };
    },
  ];
  const opsHard: Op[] = [
    ...opsNormal,
    () => { // 3-digit × 1-digit
      const a = randomInt(101, 199), b = randomInt(4, 9);
      return { expr: `${a} × ${b}`, ans: a * b };
    },
    () => { // 2-digit × 2-digit (close to round numbers for tractability)
      const a = randomInt(11, 49), b = randomInt(11, 29);
      return { expr: `${a} × ${b}`, ans: a * b };
    },
    () => { // squaring 20-50
      const a = randomInt(21, 50);
      return { expr: `${a}²`, ans: a * a };
    },
    () => { // percent
      const pct = pick([10, 15, 20, 25, 30, 40, 50, 75]);
      const base = randomInt(2, 20) * 20;  // multiples of 20
      return { expr: `${pct}% of ${base}`, ans: Math.round(base * pct / 100) };
    },
    () => { // mod
      const m = randomInt(4, 9), q = randomInt(5, 15), r = randomInt(0, m - 1);
      const n = m * q + r;
      return { expr: `${n} mod ${m}`, ans: r };
    },
    () => { // 4-term mixed
      const a = randomInt(50, 99), b = randomInt(20, 50), c = randomInt(10, 40), d = randomInt(5, 25);
      return { expr: `${a} + ${b} − ${c} + ${d}`, ans: a + b - c + d };
    },
  ];

  const ops = sub === 'easy' ? opsEasy : sub === 'normal' ? opsNormal : opsHard;
  const { expr, ans } = pick(ops)();
  const distractors = shuffle([
    ans + 1, ans - 1, ans + 10, ans - 10, ans + Math.max(2, Math.round(ans * 0.1)),
  ].filter((n) => n > 0 && n !== ans));

  return {
    id: `math-${Date.now()}-${Math.random()}`,
    kind: 'mental-math',
    prompt: '計算してください',
    visual: [`${expr} = ?`],
    choices: makeChoices(String(ans), distractors.slice(0, 3).map(String)),
  };
}

/**
 * Multi-step transitive logic. Difficulty controls chain length:
 *   easy   → 3 items (essentially a basic syllogism)
 *   normal → 4 items
 *   hard   → 5 items + mixed comparison directions, harder query
 */
function genLongLogic(sub: SubLevel): IqProblem {
  const itemCount = sub === 'easy' ? 3 : sub === 'normal' ? 4 : 5;
  const allNames = ['A', 'B', 'C', 'D', 'E'];
  const ordered = shuffle(allNames).slice(0, itemCount); // index 0 = largest

  // Build the inequality chain. Hard mixes "<" lines (still equivalent ordering).
  const lines: string[] = [];
  for (let i = 0; i < itemCount - 1; i++) {
    const big = ordered[i], small = ordered[i + 1];
    if (sub === 'hard' && Math.random() < 0.5) {
      lines.push(`${small} は ${big} より小さい`);
    } else {
      lines.push(`${big} は ${small} より大きい`);
    }
  }
  if (sub === 'hard') shuffle(lines); // shuffle the line order to add load

  // Build queries appropriate for the chain length.
  type Q = { ask: string; ans: string };
  const queries: Q[] = [];
  queries.push({ ask: '最も大きいのは？', ans: ordered[0] });
  queries.push({ ask: '最も小さいのは？', ans: ordered[itemCount - 1] });
  queries.push({ ask: '2番目に大きいのは？', ans: ordered[1] });
  if (itemCount >= 4) queries.push({ ask: '2番目に小さいのは？', ans: ordered[itemCount - 2] });
  if (itemCount >= 5) queries.push({ ask: '中央(3番目)はどれ？', ans: ordered[2] });

  const q = pick(queries);
  const distractors = ordered.filter((n) => n !== q.ans);

  return {
    id: `longlogic-${Date.now()}-${Math.random()}`,
    kind: 'long-logic',
    prompt: q.ask,
    visual: lines,
    choices: makeChoices(q.ans, distractors.slice(0, 3)),
  };
}

type AnalogyQuad = { a: string; b: string; c: string; d: string; distractors: string[] };

// Standard analogies — concrete, single-step relationships
const ANALOGIES_NORMAL: AnalogyQuad[] = [
  { a: '犬',     b: '子犬',     c: '猫',       d: '子猫',     distractors: ['ねずみ', 'うさぎ', '老猫'] },
  { a: '日本',   b: '東京',     c: 'フランス', d: 'パリ',     distractors: ['ロンドン', 'ローマ', 'ベルリン'] },
  { a: '本',     b: '読む',     c: '音楽',     d: '聴く',     distractors: ['見る', '書く', '走る'] },
  { a: '医者',   b: '病院',     c: '先生',     d: '学校',     distractors: ['会社', '工場', '家'] },
  { a: '太陽',   b: '昼',       c: '月',       d: '夜',       distractors: ['朝', '夕方', '雲'] },
  { a: '魚',     b: '泳ぐ',     c: '鳥',       d: '飛ぶ',     distractors: ['歩く', '止まる', '鳴く'] },
  { a: '春',     b: '桜',       c: '秋',       d: '紅葉',     distractors: ['雪', '花火', '台風'] },
  { a: '足',     b: '靴',       c: '手',       d: '手袋',     distractors: ['帽子', 'マフラー', '指輪'] },
  { a: '画家',   b: '絵',       c: '作家',     d: '本',       distractors: ['楽器', '映画', '道具'] },
  { a: '熱い',   b: '冷たい',   c: '高い',     d: '低い',     distractors: ['広い', '速い', '深い'] },
  { a: 'パン',   b: '小麦',     c: '酒',       d: '米',       distractors: ['豆', '芋', '果物'] },
  { a: '車',     b: '道路',     c: '電車',     d: '線路',     distractors: ['空港', '港', '駅'] },
  { a: '医師',   b: '聴診器',   c: '画家',     d: '絵筆',     distractors: ['ノート', '電卓', 'メス'] },
  { a: '時計',   b: '時間',     c: '温度計',   d: '温度',     distractors: ['湿度', '高さ', '重さ'] },
  { a: '雨',     b: '傘',       c: '太陽',     d: '帽子',     distractors: ['コート', '長靴', 'マフラー'] },
  { a: '監督',   b: '映画',     c: '作曲家',   d: '音楽',     distractors: ['絵', '本', '舞台'] },
  { a: 'パイロット', b: '飛行機', c: '船長',   d: '船',       distractors: ['電車', 'バス', '車'] },
  { a: '蜂',     b: '蜜',       c: '牛',       d: '牛乳',     distractors: ['卵', '肉', 'チーズ'] },
  { a: '鉛筆',   b: '書く',     c: 'はさみ',   d: '切る',     distractors: ['消す', '貼る', '結ぶ'] },
  { a: '本',     b: '図書館',   c: '絵',       d: '美術館',   distractors: ['博物館', '映画館', '体育館'] },
  { a: '東',     b: '西',       c: '南',       d: '北',       distractors: ['上', '下', '中央'] },
  { a: '速い',   b: 'チーター', c: '大きい',   d: 'ゾウ',     distractors: ['キリン', 'ライオン', 'クジラ'] },
  { a: '医者',   b: '人',       c: '獣医',     d: '動物',     distractors: ['植物', '鳥', '魚'] },
  { a: '小説',   b: '読む',     c: '映画',     d: '観る',     distractors: ['描く', '聴く', '弾く'] },
  { a: '日',     b: '週',       c: '月',       d: '年',       distractors: ['秒', '時', '分'] },
];

// Easy analogies — very obvious / first-order relations
const ANALOGIES_EASY: AnalogyQuad[] = [
  { a: '犬',   b: '子犬', c: '猫',   d: '子猫', distractors: ['ねずみ', 'うさぎ', '魚'] },
  { a: '本',   b: '読む', c: '音楽', d: '聴く', distractors: ['食べる', '書く', '走る'] },
  { a: '足',   b: '靴',   c: '手',   d: '手袋', distractors: ['帽子', 'マフラー', '指輪'] },
  { a: '太陽', b: '昼',   c: '月',   d: '夜',   distractors: ['朝', '夕方', '雲'] },
  { a: '魚',   b: '泳ぐ', c: '鳥',   d: '飛ぶ', distractors: ['歩く', '止まる', '泣く'] },
  { a: '日本', b: '東京', c: 'フランス', d: 'パリ', distractors: ['ロンドン', 'ローマ', 'ベルリン'] },
  { a: '東',   b: '西',   c: '南',   d: '北',   distractors: ['上', '下', '中央'] },
];

// Hard analogies — abstract, function-based, multi-step, lateral
const ANALOGIES_HARD: AnalogyQuad[] = [
  { a: '水',     b: '氷',       c: '雲',       d: '雨',       distractors: ['雪', '霧', '虹'] },           // 状態変化
  { a: '医者',   b: '診断',     c: '探偵',     d: '推理',     distractors: ['取調', '逮捕', '尾行'] },      // 職業×核心動詞
  { a: '原因',   b: '結果',     c: '質問',     d: '答え',     distractors: ['議論', '対話', '反論'] },      // 抽象的対概念
  { a: '言葉',   b: '辞書',     c: '地図',     d: '地図帳',   distractors: ['図鑑', '百科事典', 'ガイドブック'] },  // 情報×集成
  { a: '画家',   b: '絵筆',     c: '彫刻家',   d: '鑿',       distractors: ['ハンマー', '釘', 'のこぎり'] }, // 職業×固有道具
  { a: '幼虫',   b: '蝶',       c: 'おたまじゃくし', d: 'カエル', distractors: ['とんぼ', '魚', 'ヘビ'] },     // 変態
  { a: '記憶',   b: '忘却',     c: '出現',     d: '消失',     distractors: ['移動', '変化', '停止'] },      // 抽象×反対動作
  { a: '原稿',   b: '本',       c: '設計図',   d: '建物',     distractors: ['工場', '部品', '機械'] },      // 計画→完成物
  { a: 'シェイクスピア', b: '戯曲', c: 'ベートーヴェン', d: '交響曲', distractors: ['映画', '小説', '絵画'] }, // 芸術家×作品ジャンル
  { a: '光',     b: '影',       c: '音',       d: '残響',     distractors: ['静寂', '振動', 'こだま'] },    // 物理現象×二次効果
  { a: '雪',     b: '冬',       c: '台風',     d: '夏',       distractors: ['春', '秋', '梅雨'] },          // 現象×季節
  { a: '医療',   b: '病気',     c: '修理',     d: '故障',     distractors: ['設計', '製造', '販売'] },      // 行為×対応する対象
  { a: '文字',   b: '単語',     c: '原子',     d: '分子',     distractors: ['細胞', '宇宙', '物質'] },      // 構成要素×構成物
  { a: '楽譜',   b: '演奏',     c: '台本',     d: '上演',     distractors: ['練習', '稽古', '撮影'] },      // 設計図×実行
  { a: '速度',   b: 'スピード計', c: '気圧',   d: '気圧計',   distractors: ['風速計', '湿度計', '体温計'] }, // 計測対象×計器
  { a: '法律',   b: '弁護士',   c: '病気',     d: '医師',     distractors: ['看護師', '裁判官', '警察'] },  // 領域×専門家
  { a: '羊',     b: '群れ',     c: '魚',       d: '群れ',     distractors: ['列', '巣', '帯'] },            // 集合名詞 (羊×群、魚×群でも可・群以外を選ばせない用)
  { a: '彫刻',   b: '石',       c: '陶器',     d: '土',       distractors: ['木', '金属', 'ガラス'] },      // 完成品×素材
];

/** Word analogy:  A : B = C : ?  Choose the word that matches the relationship. */
function genAnalogy(sub: SubLevel): IqProblem {
  // hard: mostly hard-tier with some normal mixed in for variety; normal: mid; easy: easy only
  const pool =
    sub === 'easy'   ? ANALOGIES_EASY :
    sub === 'normal' ? ANALOGIES_NORMAL :
    [...ANALOGIES_NORMAL, ...ANALOGIES_HARD, ...ANALOGIES_HARD];  // weighted toward hard
  const q = pick(pool);
  const visual = [`${q.a} : ${q.b}`, `${q.c} : ?`];

  return {
    id: `analogy-${Date.now()}-${Math.random()}`,
    kind: 'analogy',
    prompt: 'AはBに対応します。CはDに対応するとき、Dは？',
    visual,
    choices: makeChoices(q.d, q.distractors.slice(0, 3)),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Stable fingerprint of a problem's content (visual + correct answer + choice
 * set). Used to guarantee no duplicate problems appear within a single session.
 * The random `id` field is intentionally excluded.
 */
function problemSignature(p: IqProblem): string {
  const correct = p.choices.find((c) => c.correct)?.label ?? '';
  const choiceSet = [...p.choices.map((c) => c.label)].sort().join('|');
  return `${p.kind}::${p.visual.join(',')}::${correct}::${choiceSet}`;
}

/**
 * Dispatch a single problem.
 *  - `diff` is the resolved IqDifficulty (drives kid generators).
 *  - `sub`  is the player-picked sub-level (drives adult generators where
 *    'adult' as a single token isn't expressive enough on its own).
 */
function genByKind(kind: IqProblemKind, diff: IqDifficulty, sub: SubLevel): IqProblem {
  switch (kind) {
    case 'pattern':       return genPattern(diff);
    case 'odd-one-out':   return genOddOneOut(diff);
    case 'count':         return genCount(diff);
    case 'sequence':      return genSequence(diff);
    case 'size-order':    return genSizeOrder();
    case 'logic':         return genLogic(diff);
    case 'adv-sequence':  return genAdvSequence(sub);
    case 'letter-seq':    return genLetterSeq(sub);
    case 'mental-math':   return genMentalMath(sub);
    case 'long-logic':    return genLongLogic(sub);
    case 'analogy':       return genAnalogy(sub);
  }
}

/**
 * Kinds of problems for an age band. Driven only by age + mode — never by
 * sub-level — so an age band never bleeds into another's problem types.
 */
function kindMenuFor(age: number, mode: IqMode): IqProblemKind[] {
  if (mode === 'adult') return ['adv-sequence', 'letter-seq', 'mental-math', 'long-logic', 'analogy'];
  if (age <= 5) return ['count', 'odd-one-out', 'pattern', 'size-order'];
  if (age <= 8) return ['pattern', 'sequence', 'count', 'odd-one-out', 'size-order', 'logic'];
  return ['sequence', 'pattern', 'logic', 'odd-one-out', 'size-order'];
}

/** Build a kind list sized to `count` from the age's base kind menu. */
function buildKindList(age: number, mode: IqMode, count: number): IqProblemKind[] {
  const base = kindMenuFor(age, mode);
  const reps = Math.ceil(count / base.length) + 1;
  const expanded: IqProblemKind[] = [];
  for (let r = 0; r < reps; r++) expanded.push(...base);
  return shuffle(expanded).slice(0, count);
}

/**
 * Generate a fresh quiz of `count` problems for the player's age, mode, and
 * selected sub-level. Problem KINDS come from age/mode; the sub-level only
 * adjusts parameter intensity (counts/periods/etc.) inside those kinds.
 * Problems are deduped by content signature within the session.
 */
export function generateQuiz(
  age: number,
  count: number = DEFAULT_QUIZ_LENGTH,
  mode: IqMode = 'kid',
  sub: SubLevel = DEFAULT_SUB_LEVEL,
): IqProblem[] {
  const param = paramFor(mode, sub);
  const kinds = buildKindList(age, mode, count);
  const seen = new Set<string>();
  const out: IqProblem[] = [];

  for (const kind of kinds) {
    let problem = genByKind(kind, param, sub);
    let tries = 0;
    while (seen.has(problemSignature(problem)) && tries < DEDUPE_MAX_TRIES) {
      problem = genByKind(kind, param, sub);
      tries++;
    }
    seen.add(problemSignature(problem));
    out.push(problem);
  }
  return out;
}

// ── Result scoring ───────────────────────────────────────────────────────────

export interface IqResult {
  /** 1〜5 stars */
  stars: number;
  /** Computed kid-friendly IQ score (always ≥ MIN_IQ to keep things positive) */
  iq: number;
  /** Cheerful title shown big at the top */
  title: string;
  /** Encouraging one-liner */
  message: string;
  /** Color theme key matching the bingo palette */
  color: 'pink' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
  /** Big emoji shown next to the title */
  emoji: string;
}

// Absolute display bounds. Adult floor is lower than kid floor on purpose:
// adult scoring is stricter and 0% can drop into "below average" territory,
// while kid scoring stays positive (keeps it kind for children).
const MIN_IQ = 70;
const MAX_IQ = 190;
/**
 * Per-mode, per-sub-level IQ cap. Higher difficulty → higher possible ceiling,
 * mimicking a real IQ test: hitting top scores requires the hardest problems.
 * Adult caps are higher than kid caps because the adult problem set itself is
 * harder, and adult mode is judged more strictly (lower floor).
 */
const IQ_CAPS: Record<IqMode, Record<SubLevel, number>> = {
  kid:   { easy: 110, normal: 130, hard: 160 },
  adult: { easy: 125, normal: 155, hard: 190 },  // adult+hard reaches genius tier
};
const IQ_FLOORS: Record<IqMode, number> = {
  kid:   85,  // children always see ≥ average
  adult: 70,  // strict — 0% on adult honestly shows below-average
};

export interface IqRange {
  /** lowest possible score for the (mode, sub) combination */
  min: number;
  /** highest possible score for the (mode, sub) combination */
  max: number;
}

/** Inclusive [min, max] IQ range for the given mode/sub pair. */
export function iqRangeFor(mode: IqMode, sub: SubLevel = DEFAULT_SUB_LEVEL): IqRange {
  return { min: IQ_FLOORS[mode], max: IQ_CAPS[mode][sub] };
}

/**
 * Compute a sub-level-aware IQ score.
 * Linear interpolation from the floor at 0% correct to the sub-level cap at
 * 100%. Adult floor is lower (stricter) so a poor performance on the adult
 * test honestly reflects in the score; kid floor stays at 85 so children are
 * never shown a discouraging number.
 */
export function calculateIQ(
  correct: number,
  total: number,
  // age is currently not used in scoring — kept in signature for forward-compat.
  _age: number,
  mode: IqMode = 'kid',
  sub: SubLevel = DEFAULT_SUB_LEVEL,
): number {
  if (total === 0) return 100;
  const ratio = correct / total;
  const { min, max } = iqRangeFor(mode, sub);
  const raw = min + ratio * (max - min);
  return Math.max(MIN_IQ, Math.min(MAX_IQ, Math.round(raw)));
}

/**
 * Build a result from the score.
 * - Kid mode: always positive — even 0% gets a friendly title.
 * - Adult mode: stricter — thresholds are raised and low-score messages are
 *   honest rather than coddling, matching the "シビアに判定" stance.
 */
export function scoreToResult(
  correct: number,
  total: number,
  age: number,
  mode: IqMode = 'kid',
  sub: SubLevel = DEFAULT_SUB_LEVEL,
): IqResult {
  const ratio = total === 0 ? 0 : correct / total;
  const iq = calculateIQ(correct, total, age, mode, sub);

  if (mode === 'adult') {
    // Stricter thresholds: 0.95 / 0.8 / 0.6 / 0.4
    if (ratio >= 0.95) return { stars: 5, iq, title: '天才クラス',       message: 'ほぼ完答。メンサ級の冴え。',                color: 'pink',   emoji: '👑' };
    if (ratio >= 0.8)  return { stars: 4, iq, title: '非常に優秀',       message: '論理力・計算力ともにハイレベル。',          color: 'orange', emoji: '🌟' };
    if (ratio >= 0.6)  return { stars: 3, iq, title: '平均より上',       message: 'バランス良好。あと一歩で上位帯。',          color: 'yellow', emoji: '✨' };
    if (ratio >= 0.4)  return { stars: 2, iq, title: '平均的レベル',     message: '基礎は固い。むずかしいに挑戦してみよう。',  color: 'green',  emoji: '🌱' };
    if (ratio >= 0.2)  return { stars: 1, iq, title: '伸びしろあり',     message: '苦手分野を見直すチャンス。',                color: 'blue',   emoji: '📘' };
    return                  { stars: 1, iq, title: '要トレーニング',     message: '基礎から再挑戦を推奨。',                    color: 'blue',   emoji: '🛠️' };
  }

  // Kid mode (positive, ひらがな-heavy)
  if (ratio >= 0.9) return { stars: 5, iq, title: 'ひらめきマスター！',     message: 'すごい！てんさい かもしれない！',   color: 'pink',   emoji: '👑' };
  if (ratio >= 0.7) return { stars: 4, iq, title: 'ひらめき名人！',         message: 'とっても よく できたね！',           color: 'orange', emoji: '🌟' };
  if (ratio >= 0.5) return { stars: 3, iq, title: 'ひらめきハンター！',     message: 'いい かんじ！もう一回 やってみる？',  color: 'yellow', emoji: '✨' };
  if (ratio >= 0.3) return { stars: 2, iq, title: 'ひらめき修行ちゅう！',   message: 'これからが たのしみ！',              color: 'green',  emoji: '🌱' };
  return                 { stars: 1, iq, title: 'ひらめき たんけん隊！',   message: 'チャレンジ えらい！また あそぼう！',  color: 'blue',   emoji: '🧭' };
}
