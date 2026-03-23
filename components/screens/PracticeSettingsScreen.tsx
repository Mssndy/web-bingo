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
    <div className="flex flex-col gap-6 px-6 py-8 animate-[fade-in_0.3s_ease_both]">
      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-2">🧮</div>
        <h1 className="text-3xl font-black text-[var(--color-bingo-purple)]">けいさん練習</h1>
        <p className="text-lg text-gray-500 mt-1">
          <span className="font-black text-[var(--color-bingo-pink)]">{playerName}</span>
          ちゃん、れんぞく正解に挑戦！
        </p>
      </div>

      {/* Level */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 mb-3 tracking-wide">レベル</h2>
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
        <h2 className="text-sm font-bold text-gray-400 mb-3 tracking-wide">けいさんのしゅるい</h2>
        <OperatorPicker
          selected={settings.operators}
          onChange={(ops: MathOperator[]) => onSettingsChange({ ...settings, operators: ops })}
        />
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-2">
        <Button size="lg" className="w-full" onClick={onStart}>
          🚀 スタート！
        </Button>
        <Button variant="ghost" size="sm" className="w-full" onClick={onBack}>
          ← もどる
        </Button>
      </div>
    </div>
  );
}
