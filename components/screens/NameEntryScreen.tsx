'use client';

import { useState } from 'react';
import type { PlayerStats } from '@/lib/types';
import { winRate } from '@/lib/storage';

interface Props {
  onStart: (name: string) => void;
  stats: PlayerStats | null;
}

export default function NameEntryScreen({ onStart, stats }: Props) {
  const [name, setName] = useState(stats?.name ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onStart(trimmed);
  }

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-10 animate-[fade-in_0.3s_ease_both]">
      {/* Title */}
      <div className="text-center">
        <div className="text-6xl mb-2">🎯</div>
        <h1 className="text-4xl font-black text-[var(--color-bingo-pink)] drop-shadow-sm">
          ビンゴ！
        </h1>
        <p className="text-lg text-gray-500 mt-1">なまえをいれてね</p>
      </div>

      {/* Name input */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="なまえ"
          maxLength={10}
          className="w-full text-3xl font-bold text-center rounded-2xl border-4 border-[var(--color-bingo-blue)] px-4 py-4 outline-none focus:border-[var(--color-bingo-pink)] transition-colors bg-white shadow-sm"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full text-2xl font-black text-white rounded-2xl py-5 bg-[var(--color-bingo-pink)] shadow-lg active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
        >
          はじめる！
        </button>
      </form>

      {/* Stats */}
      {stats && stats.gamesPlayed > 0 && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow p-5 border-2 border-[var(--color-bingo-yellow)]">
          <p className="text-center text-sm text-gray-500 mb-3 font-bold">
            {stats.name} のきろく
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
    </div>
  );
}
