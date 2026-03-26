'use client';

import type { CharPracticeSettings } from '@/lib/types';

interface Props {
  playerName: string;
  settings: CharPracticeSettings;
  onSettingsChange: (s: CharPracticeSettings) => void;
  onStart: () => void;
  onBack: () => void;
}

const CONTENT_TYPES: Array<{ value: CharPracticeSettings['contentType']; label: string; emoji: string; desc: string }> = [
  { value: 'hiragana', label: 'ひらがな', emoji: 'あ', desc: 'あいうえお…' },
  { value: 'katakana', label: 'カタカナ', emoji: 'ア', desc: 'アイウエオ…' },
  { value: 'alphabet', label: 'アルファベット', emoji: 'A', desc: 'ABC…' },
];

export default function CharPracticeSettingsScreen({
  playerName,
  settings,
  onSettingsChange,
  onStart,
  onBack,
}: Props) {
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
          🎵 <span className="font-black text-[var(--color-bingo-purple)]">{playerName}</span>
          ちゃんの音練習
        </h2>
      </div>

      <p className="text-center text-sm text-gray-500 font-bold">
        おとをきいて、もじをえらぼう！
      </p>

      {/* Content type selection */}
      <section className="bg-white rounded-2xl border-4 border-[var(--color-bingo-purple)] p-4 shadow-md">
        <p className="text-sm font-black text-[var(--color-bingo-purple)] mb-3">なにをれんしゅうする？</p>
        <div className="flex flex-col gap-2">
          {CONTENT_TYPES.map(({ value, label, emoji, desc }) => {
            const active = settings.contentType === value;
            return (
              <button
                key={value}
                onClick={() => onSettingsChange({ contentType: value })}
                className="flex items-center gap-4 py-4 px-4 rounded-2xl border-4 transition-all active:scale-95 text-left"
                style={{
                  background: active ? 'var(--color-bingo-purple)' : 'white',
                  borderColor: active ? 'var(--color-bingo-purple)' : '#e5e7eb',
                  color: active ? 'white' : '#374151',
                }}
              >
                <span
                  className="text-3xl font-black leading-none w-10 text-center"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  {emoji}
                </span>
                <div>
                  <p className="font-black text-base">{label}</p>
                  <p className={`text-sm ${active ? 'text-white/80' : 'text-gray-400'}`}>{desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Start button */}
      <button
        onClick={onStart}
        className="w-full text-2xl font-black text-white rounded-2xl py-5 shadow-lg active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #cc5de8 0%, #4d96ff 100%)' }}
      >
        🎵 れんしゅうスタート！
      </button>
    </div>
  );
}
