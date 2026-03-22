import type { PlayerStats } from './types';

const STORAGE_KEY = 'bingo_player_stats';

export function loadAllStats(): Record<string, PlayerStats> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PlayerStats>) : {};
  } catch {
    return {};
  }
}

export function loadStatsForPlayer(name: string): PlayerStats | null {
  const all = loadAllStats();
  return all[name] ?? null;
}

export function saveStats(stats: PlayerStats): void {
  if (typeof window === 'undefined') return;
  const all = loadAllStats();
  all[stats.name] = stats;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function createEmptyStats(name: string): PlayerStats {
  return { name, wins: 0, losses: 0, gamesPlayed: 0 };
}

export function winRate(stats: PlayerStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.wins / stats.gamesPlayed) * 100);
}
