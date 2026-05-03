/**
 * "ひらめき診断" (IQ-style) quiz problems.
 * Two modes:
 *   - kid    : visual, age-tuned so 0〜12 year olds can play
 *   - adult  : text/number-heavy puzzles for grownups
 *
 * Difficulty buckets:
 *   - 0〜5  (kid)   → easy   : counting / odd-one-out / 2-color patterns
 *   - 6〜8  (kid)   → medium : 3-symbol patterns / number sequences / size order
 *   - 9〜12 (kid)   → hard   : longer sequences / simple logic / arithmetic
 *   - adult         → adult  : non-trivial sequences, mental math, multi-step logic
 */

export type IqMode = 'kid' | 'adult';
export type IqDifficulty = 'easy' | 'medium' | 'hard' | 'adult';

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

export function difficultyFor(age: number, mode: IqMode = 'kid'): IqDifficulty {
  if (mode === 'adult') return 'adult';
  if (age <= 5) return 'easy';
  if (age <= 8) return 'medium';
  return 'hard';
}

/** @deprecated use difficultyFor(age, mode) instead. Kept for older callsites. */
export function difficultyForAge(age: number): IqDifficulty {
  return difficultyFor(age, 'kid');
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
function genAdvSequence(): IqProblem {
  type Rule = { name: string; gen: () => { seq: number[]; next: number } };
  const rules: Rule[] = [
    { // ×2 + 1
      name: '×2+1',
      gen: () => {
        const a = randomInt(1, 5);
        const seq = [a];
        for (let i = 0; i < 3; i++) seq.push(seq[i] * 2 + 1);
        return { seq, next: seq[3] * 2 + 1 };
      },
    },
    { // 平方数 n²
      name: 'square',
      gen: () => {
        const start = randomInt(2, 4);
        const seq = [start, start + 1, start + 2, start + 3].map((n) => n * n);
        return { seq, next: (start + 4) * (start + 4) };
      },
    },
    { // Fibonacci-like
      name: 'fib',
      gen: () => {
        const a = randomInt(1, 4), b = randomInt(2, 5);
        const seq = [a, b, a + b, a + 2 * b];
        const next = 2 * a + 3 * b;
        return { seq, next };
      },
    },
    { // 差が増える: a, a+d, a+d+(d+k), …  (d=1,k=1 → +1,+2,+3,+4)
      name: 'incdiff',
      gen: () => {
        const start = randomInt(1, 5);
        const k = randomInt(1, 3);
        const seq = [start];
        let inc = randomInt(1, 3);
        for (let i = 0; i < 3; i++) { seq.push(seq[i] + inc); inc += k; }
        const next = seq[3] + inc;
        return { seq, next };
      },
    },
    { // ×3 - 1
      name: '×3-1',
      gen: () => {
        const a = randomInt(1, 3);
        const seq = [a];
        for (let i = 0; i < 3; i++) seq.push(seq[i] * 3 - 1);
        return { seq, next: seq[3] * 3 - 1 };
      },
    },
  ];

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
function genLetterSeq(): IqProblem {
  // Pick step size; produce a 4-letter sequence whose character codes step by `step`.
  const step = pick([1, 2, 3, 4]);
  const startCode = randomInt(0, 26 - step * 5);
  const codes = [0, 1, 2, 3].map((i) => startCode + step * i);
  const nextCode = startCode + step * 4;
  const toLetter = (c: number) => String.fromCharCode(65 + c);

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

/** Mental arithmetic: 2-digit × 1-digit, or division/squaring. */
function genMentalMath(): IqProblem {
  type Op = { gen: () => { expr: string; ans: number } };
  const ops: Op[] = [
    { gen: () => { // a × b  (a∈11..19, b∈3..9)
      const a = randomInt(11, 19), b = randomInt(3, 9);
      return { expr: `${a} × ${b}`, ans: a * b };
    }},
    { gen: () => { // a × a  (a∈12..19)
      const a = randomInt(12, 19);
      return { expr: `${a}²`, ans: a * a };
    }},
    { gen: () => { // a ÷ b  (always integer)
      const b = randomInt(3, 12), q = randomInt(6, 15);
      const a = b * q;
      return { expr: `${a} ÷ ${b}`, ans: q };
    }},
    { gen: () => { // a + b - c
      const a = randomInt(40, 90), b = randomInt(20, 60), c = randomInt(10, 50);
      return { expr: `${a} + ${b} - ${c}`, ans: a + b - c };
    }},
  ];
  const { expr, ans } = pick(ops).gen();
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

/** Multi-step transitive logic with 4 items: A>B, B>C, C>D ⇒ rank query. */
function genLongLogic(): IqProblem {
  const names = shuffle(['A', 'B', 'C', 'D']);
  const [first, second, third, fourth] = names; // largest → smallest
  const lines = [
    `${first} は ${second} より大きい`,
    `${second} は ${third} より大きい`,
    `${third} は ${fourth} より大きい`,
  ];
  // Ask one of: largest / smallest / 2nd / 3rd
  type Q = { ask: string; ans: string };
  const queries: Q[] = [
    { ask: '最も大きいのは？',     ans: first },
    { ask: '最も小さいのは？',     ans: fourth },
    { ask: '2番目に大きいのは？',  ans: second },
    { ask: '3番目に大きいのは？',  ans: third },
  ];
  const q = pick(queries);
  const distractors = ['A', 'B', 'C', 'D'].filter((n) => n !== q.ans);

  return {
    id: `longlogic-${Date.now()}-${Math.random()}`,
    kind: 'long-logic',
    prompt: q.ask,
    visual: lines,
    choices: makeChoices(q.ans, distractors),
  };
}

/** Word analogy:  A : B = C : ?  Choose the word that matches the relationship. */
function genAnalogy(): IqProblem {
  type Quad = { a: string; b: string; c: string; d: string; distractors: string[] };
  const quads: Quad[] = [
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
  const q = pick(quads);
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

function genByKind(kind: IqProblemKind, diff: IqDifficulty): IqProblem {
  switch (kind) {
    case 'pattern':       return genPattern(diff);
    case 'odd-one-out':   return genOddOneOut(diff);
    case 'count':         return genCount(diff);
    case 'sequence':      return genSequence(diff);
    case 'size-order':    return genSizeOrder();
    case 'logic':         return genLogic(diff);
    case 'adv-sequence':  return genAdvSequence();
    case 'letter-seq':    return genLetterSeq();
    case 'mental-math':   return genMentalMath();
    case 'long-logic':    return genLongLogic();
    case 'analogy':       return genAnalogy();
  }
}

/** Build a kind menu sized to fit `count` problems with a varied mix. */
function buildKindMenu(diff: IqDifficulty, count: number): IqProblemKind[] {
  const base: IqProblemKind[] =
    diff === 'easy'
      ? ['count', 'odd-one-out', 'pattern', 'size-order']
      : diff === 'medium'
      ? ['pattern', 'sequence', 'count', 'odd-one-out', 'size-order', 'logic']
      : diff === 'hard'
      ? ['sequence', 'pattern', 'logic', 'odd-one-out', 'size-order']
      // adult: the harder, text-heavy kinds
      : ['adv-sequence', 'letter-seq', 'mental-math', 'long-logic', 'analogy'];

  // Repeat the base list enough times to cover `count`, then shuffle & slice.
  const reps = Math.ceil(count / base.length) + 1;
  const expanded: IqProblemKind[] = [];
  for (let r = 0; r < reps; r++) expanded.push(...base);
  return shuffle(expanded).slice(0, count);
}

/**
 * Generate a fresh quiz of `count` problems matched to the player's age & mode.
 * Problems are guaranteed unique within the session (by content signature) —
 * if a generated problem collides with one already chosen, we retry up to
 * DEDUPE_MAX_TRIES, then accept the duplicate rather than loop forever.
 */
export function generateQuiz(
  age: number,
  count: number = DEFAULT_QUIZ_LENGTH,
  mode: IqMode = 'kid',
): IqProblem[] {
  const diff = difficultyFor(age, mode);
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
 * Compute a fun, age/mode-aware IQ score.
 * Mean target ≈ 100. Harder difficulty grants a small bonus so adults & older
 * kids tackling tougher problems can reach a higher ceiling. Always clamped to
 * [MIN_IQ, MAX_IQ] so the player never sees a discouraging number.
 */
export function calculateIQ(
  correct: number,
  total: number,
  age: number,
  mode: IqMode = 'kid',
): number {
  if (total === 0) return 100;
  const ratio = correct / total;
  const diff  = difficultyFor(age, mode);
  const diffBonus =
    diff === 'easy'   ? 0  :
    diff === 'medium' ? 5  :
    diff === 'hard'   ? 10 : 20;  // adult
  // 0% → 75, 50% → 100, 100% → 140 (then +bonus)
  const raw = 75 + ratio * 65 + diffBonus;
  return Math.max(MIN_IQ, Math.min(MAX_IQ, Math.round(raw)));
}

/**
 * Build a positive, age/mode-aware result from the score. Always supportive —
 * even with 0 correct the player sees a friendly title rather than a scolding.
 * Adult mode uses more grown-up phrasing & kanji.
 */
export function scoreToResult(
  correct: number,
  total: number,
  age: number,
  mode: IqMode = 'kid',
): IqResult {
  const ratio = total === 0 ? 0 : correct / total;
  const iq = calculateIQ(correct, total, age, mode);

  if (mode === 'adult') {
    if (ratio >= 0.9) return { stars: 5, iq, title: '天才クラス！', message: 'メンサ級の冴え。素晴らしい！', color: 'pink',   emoji: '👑' };
    if (ratio >= 0.7) return { stars: 4, iq, title: '非常に優秀！',  message: '論理力・計算力ともにハイレベル。',   color: 'orange', emoji: '🌟' };
    if (ratio >= 0.5) return { stars: 3, iq, title: '平均より上！',  message: 'バランス良し。次はもっと上を狙おう。', color: 'yellow', emoji: '✨' };
    if (ratio >= 0.3) return { stars: 2, iq, title: '平均的レベル',  message: '基礎は十分。もう一度挑戦してみよう。', color: 'green',  emoji: '🌱' };
    return                 { stars: 1, iq, title: 'ウォームアップ！', message: '次回はリラックスして挑もう。',         color: 'blue',   emoji: '☕' };
  }

  // Kid mode (positive, ひらがな-heavy)
  if (ratio >= 0.9) return { stars: 5, iq, title: 'ひらめきマスター！',     message: 'すごい！てんさい かもしれない！',   color: 'pink',   emoji: '👑' };
  if (ratio >= 0.7) return { stars: 4, iq, title: 'ひらめき名人！',         message: 'とっても よく できたね！',           color: 'orange', emoji: '🌟' };
  if (ratio >= 0.5) return { stars: 3, iq, title: 'ひらめきハンター！',     message: 'いい かんじ！もう一回 やってみる？',  color: 'yellow', emoji: '✨' };
  if (ratio >= 0.3) return { stars: 2, iq, title: 'ひらめき修行ちゅう！',   message: 'これからが たのしみ！',              color: 'green',  emoji: '🌱' };
  return                 { stars: 1, iq, title: 'ひらめき たんけん隊！',   message: 'チャレンジ えらい！また あそぼう！',  color: 'blue',   emoji: '🧭' };
}
