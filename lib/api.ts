import type { RankEntry, RankGameMode, RankPeriod } from './ranking';

// fire-and-forget — エラーは握り潰す（オフライン時も動くように）
export function pushRankEntryToServer(entry: Omit<RankEntry, 'ts'>): void {
  fetch('/api/rankings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch(() => {});
}

export function pushRecordToServer(playerName: string, key: string, value: number): void {
  fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName, key, value }),
  }).catch(() => {});
}

// ランキング取得
export async function fetchRankingsFromServer(
  mode: RankGameMode,
  period: RankPeriod,
): Promise<RankEntry[]> {
  const res = await fetch(`/api/rankings?mode=${mode}&period=${period}&limit=20`);
  if (!res.ok) throw new Error('fetch failed');
  return res.json() as Promise<RankEntry[]>;
}

// プレイヤーの記録取得（起動時に一度だけ呼ぶ）
export async function fetchRecordsFromServer(
  playerName: string,
): Promise<Record<string, number>> {
  const res = await fetch(`/api/records?player=${encodeURIComponent(playerName)}`);
  if (!res.ok) return {};
  return res.json() as Promise<Record<string, number>>;
}
