'use client';

import type { EasySettings } from '@/lib/types';
import Button from '@/components/ui/Button';

interface Props {
  playerName: string;
  settings: EasySettings;
  onSettingsChange: (s: EasySettings) => void;
  onStart: () => void;
  onBack: () => void;
}

const EASY_OPERATORS: { op: '+' | '-'; label: string; color: string }[] = [
  { op: '+', label: '＋', color: 'var(--color-bingo-green)' },
  { op: '-', label: '－', color: 'var(--color-bingo-blue)' },
];

export default function EasySettingsScreen({
  playerName,
  settings,
  onSettingsChange,
  onStart,
  onBack,
}: Props) {
  function toggleOp(op: '+' | '-') {
    const current = settings.operators;
    if (current.includes(op) && current.length === 1) return;
    const next = current.includes(op) ? current.filter((o) => o !== op) : [...current, op];
    onSettingsChange({ ...settings, operators: next });
  }

  return (
    <div className="flex flex-col gap-5 px-6 py-6 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="text-center">
        <p className="text-2xl font-black mb-1">🍎 かんたん学ぼう</p>
        <p className="text-base text-gray-500">
          <span className="font-black text-[var(--color-bingo-green)]">{playerName}</span>
          ちゃん、よういはいい？
        </p>
      </div>

      {/* START button */}
      <Button size="lg" className="w-full" onClick={onStart}>
        🍎 スタート！
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <p className="text-xs font-bold text-gray-400 tracking-widest">せってい</p>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Operator selection */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">けいさんのしゅるい</h2>
        <div className="flex gap-3 justify-center">
          {EASY_OPERATORS.map(({ op, label, color }) => {
            const active = settings.operators.includes(op);
            return (
              <button
                key={op}
                onClick={() => toggleOp(op)}
                style={active ? { backgroundColor: color, borderColor: color } : {}}
                className={`
                  w-20 h-16 text-3xl font-black rounded-2xl border-4 transition-all active:scale-90
                  ${active ? 'text-white shadow-md' : 'text-gray-400 border-gray-200 bg-white'}
                `}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">こたえは８つの中からえらべるよ！</p>
      </section>

      {/* Back */}
      <Button variant="ghost" size="sm" className="w-full" onClick={onBack}>
        ← もどる
      </Button>
    </div>
  );
}
