/**
 * 100m走 (button-mash sprint) — physics, scoring, and best-time storage.
 * Pure logic; rendering lives in SprintGameScreen.
 */

import { pushRecordToServer } from './api';

export const DISTANCE_M = 100;
/** Each tap advances the runner by this many meters. */
export const M_PER_TAP = 0.85;
/** Total taps needed to finish (exact = DISTANCE_M / M_PER_TAP, rounded up). */
export const TAPS_TO_FINISH = Math.ceil(DISTANCE_M / M_PER_TAP);

// ── Best time storage (per player, localStorage) ────────────────────────────

const STORAGE_KEY_PREFIX = 'bingo_sprint_best_';

export function getBestTime(playerName: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${playerName}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

/** Save best (smallest) time. Returns true if this is a new personal best. */
export function saveBestTime(playerName: string, timeMs: number): boolean {
  if (typeof window === 'undefined') return false;
  const prev = getBestTime(playerName);
  if (prev !== 0 && timeMs >= prev) return false;
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${playerName}`, String(timeMs));
  // Sync to server records (smaller-is-better — store as negative so the server's
  // "max" comparison still picks the best)
  pushRecordToServer(playerName, 'sprint:100m:best-ms', -timeMs);
  return true;
}

// ── Rank tiers ──────────────────────────────────────────────────────────────

export type SprintRank = 'olympic' | 'gold' | 'silver' | 'bronze' | 'finish';

/** Cutoff time (ms) for each rank — anything faster than the threshold qualifies. */
export function rankForTime(ms: number): SprintRank {
  if (ms <= 9000)  return 'olympic';   // < 9s — world-class
  if (ms <= 11500) return 'gold';      // < 11.5s
  if (ms <= 14500) return 'silver';    // < 14.5s
  if (ms <= 18000) return 'bronze';    // < 18s
  return 'finish';                      // anything else — well done for finishing
}

export const RANK_META: Record<SprintRank, { emoji: string; label: string; color: string; bg: string }> = {
  olympic: { emoji: '🏆', label: 'オリンピック級！',     color: '#fbbf24', bg: 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)' },
  gold:    { emoji: '🥇', label: 'ゴールド！',            color: '#f59e0b', bg: 'linear-gradient(135deg, #fcd34d 0%, #d97706 100%)' },
  silver:  { emoji: '🥈', label: 'シルバー！',            color: '#94a3b8', bg: 'linear-gradient(135deg, #e2e8f0 0%, #64748b 100%)' },
  bronze:  { emoji: '🥉', label: 'ブロンズ！',            color: '#d97706', bg: 'linear-gradient(135deg, #fdba74 0%, #c2410c 100%)' },
  finish:  { emoji: '🏁', label: 'ゴール！',              color: '#6bcb77', bg: 'linear-gradient(135deg, #86efac 0%, #16a34a 100%)' },
};

// ── Format helpers ──────────────────────────────────────────────────────────

/** "12.34" formatted seconds (2 decimal places) for display. */
export function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(2);
}

// ── Runner characters ───────────────────────────────────────────────────────

export interface RunnerChar {
  id: string;
  emoji: string;
  name: string;
  /** Color used for jersey / accents in the UI. */
  color: string;
}

export const RUNNERS: readonly RunnerChar[] = [
  { id: 'rabbit', emoji: '🐰', name: 'うさぎ', color: '#f87171' },
  { id: 'cheetah', emoji: '🐆', name: 'チーター', color: '#f59e0b' },
  { id: 'dog',    emoji: '🐶', name: 'いぬ',   color: '#60a5fa' },
  { id: 'horse',  emoji: '🐎', name: 'うま',   color: '#a78bfa' },
] as const;
