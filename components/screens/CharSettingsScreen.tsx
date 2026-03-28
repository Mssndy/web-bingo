'use client';

import type { CharGameSettings } from '@/lib/types';
import Button from '@/components/ui/Button';

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

const BINGO_MODES: Array<{ value: CharGameSettings['bingoSubMode']; emoji: string; label: string; desc: string }> = [
  { value: 'char-show', emoji: '👁️', label: '文字が出る', desc: 'もじをみてさがそう' },
  { value: 'sound-match', emoji: '🔊', label: '音でさがす', desc: 'きいてさがそう' },
];

const CARD_MODES: Array<{ value: CharGameSettings['cardMode']; emoji: string; label: string; desc: string }> = [
  { value: 'web',   emoji: '📱', label: 'がめんカード', desc: 'タップであなあけ' },
  { value: 'paper', emoji: '📋', label: 'かみカード',   desc: 'じぶんでかく' },
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
    <div className="flex flex-col gap-4 px-5 py-5 animate-[fade-in_0.3s_ease_both]">

      {/* Greeting */}
      <div className="text-center">
        <p className="text-lg text-gray-500">
          <span className="font-black text-[var(--color-bingo-blue)]">{playerName}</span>
          ちゃん、よういはいい？
        </p>
      </div>

      {/* ── START — top and prominent ── */}
      <button
        onClick={onStartGame}
        className="w-full text-2xl font-black text-white rounded-2xl py-4 shadow-lg active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #ff6b9d 0%, #ff922b 100%)' }}
      >
        🎯 ビンゴスタート！
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <p className="text-xs font-bold text-gray-400 tracking-widest">せってい</p>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Content type */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">もじのしゅるい</h2>
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
      <section>
        <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">ゲームのしかた</h2>
        <div className="flex gap-2">
          {BINGO_MODES.map(({ value, emoji, label, desc }) => {
            const active = settings.bingoSubMode === value;
            return (
              <button
                key={value}
                onClick={() => set('bingoSubMode', value)}
                className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-4 transition-all active:scale-95"
                style={{
                  background: active ? 'var(--color-bingo-purple)' : 'white',
                  borderColor: active ? 'var(--color-bingo-purple)' : '#e5e7eb',
                  color: active ? 'white' : '#6b7280',
                }}
              >
                <span className="text-xl leading-none">{emoji}</span>
                <span className="text-xs font-black">{label}</span>
                <span className={`text-[10px] text-center leading-tight ${active ? 'text-white/80' : 'text-gray-300'}`}>
                  {desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Card mode */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">カードのしゅるい</h2>
        <div className="flex gap-2">
          {CARD_MODES.map(({ value, emoji, label, desc }) => {
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
                <span className="text-xl leading-none">{emoji}</span>
                <span className="text-xs font-black">{label}</span>
                <span className={`text-[10px] text-center leading-tight ${active ? 'text-white/80' : 'text-gray-300'}`}>
                  {desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Practice shortcut */}
      <button
        onClick={onGoToPractice}
        className="w-full text-base font-black rounded-2xl py-3 border-4 active:scale-95 transition-transform"
        style={{
          background: 'white',
          borderColor: 'var(--color-bingo-purple)',
          color: 'var(--color-bingo-purple)',
        }}
      >
        🎵 音で練習する
      </button>

      {/* Back */}
      <Button variant="ghost" size="sm" className="w-full" onClick={onBack}>
        ← もどる
      </Button>
    </div>
  );
}
