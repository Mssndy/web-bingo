'use client';

import { useState } from 'react';
import type { PlayerStats } from '@/lib/types';
import { winRate } from '@/lib/storage';

interface Props {
  onStart: (name: string) => void;
  onPractice: (name: string) => void;
  onEasy: (name: string) => void;
  onChar: (name: string) => void;
  onMiniGame: (name: string) => void;
  onRanking: () => void;
  stats: PlayerStats | null;
  stickerCount: number;
}

interface ModeCard {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  gradient: string;
  border: string;
  anim: string;
  onSelect: (name: string) => void;
}

export default function NameEntryScreen({ onStart, onPractice, onEasy, onChar, onMiniGame, onRanking, stats, stickerCount }: Props) {
  const [name, setName] = useState(stats?.name ?? 'かず');

  const trimmed = name.trim();

  const MODES: ModeCard[] = [
    {
      id: 'bingo',
      emoji: '🎯',
      label: 'BINGOモード',
      desc: 'ビンゴカードで\nあそぼう！',
      gradient: 'linear-gradient(135deg, #ff6b9d 0%, #ff922b 100%)',
      border: 'rgba(255,107,157,0.5)',
      anim: 'float-bob-1 4s ease-in-out infinite',
      onSelect: onStart,
    },
    {
      id: 'practice',
      emoji: '🧮',
      label: 'けいさんモード',
      desc: 'れんぞく正解を\nめざそう！',
      gradient: 'linear-gradient(135deg, #cc5de8 0%, #4d96ff 100%)',
      border: 'rgba(204,93,232,0.5)',
      anim: 'float-bob-2 4s ease-in-out infinite 0.8s',
      onSelect: onPractice,
    },
    {
      id: 'easy',
      emoji: '🍎',
      label: 'えらんでまなぼう',
      desc: '絵でわかる\nたのしいけいさん！',
      gradient: 'linear-gradient(135deg, #40c057 0%, #74c0fc 100%)',
      border: 'rgba(64,192,87,0.5)',
      anim: 'float-bob-1 4s ease-in-out infinite 1.6s',
      onSelect: onEasy,
    },
    {
      id: 'char',
      emoji: '🔤',
      label: 'もじモード',
      desc: 'おとで\nもじをおぼえよう！',
      gradient: 'linear-gradient(135deg, #f06595 0%, #ffd43b 100%)',
      border: 'rgba(240,101,149,0.5)',
      anim: 'float-bob-2 4s ease-in-out infinite 2.4s',
      onSelect: onChar,
    },
    {
      id: 'minigame',
      emoji: '🎮',
      label: 'ミニゲーム広場',
      desc: 'いろんなゲームで\nあそぼう！',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'rgba(102,126,234,0.5)',
      anim: 'float-bob-3 4s ease-in-out infinite 3.2s',
      onSelect: onMiniGame,
    },
  ];

  return (
    <div className="flex flex-col gap-3 px-4 py-4 animate-[fade-in_0.3s_ease_both]">

      {/* Title + name input row */}
      <div className="flex items-center gap-3">
        {/* Compact logo */}
        <div
          className="shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, #0b1840, #1c3380)' }}
        >
          <span className="text-2xl">🎱</span>
        </div>
        <div className="flex-1">
          <h1
            className="text-2xl font-black tracking-wide leading-tight"
            style={{
              background: 'linear-gradient(90deg, #ff6b9d 0%, #ffd93d 50%, #cc5de8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            あそんで まなぼう！
          </h1>
          <p className="text-xs text-gray-400 font-bold">すうじと もじを たのしもう ✨</p>
        </div>
      </div>

      {/* Name input */}
      <div className="flex flex-col gap-1.5">
        <p className="text-center text-xs font-bold text-gray-400">なまえをいれてね</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="なまえ"
          maxLength={10}
          className="w-full text-2xl font-bold text-center rounded-2xl border-4 border-[var(--color-bingo-blue)] px-4 py-2 outline-none focus:border-[var(--color-bingo-purple)] transition-colors bg-white shadow-md"
        />
      </div>

      {/* Mode tiles */}
      <div>
        <p className="text-center text-xs font-bold text-gray-400 mb-2">モードをえらんでね 👇</p>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((mode, i) => (
            <button
              key={mode.id}
              disabled={!trimmed}
              onClick={() => trimmed && mode.onSelect(trimmed)}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-3 px-2 shadow active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden${i === MODES.length - 1 && MODES.length % 2 !== 0 ? ' col-span-2' : ''}`}
              style={{
                background: trimmed ? mode.gradient : 'linear-gradient(135deg, #ddd, #ccc)',
                border: `2px solid ${trimmed ? mode.border : 'transparent'}`,
                animation: trimmed ? mode.anim : undefined,
              }}
            >
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 55%)' }}
              />
              <span className="text-3xl leading-none relative z-10" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
                {mode.emoji}
              </span>
              <span className="text-xs font-black text-white leading-tight text-center relative z-10 drop-shadow">
                {mode.label}
              </span>
              <span className="text-[10px] text-white/80 text-center whitespace-pre-line leading-snug relative z-10">
                {mode.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom row: ranking + stats */}
      <div className="flex gap-2 items-stretch">
        <button
          onClick={onRanking}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-black transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #ffd93d 0%, #ff922b 100%)',
            color: 'white',
            border: '2px solid rgba(255,217,61,0.5)',
            boxShadow: '0 3px 10px rgba(255,217,61,0.3)',
          }}
        >
          🏆 ランキング
        </button>

        {stickerCount > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-2xl"
            style={{ background: 'white', border: '2px solid rgba(255,217,61,0.6)' }}
          >
            <span className="text-2xl">🌟</span>
            <div>
              <p className="text-xs font-bold text-gray-400">シールちょう</p>
              <p className="text-lg font-black" style={{ color: 'var(--color-bingo-orange)' }}>
                {stickerCount}まい
              </p>
            </div>
            <div className="flex gap-0.5 ml-1">
              {Array.from({ length: Math.min(stickerCount % 25 || (stickerCount > 0 ? 25 : 0), 5) }).map((_, i) => (
                <span key={i} className="text-base">🌟</span>
              ))}
            </div>
          </div>
        )}

        {stats && stats.gamesPlayed > 0 && (
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-2xl shadow"
            style={{
              background: 'white',
              border: '2px solid rgba(255,217,61,0.6)',
            }}
          >
            <div className="text-center">
              <p className="text-xl font-black text-[var(--color-bingo-green)] leading-none">{stats.wins}</p>
              <p className="text-[10px] text-gray-400">かち</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-[var(--color-bingo-orange)] leading-none">{stats.losses}</p>
              <p className="text-[10px] text-gray-400">まけ</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-[var(--color-bingo-blue)] leading-none">{winRate(stats)}%</p>
              <p className="text-[10px] text-gray-400">しょうりつ</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
