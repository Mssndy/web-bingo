'use client';

import type { CharPracticeSettings } from '@/lib/types';
import Button from '@/components/ui/Button';

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
    <div className="flex flex-col gap-4 px-5 py-5 animate-[fade-in_0.3s_ease_both]">

      {/* Greeting */}
      <div className="text-center">
        <p className="text-lg text-gray-500">
          <span className="font-black text-[var(--color-bingo-purple)]">{playerName}</span>
          ちゃん、よういはいい？
        </p>
      </div>

      {/* ── START — top and prominent ── */}
      <button
        onClick={onStart}
        className="w-full text-2xl font-black text-white rounded-2xl py-4 shadow-lg active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #cc5de8 0%, #4d96ff 100%)' }}
      >
        🎵 れんしゅうスタート！
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <p className="text-xs font-bold text-gray-400 tracking-widest">せってい</p>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Content type */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">なにをれんしゅうする？</h2>
        <div className="flex gap-2">
          {CONTENT_TYPES.map(({ value, label, emoji, desc }) => {
            const active = settings.contentType === value;
            return (
              <button
                key={value}
                onClick={() => onSettingsChange({ contentType: value })}
                className="flex-1 flex flex-col items-center gap-1 py-4 rounded-2xl font-black border-4 transition-all active:scale-95"
                style={{
                  background: active ? 'var(--color-bingo-purple)' : 'white',
                  borderColor: active ? 'var(--color-bingo-purple)' : '#e5e7eb',
                  color: active ? 'white' : '#6b7280',
                }}
              >
                <span className="text-3xl font-black leading-none">{emoji}</span>
                <span className="text-xs font-black text-center leading-tight">{label}</span>
                <span className={`text-[10px] text-center leading-tight ${active ? 'text-white/70' : 'text-gray-300'}`}>
                  {desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Back */}
      <Button variant="ghost" size="sm" className="w-full" onClick={onBack}>
        ← もどる
      </Button>
    </div>
  );
}
