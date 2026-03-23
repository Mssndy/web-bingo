'use client';

import type { MaxNumber, MathOperator, PracticeSettings } from '@/lib/types';
import Button from '@/components/ui/Button';
import OperatorPicker from '@/components/game/OperatorPicker';

interface Props {
  playerName: string;
  settings: PracticeSettings;
  onSettingsChange: (s: PracticeSettings) => void;
  onStart: () => void;
  onBack: () => void;
}

const LEVEL_OPTIONS: { value: MaxNumber; label: string; desc: string }[] = [
  { value: 30, label: 'やさしい', desc: '1〜30' },
  { value: 50, label: 'ふつう',   desc: '1〜50' },
  { value: 75, label: 'むずかしい', desc: '1〜75' },
];

export default function PracticeSettingsScreen({
  playerName,
  settings,
  onSettingsChange,
  onStart,
  onBack,
}: Props) {
  return (
    <div className="flex flex-col gap-5 px-6 py-6 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="text-center">
        <p className="text-lg text-gray-500">
          <span className="font-black text-[var(--color-bingo-purple)]">{playerName}</span>
          ちゃん、よういはいい？
        </p>
      </div>

      {/* ── START button — top and prominent ── */}
      <Button size="lg" className="w-full" onClick={onStart}>
        🚀 スタート！
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <p className="text-xs font-bold text-gray-400 tracking-widest">せってい</p>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Level */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">レベル</h2>
        <div className="flex gap-3">
          {LEVEL_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => onSettingsChange({ ...settings, maxNumber: value })}
              className={`
                flex-1 py-4 px-2 rounded-2xl border-4 transition-all active:scale-95 text-center
                ${settings.maxNumber === value
                  ? 'bg-[var(--color-bingo-purple)] border-[var(--color-bingo-purple)] shadow-md'
                  : 'bg-white border-gray-200'}
              `}
            >
              <p className={`text-base font-black ${settings.maxNumber === value ? 'text-white' : 'text-gray-400'}`}>
                {label}
              </p>
              <p className={`text-xs mt-0.5 ${settings.maxNumber === value ? 'text-purple-200' : 'text-gray-300'}`}>
                {desc}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Operators */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">けいさんのしゅるい</h2>
        <OperatorPicker
          selected={settings.operators}
          onChange={(ops: MathOperator[]) => onSettingsChange({ ...settings, operators: ops })}
        />
      </section>

      {/* Back */}
      <Button variant="ghost" size="sm" className="w-full" onClick={onBack}>
        ← もどる
      </Button>
    </div>
  );
}
