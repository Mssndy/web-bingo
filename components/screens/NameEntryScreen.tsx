'use client';

import { useState } from 'react';
import type { PlayerStats } from '@/lib/types';
import { winRate } from '@/lib/storage';
import HeroIllustration from '@/components/ui/HeroIllustration';

interface Props {
  onStart: (name: string) => void;
  onPractice: (name: string) => void;
  onEasy: (name: string) => void;
  onChar: (name: string) => void;
  onMiniGame: (name: string) => void;
  onRanking: () => void;
  stats: PlayerStats | null;
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

export default function NameEntryScreen({ onStart, onPractice, onEasy, onChar, onMiniGame, onRanking, stats }: Props) {
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
      label: 'かんたん学ぼう',
      desc: 'えらんで\n正解しよう！',
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
    <div className="flex flex-col items-center gap-5 py-6 animate-[fade-in_0.3s_ease_both]">

      {/* Hero illustration — full bleed */}
      <div className="w-full px-4">
        <HeroIllustration />
      </div>

      {/* Title */}
      <div className="text-center px-4">
        <h1
          className="text-4xl font-black tracking-wide drop-shadow-sm"
          style={{
            background: 'linear-gradient(90deg, #ff6b9d 0%, #ffd93d 45%, #cc5de8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          あそんで まなぼう！
        </h1>
        <p className="text-sm text-gray-400 font-bold mt-1 tracking-wide">
          すうじと けいさんを たのしもう ✨
        </p>
      </div>

      {/* Name input */}
      <div className="w-full max-w-sm flex flex-col gap-2 px-4">
        <p className="text-center text-sm font-bold text-gray-400 tracking-wide">なまえをいれてね</p>
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="なまえ"
            maxLength={10}
            className="w-full text-3xl font-bold text-center rounded-2xl border-4 border-[var(--color-bingo-blue)] px-4 py-3 outline-none focus:border-[var(--color-bingo-purple)] transition-colors bg-white shadow-md"
          />
        </div>
      </div>

      {/* Mode tiles */}
      <div className="w-full max-w-sm px-4">
        <p className="text-center text-sm font-bold text-gray-400 mb-3 tracking-wide">
          モードをえらんでね 👇
        </p>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              disabled={!trimmed}
              onClick={() => trimmed && mode.onSelect(trimmed)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 px-2 shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
              style={{
                background: trimmed ? mode.gradient : 'linear-gradient(135deg, #ddd, #ccc)',
                border: `3px solid ${trimmed ? mode.border : 'transparent'}`,
                animation: trimmed ? mode.anim : undefined,
              }}
            >
              {/* Shine overlay */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)' }}
              />
              <span className="text-4xl leading-none relative z-10" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
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

      {/* Ranking button */}
      <div className="w-full max-w-sm px-4">
        <button
          onClick={onRanking}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-base font-black transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #ffd93d 0%, #ff922b 100%)',
            color: 'white',
            border: '3px solid rgba(255,217,61,0.5)',
            boxShadow: '0 4px 14px rgba(255,217,61,0.35)',
          }}
        >
          🏆 ランキング
        </button>
      </div>

      {/* Stats */}
      {stats && stats.gamesPlayed > 0 && (
        <div
          className="w-full max-w-sm mx-4 rounded-2xl shadow p-4"
          style={{
            background: 'white',
            border: '3px solid rgba(255,217,61,0.6)',
            boxShadow: '0 4px 16px rgba(255,217,61,0.15)',
          }}
        >
          <p className="text-center text-sm text-gray-500 mb-3 font-bold">
            🏅 {stats.name} のきろく
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
