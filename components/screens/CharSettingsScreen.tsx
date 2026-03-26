'use client';

import type { CharGameSettings } from '@/lib/types';

interface Props {
  playerName: string;
  settings: CharGameSettings;
  onSettingsChange: (s: CharGameSettings) => void;
  onStartGame: () => void;
  onGoToPractice: () => void;
  onBack: () => void;
}

const CONTENT_TYPES: Array<{ value: CharGameSettings['contentType']; label: string; emoji: string }> = [
  { value: 'hiragana', label: 'ひらがな', emoji: 'あ' },
  { value: 'katakana', label: 'カタカナ', emoji: 'ア' },
  { value: 'alphabet', label: 'アルファベット', emoji: 'A' },
];

const BINGO_MODES: Array<{ value: CharGameSettings['bingoSubMode']; label: string; desc: string }> = [
  { value: 'char-show', label: '文字が出る', desc: 'もじをみてさがそう' },
  { value: 'sound-match', label: '音でさがす', desc: 'きいてもじをさがそう' },
];

const CARD_MODES: Array<{ value: CharGameSettings['cardMode']; label: string; desc: string }> = [
  { value: 'web', label: 'がめんカード', desc: 'タップしてあなをあける' },
  { value: 'paper', label: 'かみカード', desc: 'じぶんでかみにかく' },
];

export default function CharSettingsScreen({
  playerName,
  settings,
  onSettingsChange,
  onStartGame,
  onGoToPractice,
  onBack,
}: Props) {
  const set = <K extends keyof CharGameSettings>(key: K, value: CharGameSettings[K]) =>
    onSettingsChange({ ...settings, [key]: value });

  return (
    <div className="flex flex-col gap-5 px-5 py-6 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm font-bold text-gray-400 active:scale-95 transition-transform"
        >
          ← もどる
        </button>
        <h2 className="text-xl font-black text-gray-700">
          🔤 <span className="font-black text-[var(--color-bingo-blue)]">{playerName}</span>
          ちゃんのもじビンゴ
        </h2>
      </div>

      {/* Content type */}
      <section className="bg-white rounded-2xl border-4 border-[var(--color-bingo-blue)] p-4 shadow-md">
        <p className="text-sm font-black text-[var(--color-bingo-blue)] mb-3">もじのしゅるい</p>
        <div className="flex gap-2">
          {CONTENT_TYPES.map(({ value, label, emoji }) => {
            const active = settings.contentType === value;
            return (
              <button
                key={value}
                onClick={() => set('contentType', value)}
                className="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl font-black text-sm border-4 transition-all active:scale-95"
                style={{
                  background: active ? 'var(--color-bingo-blue)' : 'white',
                  borderColor: active ? 'var(--color-bingo-blue)' : '#e5e7eb',
                  color: active ? 'white' : '#6b7280',
                }}
              >
                <span className="text-2xl font-black leading-none">{emoji}</span>
                <span className="text-[10px] leading-tight text-center">{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Game sub-mode */}
      <section className="bg-white rounded-2xl border-4 border-[var(--color-bingo-purple)] p-4 shadow-md">
        <p className="text-sm font-black text-[var(--color-bingo-purple)] mb-3">ゲームのしかた</p>
        <div className="flex flex-col gap-2">
          {BINGO_MODES.map(({ value, label, desc }) => {
            const active = settings.bingoSubMode === value;
            return (
              <button
                key={value}
                onClick={() => set('bingoSubMode', value)}
                className="flex items-center gap-3 py-3 px-4 rounded-2xl border-4 transition-all active:scale-95 text-left"
                style={{
                  background: active ? 'var(--color-bingo-purple)' : 'white',
                  borderColor: active ? 'var(--color-bingo-purple)' : '#e5e7eb',
                  color: active ? 'white' : '#374151',
                }}
              >
                <span className="text-xl">{value === 'char-show' ? '👁️' : '🔊'}</span>
                <div>
                  <p className="font-black text-sm">{label}</p>
                  <p className={`text-xs ${active ? 'text-white/80' : 'text-gray-400'}`}>{desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Card mode */}
      <section className="bg-white rounded-2xl border-4 border-[var(--color-bingo-green)] p-4 shadow-md">
        <p className="text-sm font-black text-[var(--color-bingo-green)] mb-3">カードのしゅるい</p>
        <div className="flex gap-2">
          {CARD_MODES.map(({ value, label, desc }) => {
            const active = settings.cardMode === value;
            return (
              <button
                key={value}
                onClick={() => set('cardMode', value)}
                className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-4 transition-all active:scale-95"
                style={{
                  background: active ? 'var(--color-bingo-green)' : 'white',
                  borderColor: active ? 'var(--color-bingo-green)' : '#e5e7eb',
                  color: active ? 'white' : '#6b7280',
                }}
              >
                <span className="text-xl">{value === 'web' ? '📱' : '📋'}</span>
                <p className="font-black text-xs">{label}</p>
                <p className={`text-[10px] text-center leading-tight ${active ? 'text-white/80' : 'text-gray-400'}`}>{desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Start button */}
      <button
        onClick={onStartGame}
        className="w-full text-2xl font-black text-white rounded-2xl py-5 shadow-lg active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #ff6b9d 0%, #ff922b 100%)' }}
      >
        🎯 ビンゴスタート！
      </button>

      {/* Practice link */}
      <button
        onClick={onGoToPractice}
        className="w-full text-lg font-black rounded-2xl py-4 border-4 active:scale-95 transition-transform"
        style={{
          background: 'white',
          borderColor: 'var(--color-bingo-purple)',
          color: 'var(--color-bingo-purple)',
        }}
      >
        🎵 音で練習する
      </button>
    </div>
  );
}
