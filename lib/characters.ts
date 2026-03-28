import { shuffle } from './bingo';
import type { ContentType } from './types';

// ── Character sets ───────────────────────────────────────────────────────────

export const HIRAGANA: string[] = [
  'あ','い','う','え','お',
  'か','き','く','け','こ',
  'さ','し','す','せ','そ',
  'た','ち','つ','て','と',
  'な','に','ぬ','ね','の',
  'は','ひ','ふ','へ','ほ',
  'ま','み','む','め','も',
  'や','ゆ','よ',
  'ら','り','る','れ','ろ',
  'わ','を','ん',
];

export const KATAKANA: string[] = [
  'ア','イ','ウ','エ','オ',
  'カ','キ','ク','ケ','コ',
  'サ','シ','ス','セ','ソ',
  'タ','チ','ツ','テ','ト',
  'ナ','ニ','ヌ','ネ','ノ',
  'ハ','ヒ','フ','ヘ','ホ',
  'マ','ミ','ム','メ','モ',
  'ヤ','ユ','ヨ',
  'ラ','リ','ル','レ','ロ',
  'ワ','ヲ','ン',
];

export const ALPHABET: string[] = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
];

/** Romaji reading for each character (used as hint after answer) */
export const ROMAJI: Record<string, string> = {
  // Hiragana
  'あ':'a','い':'i','う':'u','え':'e','お':'o',
  'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
  'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
  'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
  'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
  'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
  'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
  'や':'ya','ゆ':'yu','よ':'yo',
  'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
  'わ':'wa','を':'wo','ん':'n',
  // Katakana (same readings)
  'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',
  'カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
  'サ':'sa','シ':'shi','ス':'su','セ':'se','ソ':'so',
  'タ':'ta','チ':'chi','ツ':'tsu','テ':'te','ト':'to',
  'ナ':'na','ニ':'ni','ヌ':'nu','ネ':'ne','ノ':'no',
  'ハ':'ha','ヒ':'hi','フ':'fu','ヘ':'he','ホ':'ho',
  'マ':'ma','ミ':'mi','ム':'mu','メ':'me','モ':'mo',
  'ヤ':'ya','ユ':'yu','ヨ':'yo',
  'ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro',
  'ワ':'wa','ヲ':'wo','ン':'n',
  // Alphabet: just the letter itself
  'A':'A','B':'B','C':'C','D':'D','E':'E','F':'F','G':'G',
  'H':'H','I':'I','J':'J','K':'K','L':'L','M':'M','N':'N',
  'O':'O','P':'P','Q':'Q','R':'R','S':'S','T':'T','U':'U',
  'V':'V','W':'W','X':'X','Y':'Y','Z':'Z',
};

/** TTS locale for each content type */
export const CHAR_LOCALE: Record<Exclude<ContentType, 'numbers'>, 'ja-JP' | 'en-US'> = {
  hiragana: 'ja-JP',
  katakana: 'ja-JP',
  alphabet: 'en-US',
};

export function getCharSet(type: Exclude<ContentType, 'numbers'>): string[] {
  if (type === 'hiragana') return HIRAGANA;
  if (type === 'katakana') return KATAKANA;
  return ALPHABET;
}

// ── Character bingo card ─────────────────────────────────────────────────────

export interface CharBingoCard {
  cells: (string | 'FREE')[][];
  marked: boolean[][];
}

/** Generate a 5×5 character bingo card (24 chars + FREE center) */
export function generateCharBingoCard(chars: string[]): CharBingoCard {
  const picked = shuffle([...chars]).slice(0, 24);
  const cells: (string | 'FREE')[][] = [];
  const marked: boolean[][] = [];
  let idx = 0;
  for (let r = 0; r < 5; r++) {
    cells.push([]);
    marked.push([]);
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        cells[r].push('FREE');
        marked[r].push(true);
      } else {
        cells[r].push(picked[idx++]);
        marked[r].push(false);
      }
    }
  }
  return { cells, marked };
}

export function isCharOnCard(card: CharBingoCard, ch: string): boolean {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (card.cells[r][c] === ch && !card.marked[r][c]) return true;
    }
  }
  return false;
}

export function markChar(card: CharBingoCard, ch: string): CharBingoCard {
  const marked = card.marked.map((row) => [...row]);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (card.cells[r][c] === ch) marked[r][c] = true;
    }
  }
  return { ...card, marked };
}

export function checkCharBingo(card: CharBingoCard): boolean {
  const { marked } = card;
  for (let r = 0; r < 5; r++) {
    if (marked[r].every(Boolean)) return true;
  }
  for (let c = 0; c < 5; c++) {
    if (marked.every((row) => row[c])) return true;
  }
  if ([0, 1, 2, 3, 4].every((i) => marked[i][i])) return true;
  if ([0, 1, 2, 3, 4].every((i) => marked[i][4 - i])) return true;
  return false;
}

import type { LineSegment } from '@/lib/types';

export function getCharCompletedLineSegments(card: CharBingoCard): LineSegment[] {
  const { marked } = card;
  const segs: LineSegment[] = [];
  for (let r = 0; r < 5; r++) {
    if (marked[r].every(Boolean)) segs.push({ r1: r, c1: 0, r2: r, c2: 4 });
  }
  for (let c = 0; c < 5; c++) {
    if (marked.every((row) => row[c])) segs.push({ r1: 0, c1: c, r2: 4, c2: c });
  }
  if ([0, 1, 2, 3, 4].every((i) => marked[i][i])) segs.push({ r1: 0, c1: 0, r2: 4, c2: 4 });
  if ([0, 1, 2, 3, 4].every((i) => marked[i][4 - i])) segs.push({ r1: 0, c1: 4, r2: 4, c2: 0 });
  return segs;
}

export function getCharBingoLines(card: CharBingoCard): Set<string> {
  const { marked } = card;
  const hits = new Set<string>();
  const add = (r: number, c: number) => hits.add(`${r},${c}`);

  for (let r = 0; r < 5; r++) {
    if (marked[r].every(Boolean)) {
      for (let c = 0; c < 5; c++) add(r, c);
    }
  }
  for (let c = 0; c < 5; c++) {
    if (marked.every((row) => row[c])) {
      for (let r = 0; r < 5; r++) add(r, c);
    }
  }
  if ([0, 1, 2, 3, 4].every((i) => marked[i][i])) {
    [0, 1, 2, 3, 4].forEach((i) => add(i, i));
  }
  if ([0, 1, 2, 3, 4].every((i) => marked[i][4 - i])) {
    [0, 1, 2, 3, 4].forEach((i) => add(i, 4 - i));
  }
  return hits;
}

// ── Character game state ─────────────────────────────────────────────────────

export interface CharGameState {
  remainingChars: string[];
  drawnChars: string[];
  currentChar: string | null;
  bingoCard: CharBingoCard | null;
  isGameOver: boolean;
}

export function createInitialCharGameState(
  chars: string[],
  card: CharBingoCard | null = null
): CharGameState {
  return {
    remainingChars: shuffle([...chars]),
    drawnChars: [],
    currentChar: null,
    bingoCard: card,
    isGameOver: false,
  };
}

export function drawNextChar(state: CharGameState): CharGameState {
  if (state.remainingChars.length === 0) {
    return { ...state, isGameOver: true };
  }
  const [next, ...rest] = state.remainingChars;
  return {
    ...state,
    remainingChars: rest,
    drawnChars: [...state.drawnChars, next],
    currentChar: next,
    isGameOver: rest.length === 0,
  };
}

/** Generate 4 multiple-choice options including the correct answer */
export function generateCharChoices(correct: string, allChars: string[]): string[] {
  const others = shuffle(allChars.filter((c) => c !== correct));
  return shuffle([correct, ...others.slice(0, 3)]);
}
