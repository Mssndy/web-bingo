/**
 * しりとり ミニゲームのロジック。
 * 子供向けに「絵カード3択」で遊ぶため、自由入力はせず辞書から候補を出す。
 *
 * 連結ルール（子供向けに単純化）:
 *  - ことばの「さいごの文字」から、つぎのことばが「はじまる」。
 *  - 辞書のことばは すべて 末尾が ふつうの かな（小さい字・ー・ん を末尾に持たない）になるよう厳選。
 *  - 「ん」で おわる ことばは 辞書に入れない（＝負けない・やさしい設計）。
 */

export interface ShiritoriWord {
  /** ひらがな表記（読み・表示・連結キーすべてに使う） */
  kana: string;
  /** 絵として見せる絵文字 */
  emoji: string;
}

/** 子供になじみのある名詞だけを集めた辞書。末尾は startable な かな に限定。 */
const WORDS: ShiritoriWord[] = [
  // あ行
  { kana: 'あり',   emoji: '🐜' },
  { kana: 'あめ',   emoji: '🍬' },
  { kana: 'あし',   emoji: '🦶' },
  { kana: 'いぬ',   emoji: '🐕' },
  { kana: 'いす',   emoji: '🪑' },
  { kana: 'いちご', emoji: '🍓' },
  { kana: 'いか',   emoji: '🦑' },
  { kana: 'うし',   emoji: '🐄' },
  { kana: 'うま',   emoji: '🐎' },
  { kana: 'うみ',   emoji: '🌊' },
  { kana: 'えき',   emoji: '🚉' },
  { kana: 'えんぴつ', emoji: '✏️' },
  { kana: 'おに',   emoji: '👹' },
  { kana: 'おにぎり', emoji: '🍙' },
  { kana: 'おかし', emoji: '🍪' },
  // か行
  { kana: 'かさ',   emoji: '☂️' },
  { kana: 'かに',   emoji: '🦀' },
  { kana: 'かめ',   emoji: '🐢' },
  { kana: 'かき',   emoji: '🍊' },
  { kana: 'きつね', emoji: '🦊' },
  { kana: 'きのこ', emoji: '🍄' },
  { kana: 'きく',   emoji: '🌼' },
  { kana: 'くつ',   emoji: '👟' },
  { kana: 'くま',   emoji: '🐻' },
  { kana: 'くち',   emoji: '👄' },
  { kana: 'くるま', emoji: '🚗' },
  { kana: 'けむし', emoji: '🐛' },
  { kana: 'こま',   emoji: '🪀' },
  { kana: 'こめ',   emoji: '🍚' },
  { kana: 'ごりら', emoji: '🦍' },
  // さ行
  { kana: 'さる',   emoji: '🐒' },
  { kana: 'さかな', emoji: '🐟' },
  { kana: 'さくら', emoji: '🌸' },
  { kana: 'しか',   emoji: '🦌' },
  { kana: 'しお',   emoji: '🧂' },
  { kana: 'すいか', emoji: '🍉' },
  { kana: 'すし',   emoji: '🍣' },
  { kana: 'すずめ', emoji: '🐦' },
  { kana: 'せみ',   emoji: '🦗' },
  { kana: 'そら',   emoji: '🌌' },
  { kana: 'そり',   emoji: '🛷' },
  // た行
  { kana: 'たこ',   emoji: '🐙' },
  { kana: 'たまご', emoji: '🥚' },
  { kana: 'たいこ', emoji: '🥁' },
  { kana: 'ちょう', emoji: '🦋' },
  { kana: 'ちず',   emoji: '🗺️' },
  { kana: 'つき',   emoji: '🌙' },
  { kana: 'つる',   emoji: '🐦' },
  { kana: 'てがみ', emoji: '✉️' },
  { kana: 'てぶくろ', emoji: '🧤' },
  { kana: 'とり',   emoji: '🐤' },
  { kana: 'とけい', emoji: '🕐' },
  { kana: 'とまと', emoji: '🍅' },
  { kana: 'とら',   emoji: '🐯' },
  // な行
  { kana: 'なす',   emoji: '🍆' },
  { kana: 'なつ',   emoji: '☀️' },
  { kana: 'なみ',   emoji: '🌊' },
  { kana: 'にわとり', emoji: '🐔' },
  { kana: 'にく',   emoji: '🍖' },
  { kana: 'ぬいぐるみ', emoji: '🧸' },
  { kana: 'ねこ',   emoji: '🐱' },
  { kana: 'ねずみ', emoji: '🐭' },
  { kana: 'のり',   emoji: '🍙' },
  // は行
  { kana: 'はな',   emoji: '🌸' },
  { kana: 'はち',   emoji: '🐝' },
  { kana: 'はさみ', emoji: '✂️' },
  { kana: 'はと',   emoji: '🕊️' },
  { kana: 'ひこうき', emoji: '✈️' },
  { kana: 'ひまわり', emoji: '🌻' },
  { kana: 'ふね',   emoji: '⛵' },
  { kana: 'ふく',   emoji: '👕' },
  { kana: 'へや',   emoji: '🚪' },
  { kana: 'ほし',   emoji: '⭐' },
  { kana: 'ほね',   emoji: '🦴' },
  // ま行
  { kana: 'まめ',   emoji: '🫘' },
  { kana: 'まつ',   emoji: '🌲' },
  { kana: 'みみ',   emoji: '👂' },
  { kana: 'みそ',   emoji: '🍲' },
  { kana: 'むし',   emoji: '🐛' },
  { kana: 'めがね', emoji: '👓' },
  { kana: 'めだか', emoji: '🐟' },
  { kana: 'もも',   emoji: '🍑' },
  { kana: 'もり',   emoji: '🌳' },
  // や行
  { kana: 'やま',   emoji: '⛰️' },
  { kana: 'やね',   emoji: '🏠' },
  { kana: 'やさい', emoji: '🥬' },
  { kana: 'ゆき',   emoji: '⛄' },
  { kana: 'ゆめ',   emoji: '💭' },
  { kana: 'よる',   emoji: '🌃' },
  { kana: 'よっと', emoji: '⛵' },
  // ら行・わ
  { kana: 'らっこ', emoji: '🦦' },
  { kana: 'らくだ', emoji: '🐫' },
  { kana: 'りす',   emoji: '🐿️' },
  { kana: 'りんご', emoji: '🍎' },
  { kana: 'ろうそく', emoji: '🕯️' },
  { kana: 'ろぼっと', emoji: '🤖' },
  { kana: 'わに',   emoji: '🐊' },
  { kana: 'わし',   emoji: '🦅' },
];

/** 小さいかな・濁点を、しりとり連結のために基本かなへ寄せる正規化テーブル */
const NORMALIZE: Record<string, string> = {
  // 小書き
  ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お',
  ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', っ: 'つ', ゎ: 'わ',
};

/** 連結に使う「先頭の音」を返す（小書き正規化のみ。濁点は厳密一致を保つ） */
export function headKana(word: ShiritoriWord): string {
  const c = word.kana[0];
  return NORMALIZE[c] ?? c;
}

/** 連結に使う「末尾の音」を返す。長音「ー」は手前の母音、小書きは正規化。 */
export function tailKana(word: ShiritoriWord): string {
  const k = word.kana;
  const last = k[k.length - 1];
  if (NORMALIZE[last]) return NORMALIZE[last];
  return last;
}

/** ことばが すでに使われているか（kana で判定） */
function isUsed(word: ShiritoriWord, usedKana: Set<string>): boolean {
  return usedKana.has(word.kana);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** ゲーム開始のことば。続きが豊富になるよう、末尾が よく使われる音のものを優先。 */
export function pickStartWord(): ShiritoriWord {
  // 末尾の音ごとの「次に続けられる語数」を数え、候補が3つ以上ある語から選ぶ
  const candidates = WORDS.filter((w) => countStartingWith(tailKana(w), new Set([w.kana])) >= 3);
  const pool = candidates.length > 0 ? candidates : WORDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 指定の音から はじまる、未使用のことば数 */
function countStartingWith(kana: string, usedKana: Set<string>): number {
  return WORDS.filter((w) => headKana(w) === kana && !isUsed(w, usedKana)).length;
}

/** 指定の音から はじまる、未使用のことばを1つ返す（なければ null） */
export function findNextWord(fromKana: string, usedKana: Set<string>): ShiritoriWord | null {
  const matches = WORDS.filter((w) => headKana(w) === fromKana && !isUsed(w, usedKana));
  if (matches.length === 0) return null;
  return matches[Math.floor(Math.random() * matches.length)];
}

export interface ShiritoriChoices {
  /** 並べる3つの選択肢（正解1＋ダミー2、シャッフル済み） */
  options: ShiritoriWord[];
  /** 正解のことば（fromKana から はじまる未使用語）。なければ null＝続けられない */
  answer: ShiritoriWord | null;
}

/**
 * プレイヤーに見せる3択を作る。
 * 正解 = fromKana から はじまる未使用語を1つ。
 * ダミー = fromKana から はじまらない語を2つ（紛らわしさのため未使用優先）。
 */
export function buildChoices(fromKana: string, usedKana: Set<string>): ShiritoriChoices {
  const answer = findNextWord(fromKana, usedKana);
  if (!answer) return { options: [], answer: null };

  const distractorPool = shuffle(
    WORDS.filter((w) => headKana(w) !== fromKana && w.kana !== answer.kana),
  );
  // 未使用を優先しつつ2つ取る
  const unused = distractorPool.filter((w) => !isUsed(w, usedKana));
  const distractors = (unused.length >= 2 ? unused : distractorPool).slice(0, 2);

  return { options: shuffle([answer, ...distractors]), answer };
}
