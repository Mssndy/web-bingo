'use client';

import { useState } from 'react';
import type { PlayerStats } from '@/lib/types';
import { winRate } from '@/lib/storage';
import Button from '@/components/ui/Button';

interface Props {
  playerName: string;
  stats: PlayerStats;
  onRecordWin: () => void;
  onRecordLoss: () => void;
  onPlayAgain: () => void;
}

export default function ResultScreen({
  playerName,
  stats,
  onRecordWin,
  onRecordLoss,
  onPlayAgain,
}: Props) {
  const [recorded, setRecorded] = useState<'win' | 'loss' | null>(null);

  function handleWin() {
    if (recorded) return;
    setRecorded('win');
    onRecordWin();
  }

  function handleLoss() {
    if (recorded) return;
    setRecorded('loss');
    onRecordLoss();
  }

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-10 animate-[fade-in_0.3s_ease_both]">
      {/* Title */}
      <div className="text-center">
        <div className="text-6xl mb-2 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
          {recorded === 'win' ? '🏆' : recorded === 'loss' ? '😢' : '🎯'}
        </div>
        <h2 className="text-3xl font-black text-[var(--color-bingo-pink)]">
          {recorded === 'win'
            ? 'やったね！ビンゴ！'
            : recorded === 'loss'
            ? 'ざんねん…またがんばろう！'
            : 'どうだった？'}
        </h2>
      </div>

      {/* Win / Loss buttons */}
      {!recorded && (
        <div className="flex gap-4 w-full max-w-xs">
          <button
            onClick={handleWin}
            className="flex-1 py-6 text-2xl font-black text-white rounded-3xl bg-[var(--color-bingo-green)] shadow-lg active:scale-95 transition-transform"
          >
            🏆<br />
            <span className="text-lg">ビンゴ！</span>
          </button>
          <button
            onClick={handleLoss}
            className="flex-1 py-6 text-2xl font-black text-white rounded-3xl bg-[var(--color-bingo-orange)] shadow-lg active:scale-95 transition-transform"
          >
            😢<br />
            <span className="text-lg">ざんねん</span>
          </button>
        </div>
      )}

      {/* Updated stats */}
      {recorded && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow p-5 border-2 border-[var(--color-bingo-yellow)] animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
          <p className="text-center text-sm text-gray-500 mb-3 font-bold">
            {playerName} のきろく
          </p>
          <div className="flex justify-around text-center">
            <div>
              <p className="text-3xl font-black text-[var(--color-bingo-green)]">{stats.wins}</p>
              <p className="text-xs text-gray-500">かち</p>
            </div>
            <div>
              <p className="text-3xl font-black text-[var(--color-bingo-orange)]">{stats.losses}</p>
              <p className="text-xs text-gray-500">まけ</p>
            </div>
            <div>
              <p className="text-3xl font-black text-[var(--color-bingo-blue)]">{winRate(stats)}%</p>
              <p className="text-xs text-gray-500">しょうりつ</p>
            </div>
          </div>
        </div>
      )}

      <Button size="lg" className="w-full max-w-sm" onClick={onPlayAgain}>
        🔄 もう一度あそぶ
      </Button>
    </div>
  );
}
