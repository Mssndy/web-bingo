/**
 * しんけいすいじゃく の コンピュータ対戦ロジック（ランダム要素はここに集約）。
 * コンポーネント側で Math.random を直接呼ぶと純粋性ルールに触れるため、
 * ゆらぎを使うヘルパーは すべて この lib に置く。
 */

export type CpuLevel = 'weak' | 'normal';

/**
 * CPU が「見えたカードを おぼえている」確率。
 * weak は よく わすれる → 子供が勝ちやすい（必須の やさしさ）。
 */
export const CPU_MEM_CHANCE: Record<CpuLevel, number> = {
  weak: 0.3,
  normal: 0.82,
};

/** chance の確率で true */
export function rollChance(chance: number): boolean {
  return Math.random() < chance;
}

/** 配列から ランダムに1つ */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
