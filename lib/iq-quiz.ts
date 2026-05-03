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

// ── Time limit per problem ───────────────────────────────────────────────────
//
// Per-problem time limit (in seconds), tuned by problem kind, mode, and sub-
// level. Computation feels like an IQ test: harder problems and adult mode
// give tighter limits. Kid mode is generous. Timeout = wrong answer.

const TIME_BASE_SEC: Record<IqProblemKind, number> = {
  count:          7,
  pattern:        9,
  sequence:       10,
  'size-order':   6,
  'odd-one-out':  7,
  logic:          12,
  'adv-sequence': 14,
  'letter-seq':   12,
  'mental-math':  16,
  'long-logic':   20,
  'analogy':      14,
};

/** Seconds the player has to answer this problem. */
export function timeFor(kind: IqProblemKind, mode: IqMode, sub: SubLevel = DEFAULT_SUB_LEVEL): number {
  const base = TIME_BASE_SEC[kind];
  // Sub-level multiplier — easier sub gets more time, harder gets less.
  const subMult = sub === 'easy' ? 1.5 : sub === 'normal' ? 1.0 : 0.75;
  // Kid mode is gentler (extra 40% time on top).
  const modeMult = mode === 'kid' ? 1.4 : 1.0;
  return Math.max(4, Math.round(base * subMult * modeMult));
}

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
  { name: 'product-prev',  // a, b, a*b, b*(a*b), …  (insight: each term = previous two multiplied)
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

// ── Symbolic transformation analogy ────────────────────────────────────────
// Pure-insight version: shows a transformation on one symbol string and asks
// the player to apply the SAME transformation to a fresh string. No external
// vocabulary or factual knowledge is required — only pattern recognition.

type AnalogyTransform = {
  name: string;
  apply: (chars: string[]) => string[];
};

const ANALOGY_TRANSFORMS: AnalogyTransform[] = [
  { name: 'reverse',
    apply: (c) => [...c].reverse() },
  { name: 'shift-left',
    apply: (c) => [...c.slice(1), c[0]] },
  { name: 'shift-right',
    apply: (c) => [c[c.length - 1], ...c.slice(0, -1)] },
  { name: 'swap-pairs',
    apply: (c) => {
      const out = [...c];
      for (let i = 0; i + 1 < out.length; i += 2) [out[i], out[i + 1]] = [out[i + 1], out[i]];
      return out;
    } },
  { name: 'each-doubled',
    apply: (c) => c.flatMap((x) => [x, x]) },
  { name: 'mirror',
    apply: (c) => [...c, ...[...c].reverse()] },
  { name: 'rotate-2',
    apply: (c) => [...c.slice(2), ...c.slice(0, 2)] },
];

// Pairs of character sets — A→B problems use one set, C→D uses the other so
// the player can't shortcut by recognizing characters; only the rule transfers.
const ANALOGY_SETS: readonly (readonly string[])[] = [
  ['○', '△', '□', '◇'],
  ['●', '▲', '■', '◆'],
  ['1', '2', '3', '4'],
  ['5', '6', '7', '8'],
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['あ', 'い', 'う', 'え'],
  ['か', 'き', 'く', 'け'],
  ['☆', '♡', '♪', '♭'],
  ['★', '♥', '♫', '♯'],
];

/** Mutate one character of `arr` to a different one (used for distractors). */
function swapTwoChars(arr: string[]): string[] {
  if (arr.length < 2) return arr;
  const i = Math.floor(Math.random() * (arr.length - 1));
  const out = [...arr];
  [out[i], out[i + 1]] = [out[i + 1], out[i]];
  return out;
}

/** Symbolic transformation analogy. Insight-only: no vocabulary required. */
function genAnalogy(sub: SubLevel): IqProblem {
  // Restrict transform pool by sub-level. Easy: simple; Hard: anything goes.
  const easyNames = new Set(['reverse', 'shift-left', 'each-doubled']);
  const normalNames = new Set(['reverse', 'shift-left', 'shift-right', 'swap-pairs', 'each-doubled', 'mirror']);
  const transforms =
    sub === 'easy'   ? ANALOGY_TRANSFORMS.filter((t) => easyNames.has(t.name)) :
    sub === 'normal' ? ANALOGY_TRANSFORMS.filter((t) => normalNames.has(t.name)) :
                       ANALOGY_TRANSFORMS;

  // Token length: easy=3, normal=3, hard=4
  const len = sub === 'hard' ? 4 : 3;

  // Try a few times to avoid degenerate problems (e.g., palindrome where
  // reverse == identity, or transforms that collide on this input).
  for (let attempt = 0; attempt < 8; attempt++) {
    const T = transforms[Math.floor(Math.random() * transforms.length)];
    // Use 2 different sets so input1 chars don't tip off input2's answer
    const set1 = ANALOGY_SETS[Math.floor(Math.random() * ANALOGY_SETS.length)];
    let set2 = ANALOGY_SETS[Math.floor(Math.random() * ANALOGY_SETS.length)];
    if (set2 === set1) set2 = ANALOGY_SETS[(ANALOGY_SETS.indexOf(set1) + 1) % ANALOGY_SETS.length];

    const input1 = shuffle([...set1]).slice(0, len);
    const output1 = T.apply(input1);
    if (input1.join('') === output1.join('')) continue;  // identity case

    const input2 = shuffle([...set2]).slice(0, len);
    const output2 = T.apply(input2);
    if (input2.join('') === output2.join('')) continue;

    const correct = output2.join(' ');

    // Build same-length distractors by perturbing the correct answer.
    const distractorPool = new Set<string>();
    distractorPool.add(swapTwoChars(output2).join(' '));            // adjacent swap
    distractorPool.add([...output2].reverse().join(' '));            // reversed
    distractorPool.add(input2.join(' '));                            // raw input (no transform)
    distractorPool.add(shuffle([...output2]).join(' '));             // random permutation
    distractorPool.delete(correct);
    const distractors = shuffle([...distractorPool]).slice(0, 3);
    if (distractors.length < 3) continue;  // try again

    return {
      id: `analogy-${Date.now()}-${Math.random()}`,
      kind: 'analogy',
      prompt: '左の規則を見抜いて、? を答えてください',
      visual: [
        `${input1.join(' ')}   →   ${output1.join(' ')}`,
        `${input2.join(' ')}   →   ?`,
      ],
      choices: makeChoices(correct, distractors),
    };
  }

  // Fallback (very unlikely to hit): trivial reverse problem
  const T = ANALOGY_TRANSFORMS[0];  // reverse
  const input1 = ['○', '△', '□'], input2 = ['●', '▲', '■'];
  const output1 = T.apply(input1), output2 = T.apply(input2);
  return {
    id: `analogy-fallback-${Date.now()}`,
    kind: 'analogy',
    prompt: '左の規則を見抜いて、? を答えてください',
    visual: [`${input1.join(' ')}   →   ${output1.join(' ')}`, `${input2.join(' ')}   →   ?`],
    choices: makeChoices(output2.join(' '), [input2.join(' '), '◇ ◆ ☆', '★ ♡ ♥']),
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

// ── Adaptive (one-at-a-time) generation ─────────────────────────────────────
//
// For adaptive IQ tests we generate problems lazily, with a difficulty that
// can change between problems based on the player's running performance.

export interface QuizGenerator {
  /** Pull the next problem at the given sub-level. Returns null when exhausted. */
  next(sub: SubLevel): IqProblem | null;
  /** How many problems remain in the session budget. */
  remaining(): number;
}

/**
 * Build a stateful generator for one quiz session. Maintains its own dedupe
 * set across `next()` calls so problems never repeat within a session.
 */
export function makeQuizGenerator(
  age: number,
  total: number,
  mode: IqMode = 'kid',
): QuizGenerator {
  const seen = new Set<string>();
  const kinds = kindMenuFor(age, mode);
  let produced = 0;

  return {
    next(sub: SubLevel): IqProblem | null {
      if (produced >= total) return null;
      const param = paramFor(mode, sub);
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      let problem = genByKind(kind, param, sub);
      let tries = 0;
      while (seen.has(problemSignature(problem)) && tries < DEDUPE_MAX_TRIES) {
        problem = genByKind(kind, param, sub);
        tries++;
      }
      seen.add(problemSignature(problem));
      produced++;
      return problem;
    },
    remaining: () => total - produced,
  };
}

export interface AnswerEntry {
  /** The sub-level the problem was asked at. */
  sub: SubLevel;
  /** Whether the player got it right (timeouts count as wrong). */
  correct: boolean;
}

/**
 * Adaptive difficulty step. Looks at the last two answers:
 *   - 2 correct in a row  → bump up (easy → normal → hard)
 *   - 2 wrong in a row    → bump down (hard → normal → easy)
 *   - mixed / first answer → stay
 */
export function nextSubLevel(current: SubLevel, history: AnswerEntry[]): SubLevel {
  if (history.length < 2) return current;
  const ladder: SubLevel[] = ['easy', 'normal', 'hard'];
  const idx = ladder.indexOf(current);
  const last2 = history.slice(-2);
  const allCorrect = last2.every((h) => h.correct);
  const allWrong   = last2.every((h) => !h.correct);
  if (allCorrect && idx < ladder.length - 1) return ladder[idx + 1];
  if (allWrong   && idx > 0)                  return ladder[idx - 1];
  return current;
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

/**
 * Adaptive scoring: derive an IQ from the per-problem difficulty trajectory.
 * The "achieved" sub-level is the highest level the player solved with ≥ 50%
 * accuracy; that level's cap bounds the IQ. Overall accuracy then determines
 * where in the floor→cap range the player lands.
 *
 * Falls back gracefully when the player only attempted one level.
 */
export function adaptiveScoreToResult(
  history: AnswerEntry[],
  age: number,
  mode: IqMode = 'kid',
): IqResult {
  if (history.length === 0) return scoreToResult(0, 0, age, mode);

  // Per-level accuracy
  const buckets: Record<SubLevel, { correct: number; total: number }> = {
    easy:   { correct: 0, total: 0 },
    normal: { correct: 0, total: 0 },
    hard:   { correct: 0, total: 0 },
  };
  for (const h of history) {
    buckets[h.sub].total++;
    if (h.correct) buckets[h.sub].correct++;
  }

  // Achieved sub-level = highest level with ≥ 50% accuracy and at least 1 attempt.
  const passed = (b: { correct: number; total: number }) => b.total > 0 && b.correct / b.total >= 0.5;
  let achieved: SubLevel = 'easy';
  if (passed(buckets.normal)) achieved = 'normal';
  if (passed(buckets.hard))   achieved = 'hard';

  const totalCorrect = history.filter((h) => h.correct).length;
  return scoreToResult(totalCorrect, history.length, age, mode, achieved);
}
