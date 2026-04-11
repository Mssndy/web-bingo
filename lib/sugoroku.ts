// ── すごろく ボードゲームロジック ─────────────────────────────────────────────

export type SquareType = 'start' | 'normal' | 'lucky' | 'bad' | 'minigame' | 'goal';
export type MiniGameType = 'janken' | 'trump';

export const BOARD_SIZE = 100; // 0〜99

export interface SugorokuSquare {
  id: number;
  type: SquareType;
  row: number;  // CSS grid row (1=top, 10=bottom)
  col: number;  // CSS grid column (1=left, 10=right)
  dir: '→' | '←' | '↑'; // 進む方向
}

/**
 * 10×10蛇行ボード
 *
 * row=1 (top): 99←90
 * row=2:       80→89
 * ...
 * row=9:       10←19
 * row=10 (bot): 0→9   START=0, GOAL=99
 */
function squarePos(id: number): { row: number; col: number; dir: '→' | '←' | '↑' } {
  const rowFromBottom = Math.floor(id / 10); // 0=bottom, 9=top
  const colInRow = id % 10;
  const isLTR = rowFromBottom % 2 === 0;     // 偶数段=左から右
  const col = (isLTR ? colInRow : 9 - colInRow) + 1; // 1-indexed
  const row = 10 - rowFromBottom;            // 1-indexed (1=top)

  let dir: '→' | '←' | '↑';
  if (id >= BOARD_SIZE - 1) {
    dir = isLTR ? '→' : '←';
  } else if (isLTR && colInRow === 9) {
    dir = '↑'; // 右端: 上へ折り返す
  } else if (!isLTR && colInRow === 0) {
    dir = '↑'; // 左端: 上へ折り返す
  } else {
    dir = isLTR ? '→' : '←';
  }
  return { row, col, dir };
}

export const BOARD: SugorokuSquare[] = Array.from({ length: BOARD_SIZE }, (_, id) => {
  const { row, col, dir } = squarePos(id);
  let type: SquareType = 'normal';
  if (id === 0)                   type = 'start';
  else if (id === BOARD_SIZE - 1) type = 'goal';
  else if ([7, 22, 37, 52, 67, 82].includes(id))   type = 'lucky';
  else if ([14, 33, 56, 77].includes(id))           type = 'bad';
  else if ([10, 29, 48, 69, 88].includes(id))       type = 'minigame';
  return { id, type, row, col, dir };
});

// ── プレイヤー ────────────────────────────────────────────────────────────────

export const CPU_NAMES  = ['サクラ', 'モモ', 'ユキ'];
export const CPU_COLORS = ['#ff6b9d', '#ff922b', '#4d96ff'];
export const CPU_EMOJIS = ['🌸', '🍑', '❄️'];
export const HUMAN_COLOR = '#ffd93d';
export const HUMAN_EMOJI = '⭐';

export interface SugorokuPlayer {
  id: number;
  name: string;
  color: string;
  emoji: string;
  position: number;
  isHuman: boolean;
  isFinished: boolean;
  rank: number | null;
}

export function createPlayers(humanName: string): SugorokuPlayer[] {
  return [
    { id: 0, name: humanName,    color: HUMAN_COLOR,    emoji: HUMAN_EMOJI,    position: 0, isHuman: true,  isFinished: false, rank: null },
    { id: 1, name: CPU_NAMES[0], color: CPU_COLORS[0],  emoji: CPU_EMOJIS[0],  position: 0, isHuman: false, isFinished: false, rank: null },
    { id: 2, name: CPU_NAMES[1], color: CPU_COLORS[1],  emoji: CPU_EMOJIS[1],  position: 0, isHuman: false, isFinished: false, rank: null },
    { id: 3, name: CPU_NAMES[2], color: CPU_COLORS[2],  emoji: CPU_EMOJIS[2],  position: 0, isHuman: false, isFinished: false, rank: null },
  ];
}

// ── サイコロ ──────────────────────────────────────────────────────────────────

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// ── 移動 ──────────────────────────────────────────────────────────────────────

export function clampPosition(pos: number): number {
  return Math.max(0, Math.min(BOARD_SIZE - 1, pos));
}

export function getSquare(position: number): SugorokuSquare {
  return BOARD[clampPosition(position)];
}

// ── ミニゲーム ────────────────────────────────────────────────────────────────

export function pickMiniGame(): MiniGameType {
  return Math.random() < 0.5 ? 'janken' : 'trump';
}

// ── トランプ ──────────────────────────────────────────────────────────────────

export function drawTrumpCard(): number {
  return Math.floor(Math.random() * 13) + 1;
}

export function trumpCardLabel(n: number): string {
  if (n === 1)  return 'A';
  if (n === 11) return 'J';
  if (n === 12) return 'Q';
  if (n === 13) return 'K';
  return String(n);
}

export function trumpCardSuit(): string {
  const suits = ['♠', '♥', '♦', '♣'];
  return suits[Math.floor(Math.random() * suits.length)];
}

// ── マス色 & テキスト ─────────────────────────────────────────────────────────

export const SQUARE_STYLE: Record<SquareType, { bg: string; border: string; emoji: string }> = {
  start:    { bg: 'linear-gradient(135deg,#ffd93d,#ff922b)', border: '#ff922b', emoji: '🚦' },
  normal:   { bg: '#1e293b',                                 border: '#334155', emoji: '' },
  lucky:    { bg: 'linear-gradient(135deg,#ffd93d,#fcc419)', border: '#fcc419', emoji: '⭐' },
  bad:      { bg: 'linear-gradient(135deg,#cc5de8,#9c36b5)', border: '#cc5de8', emoji: '💨' },
  minigame: { bg: 'linear-gradient(135deg,#ff6b9d,#f03e3e)', border: '#ff6b9d', emoji: '🎮' },
  goal:     { bg: 'linear-gradient(135deg,#6bcb77,#2f9e44)', border: '#6bcb77', emoji: '🏆' },
};

export function getSquareEventText(type: SquareType): string {
  switch (type) {
    case 'lucky':    return '⭐ラッキー！5マスすすむ！';
    case 'bad':      return '💨あっ！5マスもどる！';
    case 'minigame': return '🎮ミニゲーム スタート！';
    case 'goal':     return '🏆ゴール！！！';
    default:         return '';
  }
}

export const MINIGAME_WIN_BONUS  = 5;
export const MINIGAME_DRAW_BONUS = 2;
export const LUCKY_BONUS = 5;
export const BAD_PENALTY = 5;
