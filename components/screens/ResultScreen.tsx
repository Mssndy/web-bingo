'use client';

import { useState } from 'react';
import type { PlayerStats } from '@/lib/types';
import { winRate } from '@/lib/storage';
import Button from '@/components/ui/Button';

interface Props {
  playerName: string;
  stats: PlayerStats;
  isBingoAuto: boolean;
  onRecordWin: () => void;
  onRecordLoss: () => void;
  onPlayAgain: () => void;
}

// Confetti pieces: [emoji, left%, delay(s), duration(s)]
const CONFETTI: [string, number, number, number][] = [
  ['🎊', 5,  0.0, 2.8], ['⭐', 18, 0.2, 3.2], ['🌟', 30, 0.1, 2.6],
  ['🎉', 42, 0.4, 3.0], ['✨', 55, 0.0, 2.9], ['💫', 67, 0.3, 3.3],
  ['🏆', 78, 0.1, 2.7], ['🎯', 90, 0.5, 3.1], ['⭐', 12, 0.6, 2.5],
  ['🌟', 50, 0.7, 3.4], ['🎊', 83, 0.2, 2.8], ['✨', 25, 0.8, 3.0],
  ['💫', 62, 0.4, 2.6], ['🎉', 95, 0.1, 3.2], ['⭐', 37, 0.9, 2.9],
];

const PRAISE_LINES = [
  { text: 'すごーい！！！',   color: '#ff6b9d', delay: '0.2s' },
  { text: 'やったー！！！',   color: '#ffd93d', delay: '0.5s' },
  { text: 'さいこう！！！',   color: '#6bcb77', delay: '0.8s' },
  { text: 'てんさい！！！',   color: '#4d96ff', delay: '1.1s' },
];

export default function ResultScreen({
  playerName,
  stats,
  isBingoAuto,
  onRecordWin,
  onRecordLoss,
  onPlayAgain,
}: Props) {
  const [recorded, setRecorded] = useState<'win' | 'loss' | null>(
    isBingoAuto ? 'win' : null
  );

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

  /* ── AUTO-BINGO CELEBRATION ─────────────────────────────────────── */
  if (isBingoAuto) {
    return (
      <div className="relative flex flex-col items-center gap-5 px-6 py-8 overflow-hidden min-h-screen animate-[fade-in_0.3s_ease_both]">

        {/* Confetti layer */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {CONFETTI.map(([emoji, left, delay, duration], i) => (
            <span
              key={i}
              className="absolute text-3xl"
              style={{
                left: `${left}%`,
                top: '-60px',
                animationName: 'confetti-fall',
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationFillMode: 'both',
              }}
            >
              {emoji}
            </span>
          ))}
        </div>

        {/* BINGO title */}
        <div className="text-center mt-4 z-10">
          <p
            className="font-black text-7xl tracking-widest"
            style={{
              color: '#ffd93d',
              animation: 'bingo-flash 1s ease-in-out infinite',
              textShadow: '0 0 20px rgba(255,217,61,0.8)',
            }}
          >
            BINGO!!
          </p>
          <p
            className="text-5xl font-black mt-1"
            style={{ color: '#ff6b9d', textShadow: '2px 2px 0 #c73d7a' }}
          >
            🎊🎊🎊
          </p>
        </div>

        {/* Praise lines */}
        <div className="flex flex-col items-center gap-2 z-10">
          {PRAISE_LINES.map(({ text, color, delay }) => (
            <p
              key={text}
              className="text-3xl font-black"
              style={{
                color,
                animation: `praise-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) ${delay} both`,
                textShadow: `1px 1px 0 rgba(0,0,0,0.15)`,
              }}
            >
              {text}
            </p>
          ))}
        </div>

        {/* Player shoutout */}
        <div
          className="z-10 rounded-3xl px-6 py-4 text-center shadow-xl border-4"
          style={{
            background: 'linear-gradient(135deg, #fff0f6, #f0e8ff)',
            borderColor: '#ff6b9d',
          }}
        >
          <p className="text-2xl font-black text-[var(--color-bingo-pink)]">
            {playerName}ちゃん、
          </p>
          <p className="text-xl font-black text-[var(--color-bingo-purple)] mt-1">
            かんぺきな　ビンゴ！！🌟
          </p>
        </div>

        {/* Stats */}
        <div className="z-10 w-full max-w-sm bg-white rounded-2xl shadow-lg p-4 border-2 border-[var(--color-bingo-yellow)]">
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

        <Button size="lg" className="w-full max-w-sm z-10" onClick={onPlayAgain}>
          🔄 もう一度あそぶ
        </Button>
      </div>
    );
  }

  /* ── PAPER CARD RESULT ──────────────────────────────────────────── */
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-10 animate-[fade-in_0.3s_ease_both]">
      <div className="text-center">
        <div className="text-6xl mb-2 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
          {recorded === 'loss' ? '😢' : '🏆'}
        </div>
        <h2 className="text-3xl font-black text-[var(--color-bingo-pink)]">
          {recorded === 'win'
            ? 'やったね！ビンゴ！'
            : recorded === 'loss'
            ? 'ざんねん…またがんばろう！'
            : 'どうだった？'}
        </h2>
      </div>

      {!recorded && (
        <div className="flex gap-4 w-full max-w-xs">
          <button
            onClick={handleWin}
            className="flex-1 py-6 text-2xl font-black text-white rounded-3xl bg-[var(--color-bingo-green)] shadow-lg active:scale-95 transition-transform"
          >
            🏆<br /><span className="text-lg">ビンゴ！</span>
          </button>
          <button
            onClick={handleLoss}
            className="flex-1 py-6 text-2xl font-black text-white rounded-3xl bg-[var(--color-bingo-orange)] shadow-lg active:scale-95 transition-transform"
          >
            😢<br /><span className="text-lg">ざんねん</span>
          </button>
        </div>
      )}

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
