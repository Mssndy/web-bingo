export type JankenHand = 'guu' | 'choki' | 'paa';
export type JankenResult = 'win' | 'lose' | 'draw';

export const HAND_LABEL: Record<JankenHand, string> = {
  guu:   'グー',
  choki: 'チョキ',
  paa:   'パー',
};

export const HAND_OBJECT: Record<JankenHand, string> = {
  guu:   '石',
  choki: 'はさみ',
  paa:   '紙',
};

const HANDS: JankenHand[] = ['guu', 'choki', 'paa'];

export function getRandomHand(): JankenHand {
  return HANDS[Math.floor(Math.random() * 3)];
}

export function judgeJanken(player: JankenHand, cpu: JankenHand): JankenResult {
  if (player === cpu) return 'draw';
  if (
    (player === 'guu'   && cpu === 'choki') ||
    (player === 'choki' && cpu === 'paa')   ||
    (player === 'paa'   && cpu === 'guu')
  ) return 'win';
  return 'lose';
}

/** Why the winner beats the loser, in simple Japanese. */
export function getRelationshipText(winner: JankenHand, loser: JankenHand): string {
  if (winner === 'guu'   && loser === 'choki') return '石は はさみを こわした！';
  if (winner === 'choki' && loser === 'paa')   return 'はさみは 紙を きった！';
  if (winner === 'paa'   && loser === 'guu')   return '紙は 石を つつんだ！';
  return '';
}
