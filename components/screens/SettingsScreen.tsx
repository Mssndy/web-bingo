'use client';

import type { GameSettings, MaxNumber } from '@/lib/types';
import Button from '@/components/ui/Button';
import OperatorPicker from '@/components/game/OperatorPicker';

interface Props {
  playerName: string;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
  onStartGame: () => void;
  onBack: () => void;
}

const MAX_NUMBER_OPTIONS: { value: MaxNumber; label: string }[] = [
  { value: 30,  label: '1〜30' },
  { value: 50,  label: '1〜50' },
  { value: 75,  label: '1〜75' },
];

export default function SettingsScreen({
  playerName,
  settings,
  onSettingsChange,
  onStartGame,
  onBack,
}: Props) {
  return (
    <div className="flex flex-col gap-6 px-6 py-8 animate-[fade-in_0.3s_ease_both]">
      {/* Header */}
      <div className="text-center">
        <p className="text-lg text-gray-500">
          <span className="font-black text-[var(--color-bingo-pink)]">{playerName}</span>
          ちゃん、よういはいい？
        </p>
      </div>

      {/* Mode selector */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 mb-3 tracking-wide">モード</h2>
        <div className="flex gap-3">
          {(['standard', 'calculation'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onSettingsChange({ ...settings, mode: m })}
              className={`
                flex-1 py-4 rounded-2xl text-lg font-black border-4 transition-all active:scale-95
                ${settings.mode === m
                  ? 'bg-[var(--color-bingo-yellow)] border-[var(--color-bingo-orange)] text-gray-800 shadow-md'
                  : 'bg-white border-gray-200 text-gray-400'}
              `}
            >
              {m === 'standard' ? '🎲 ふつう' : '🧮 けいさん'}
            </button>
          ))}
        </div>
      </section>

      {/* Operator picker (calculation mode only) */}
      {settings.mode === 'calculation' && (
        <section className="animate-[fade-in_0.3s_ease_both]">
          <h2 className="text-sm font-bold text-gray-400 mb-3 tracking-wide">けいさんのしゅるい</h2>
          <OperatorPicker
            selected={settings.operators}
            onChange={(ops) => onSettingsChange({ ...settings, operators: ops })}
          />
        </section>
      )}

      {/* Number range */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 mb-3 tracking-wide">すうじのはんい</h2>
        <div className="flex gap-3">
          {MAX_NUMBER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onSettingsChange({ ...settings, maxNumber: value })}
              className={`
                flex-1 py-3 rounded-2xl text-base font-black border-4 transition-all active:scale-95
                ${settings.maxNumber === value
                  ? 'bg-[var(--color-bingo-blue)] border-[var(--color-bingo-blue)] text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-400'}
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-2">
        <Button size="lg" className="w-full" onClick={onStartGame}>
          🎯 スタート！
        </Button>
        <Button variant="ghost" size="sm" className="w-full" onClick={onBack}>
          ← もどる
        </Button>
      </div>
    </div>
  );
}
