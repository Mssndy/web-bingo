'use client';

import { useState } from 'react';
import type { PlayerStats } from '@/lib/types';
import { winRate } from '@/lib/storage';

interface Props {
  onStart: (name: string) => void;
  onPractice: (name: string) => void;
  stats: PlayerStats | null;
}

interface ModeCard {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  color: string;
  bg: string;
  onSelect: (name: string) => void;
}

export default function NameEntryScreen({ onStart, onPractice, stats }: Props) {
  const [name, setName] = useState(stats?.name ?? 'かず');

  const trimmed = name.trim();

  const MODES: ModeCard[] = [
    {
      id: 'bingo',
      emoji: '🎯',
      label: 'BINGOモード',
      desc: 'ビンゴカードで\nあそぼう！',
      color: '#ff6b9d',
      bg: '#fff0f6',
      onSelect: onStart,
    },
    {
      id: 'practice',
      emoji: '🧮',
      label: 'けいさんモード',
      desc: 'けいさんに\nチャレンジ！',
      color: '#cc5de8',
      bg: '#faf0ff',
      onSelect: onPractice,
    },
  ];

  return (
    <div className="flex flex-col items-center gap-6 px-5 py-8 animate-[fade-in_0.3s_ease_both]">

      {/* Title */}
      <div className="text-center">
        <div className="text-5xl mb-1">🌟</div>
        <h1 className="text-3xl font-black text-[var(--color-bingo-pink)] drop-shadow-sm tracking-wide">
          あそんで まなぼう！
        </h1>
      </div>

      {/* Name input */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        <p className="text-center text-sm font-bold text-gray-400 tracking-wide">なまえをいれてね</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="なまえ"
          maxLength={10}
          className="w-full text-3xl font-bold text-center rounded-2xl border-4 border-[var(--color-bingo-blue)] px-4 py-3 outline-none focus:border-[var(--color-bingo-pink)] transition-colors bg-white shadow-sm"
        />
      </div>

      {/* Mode tiles */}
      <div className="w-full max-w-sm">
        <p className="text-center text-sm font-bold text-gray-400 mb-3 tracking-wide">モードをえらんでね</p>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              disabled={!trimmed}
              onClick={() => trimmed && mode.onSelect(trimmed)}
              style={{
                borderColor: mode.color,
                backgroundColor: trimmed ? mode.bg : '#f5f5f5',
              }}
              className="flex flex-col items-center justify-center gap-2 rounded-3xl border-4 py-6 px-3 shadow-md active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-5xl leading-none">{mode.emoji}</span>
              <span
                className="text-sm font-black leading-tight text-center"
                style={{ color: trimmed ? mode.color : '#aaa' }}
              >
                {mode.label}
              </span>
              <span className="text-xs text-gray-400 text-center whitespace-pre-line leading-snug">
                {mode.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && stats.gamesPlayed > 0 && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow p-4 border-2 border-[var(--color-bingo-yellow)]">
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
