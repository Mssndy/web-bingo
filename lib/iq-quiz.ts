/**
 * Kid-friendly "ひらめき診断" (IQ-style) quiz problems.
 * Problems are visual and age-tuned so 3〜12 year olds can play.
 *
 * Difficulty buckets by age:
 *   - 3〜5  → easy   : counting / odd-one-out / 2-color patterns
 *   - 6〜8  → medium : 3-symbol patterns / number sequences / size order
 *   - 9〜12 → hard   : longer sequences / simple logic / arithmetic
 */

export type IqDifficulty = 'easy' | 'medium' | 'hard';

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
  | 'pattern'      // つぎはどれ？  ○●○●○?
  | 'odd-one-out'  // なかまはずれ
  | 'count'        // いくつある？
  | 'sequence'     // すうじのつづき
  | 'size-order'   // いちばん大きいのは？
  | 'logic';       // ちょっとかんがえる

// ── Difficulty mapping ───────────────────────────────────────────────────────

export function difficultyForAge(age: number): IqDifficulty {
  if (age <= 5) return 'easy';
  if (age <= 8) return 'medium';
  return 'hard';
}

/** Available session lengths — kids pick one before starting. */
export const QUIZ_LENGTH_OPTIONS = [5, 10, 15] as const;
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

function genByKind(kind: IqProblemKind, diff: IqDifficulty): IqProblem {
  switch (kind) {
    case 'pattern':     return genPattern(diff);
    case 'odd-one-out': return genOddOneOut(diff);
    case 'count':       return genCount(diff);
    case 'sequence':    return genSequence(diff);
    case 'size-order':  return genSizeOrder();
    case 'logic':       return genLogic(diff);
  }
}

/** Build a kind menu sized to fit `count` problems with a varied mix. */
function buildKindMenu(diff: IqDifficulty, count: number): IqProblemKind[] {
  const base: IqProblemKind[] =
    diff === 'easy'
      ? ['count', 'odd-one-out', 'pattern', 'size-order']
      : diff === 'medium'
      ? ['pattern', 'sequence', 'count', 'odd-one-out', 'size-order', 'logic']
      : ['sequence', 'pattern', 'logic', 'odd-one-out', 'size-order'];

  // Repeat the base list enough times to cover `count`, then shuffle & slice.
  const reps = Math.ceil(count / base.length) + 1;
  const expanded: IqProblemKind[] = [];
  for (let r = 0; r < reps; r++) expanded.push(...base);
  return shuffle(expanded).slice(0, count);
}

/**
 * Generate a fresh quiz of `count` problems matched to the player's age.
 * Problems are guaranteed unique within the session (by content signature) —
 * if a generated problem collides with one already chosen, we retry up to
 * DEDUPE_MAX_TRIES, then accept the duplicate rather than loop forever.
 */
export function generateQuiz(age: number, count: number = DEFAULT_QUIZ_LENGTH): IqProblem[] {
  const diff = difficultyForAge(age);
  const kinds = buildKindMenu(diff, count);
  const seen = new Set<string>();
  const out: IqProblem[] = [];

  for (const kind of kinds) {
    let problem = genByKind(kind, diff);
    let tries = 0;
    while (seen.has(problemSignature(problem)) && tries < DEDUPE_MAX_TRIES) {
      problem = genByKind(kind, diff);
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

// IQ score floor / ceiling — caps keep the result kind & believable.
const MIN_IQ = 85;
const MAX_IQ = 160;

/**
 * Compute a fun, kid-friendly IQ score.
 * Mean target ≈ 100, scaled by (correctRatio - 0.5) and a difficulty bonus so
 * older kids tackling harder problems get a higher ceiling. Always clamped to
 * [MIN_IQ, MAX_IQ] so a child never sees a discouraging number.
 */
export function calculateIQ(correct: number, total: number, age: number): number {
  if (total === 0) return 100;
  const ratio = correct / total;
  const diff  = difficultyForAge(age);
  const diffBonus = diff === 'easy' ? 0 : diff === 'medium' ? 5 : 10;
  // 0% → 75, 50% → 100, 100% → 140 (then +bonus)
  const raw = 75 + ratio * 65 + diffBonus;
  // Round to nearest whole number, clamp.
  return Math.max(MIN_IQ, Math.min(MAX_IQ, Math.round(raw)));
}

/**
 * Build a positive, age-aware result from the score (always supportive — never
 * make a child feel they "failed").  Stars scale with the proportion correct.
 */
export function scoreToResult(correct: number, total: number, age: number): IqResult {
  const ratio = total === 0 ? 0 : correct / total;
  const iq = calculateIQ(correct, total, age);

  if (ratio >= 0.9) {
    return {
      stars: 5, iq,
      title: 'ひらめきマスター！',
      message: 'すごい！てんさい かもしれない！',
      color: 'pink', emoji: '👑',
    };
  }
  if (ratio >= 0.7) {
    return {
      stars: 4, iq,
      title: 'ひらめき名人！',
      message: 'とっても よく できたね！',
      color: 'orange', emoji: '🌟',
    };
  }
  if (ratio >= 0.5) {
    return {
      stars: 3, iq,
      title: 'ひらめきハンター！',
      message: 'いい かんじ！もう一回 やってみる？',
      color: 'yellow', emoji: '✨',
    };
  }
  if (ratio >= 0.3) {
    return {
      stars: 2, iq,
      title: 'ひらめき修行ちゅう！',
      message: 'これからが たのしみ！',
      color: 'green', emoji: '🌱',
    };
  }
  return {
    stars: 1, iq,
    title: 'ひらめき たんけん隊！',
    message: 'チャレンジ えらい！また あそぼう！',
    color: 'blue', emoji: '🧭',
  };
}
