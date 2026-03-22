'use client';

import { useState } from 'react';
import type { GameSettings, MathProblem } from '@/lib/types';

interface Props {
  number: number | null;
  problem: MathProblem | null;
  mode: GameSettings['mode'];
}

export default function NumberDisplay({ number, problem, mode }: Props) {
  const [revealed, setRevealed] = useState(false);

  // Reset revealed state whenever problem changes
  // (key-based remount in parent handles this)

  if (number === null) {
    return (
      <div className="flex items-center justify-center h-40 rounded-3xl bg-white border-4 border-dashed border-gray-200">
        <p className="text-2xl text-gray-300 font-bold">ボタンを おしてね</p>
      </div>
    );
  }

  if (mode === 'calculation' && problem) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 h-40 rounded-3xl bg-white border-4 border-[var(--color-bingo-purple)] shadow-lg cursor-pointer select-none animate-[number-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        onClick={() => setRevealed(true)}
      >
        <p className="text-4xl font-black text-[var(--color-bingo-purple)]">
          {problem.expression} ＝ ？
        </p>
        {!revealed ? (
          <p className="text-sm text-gray-400 animate-[wiggle_0.4s_ease_both]">
            👆 タップで こたえを みる
          </p>
        ) : (
          <p className="text-5xl font-black text-[var(--color-bingo-orange)] animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
            {problem.answer}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-40 rounded-3xl bg-white border-4 border-[var(--color-bingo-pink)] shadow-lg animate-[number-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]">
      <p className="text-7xl font-black text-[var(--color-bingo-pink)]">{number}</p>
    </div>
  );
}
