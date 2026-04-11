// ── すごろく ボードゲームロジック ─────────────────────────────────────────────

export type SquareType = 'start' | 'normal' | 'lucky' | 'bad' | 'minigame' | 'goal';
export type MiniGameType = 'janken' | 'trump';

export interface SugorokuSquare {
  id: number;
  type: SquareType;
  row: number; // 0=top, 3=bottom
  col: number; // 0-4
}

/**
 * 20マス蛇行ボード (4行×5列)
 *
 * Row 0 (top):    19 18 17 16 15   ←
 * Row 1:          10 11 12 13 14   →
 * Row 2:           9  8  7  6  5   ←
 * Row 3 (bottom):  0  1  2  3  4   →  START=0
 */
function squarePos(id: number): { row: number; col: number } {
  if (id <= 4)  return { row: 3, col: id };
  if (id <= 9)  return { row: 2, col: 9 - id };
  if (id <= 14) return { row: 1, col: id - 10 };
  return { row: 0, col: 19 - id };
}

export const BOARD: SugorokuSquare[] = Array.from({ length: 20 }, (_, id) => {
  const { row, col } = squarePos(id);
  let type: SquareType = 'normal';
  if (id === 0)                           type = 'start';
  else if (id === 19)                     type = 'goal';
  else if ([3, 8, 13, 17].includes(id))  type = 'lucky';
  else if ([5, 11].includes(id))         type = 'bad';
  else if ([4, 9, 14].includes(id))      type = 'minigame';
  return { id, type, row, col };
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
    {
      id: 0, name: humanName, color: HUMAN_COLOR, emoji: HUMAN_EMOJI,
      position: 0, isHuman: true, isFinished: false, rank: null,
    },
    {
      id: 1, name: CPU_NAMES[0], color: CPU_COLORS[0], emoji: CPU_EMOJIS[0],
      position: 0, isHuman: false, isFinished: false, rank: null,
    },
    {
      id: 2, name: CPU_NAMES[1], color: CPU_COLORS[1], emoji: CPU_EMOJIS[1],
      position: 0, isHuman: false, isFinished: false, rank: null,
    },
    {
      id: 3, name: CPU_NAMES[2], color: CPU_COLORS[2], emoji: CPU_EMOJIS[2],
      position: 0, isHuman: false, isFinished: false, rank: null,
    },
  ];
}

// ── サイコロ ──────────────────────────────────────────────────────────────────

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// ── 移動 ──────────────────────────────────────────────────────────────────────

export function clampPosition(pos: number): number {
  return Math.max(0, Math.min(19, pos));
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

export const SQUARE_STYLE: Record<SquareType, { bg: string; border: string; label: string; emoji: string }> = {
  start:    { bg: 'linear-gradient(135deg,#ffd93d,#ff922b)', border: '#ff922b', label: 'スタート', emoji: '🏁' },
  normal:   { bg: 'linear-gradient(135deg,#4d96ff,#228be6)', border: '#4d96ff', label: '',         emoji: '' },
  lucky:    { bg: 'linear-gradient(135deg,#ffd93d,#fcc419)', border: '#fcc419', label: 'ラッキー', emoji: '⭐' },
  bad:      { bg: 'linear-gradient(135deg,#cc5de8,#9c36b5)', border: '#cc5de8', label: 'バッド',   emoji: '💨' },
  minigame: { bg: 'linear-gradient(135deg,#ff6b9d,#f03e3e)', border: '#ff6b9d', label: 'ゲーム',   emoji: '🎮' },
  goal:     { bg: 'linear-gradient(135deg,#6bcb77,#2f9e44)', border: '#6bcb77', label: 'ゴール！', emoji: '🏆' },
};

// ── マス効果テキスト ──────────────────────────────────────────────────────────

export function getSquareEventText(type: SquareType): string {
  switch (type) {
    case 'lucky':    return '⭐ラッキー！3マスすすむ！';
    case 'bad':      return '💨あっ！3マスもどる！';
    case 'minigame': return '🎮ミニゲーム スタート！';
    case 'goal':     return '🏆ゴール！！！';
    default:         return '';
  }
}

// ── ミニゲーム結果のボーナス移動 ─────────────────────────────────────────────

export const MINIGAME_WIN_BONUS  = 3;
export const MINIGAME_DRAW_BONUS = 1;
// 負けはボーナスなし（子供が傷つかない設計）
