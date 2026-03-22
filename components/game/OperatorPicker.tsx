'use client';

import type { MathOperator } from '@/lib/types';

const OPERATORS: { op: MathOperator; label: string; color: string }[] = [
  { op: '+', label: '＋', color: 'var(--color-bingo-green)' },
  { op: '-', label: '－', color: 'var(--color-bingo-blue)' },
  { op: '×', label: '×', color: 'var(--color-bingo-orange)' },
  { op: '÷', label: '÷', color: 'var(--color-bingo-purple)' },
];

interface Props {
  selected: MathOperator[];
  onChange: (ops: MathOperator[]) => void;
}

export default function OperatorPicker({ selected, onChange }: Props) {
  function toggle(op: MathOperator) {
    if (selected.includes(op)) {
      if (selected.length === 1) return; // at least one must remain
      onChange(selected.filter((o) => o !== op));
    } else {
      onChange([...selected, op]);
    }
  }

  return (
    <div className="flex gap-3 justify-center">
      {OPERATORS.map(({ op, label, color }) => {
        const active = selected.includes(op);
        return (
          <button
            key={op}
            onClick={() => toggle(op)}
            style={active ? { backgroundColor: color, borderColor: color } : {}}
            className={`
              w-14 h-14 text-2xl font-black rounded-2xl border-4 transition-all active:scale-90
              ${active ? 'text-white shadow-md' : 'text-gray-400 border-gray-200 bg-white'}
            `}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
