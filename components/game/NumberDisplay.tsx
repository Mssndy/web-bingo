'use client';

import { useState, useRef } from 'react';
import type { GameSettings, MathProblem } from '@/lib/types';

interface Props {
  number: number | null;
  problem: MathProblem | null;
  mode: GameSettings['mode'];
  answerMode: GameSettings['answerMode'];
  /** input mode: true = waiting for answer, false = already answered correctly */
  awaitingAnswer?: boolean;
  onAnswer?: (answer: number) => void;
}

export default function NumberDisplay({ number, problem, mode, answerMode, awaitingAnswer, onAnswer }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (number === null) {
    return (
      <div className="flex items-center justify-center h-20 rounded-3xl bg-white border-4 border-dashed border-gray-200">
        <p className="text-xl text-gray-300 font-bold">ボタンを おしてね</p>
      </div>
    );
  }

  // ── Calculation + input mode ────────────────────────────────────────────
  if (mode === 'calculation' && problem && answerMode === 'input') {
    if (awaitingAnswer === false) {
      return (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-3xl bg-[var(--color-bingo-green)] border-4 border-[var(--color-bingo-green)] shadow-lg px-4 py-3 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
          <p className="text-xl font-black text-white">🎉 GOOD！正解！</p>
          <p className="text-2xl font-black text-white opacity-90">
            {problem.expression} ＝{' '}
            <span className="text-3xl text-[var(--color-bingo-yellow)]">{problem.answer}</span>
          </p>
        </div>
      );
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      const n = parseInt(inputValue, 10);
      if (isNaN(n)) return;
      onAnswer?.(n);
      setInputValue('');
    }

    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-white border-4 border-[var(--color-bingo-purple)] shadow-lg px-4 py-3 animate-[number-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]">
        <p className="text-3xl font-black text-[var(--color-bingo-purple)]">
          {problem.expression} ＝ ？
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="こたえ"
            min={0}
            max={999}
            autoFocus
            className="flex-1 text-2xl font-black text-center rounded-2xl border-4 border-[var(--color-bingo-purple)] px-3 py-2 outline-none focus:border-[var(--color-bingo-pink)] transition-colors bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="submit"
            disabled={inputValue === ''}
            className="px-5 py-2 text-xl font-black text-white rounded-2xl bg-[var(--color-bingo-purple)] active:scale-95 transition-transform disabled:opacity-40"
          >
            ✓
          </button>
        </form>
      </div>
    );
  }

  // ── Calculation + reveal mode ───────────────────────────────────────────
  if (mode === 'calculation' && problem) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 h-20 rounded-3xl bg-white border-4 border-[var(--color-bingo-purple)] shadow-lg cursor-pointer select-none animate-[number-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        onClick={() => setRevealed(true)}
      >
        <p className="text-3xl font-black text-[var(--color-bingo-purple)]">
          {problem.expression} ＝ ？
        </p>
        {!revealed ? (
          <p className="text-xs text-gray-400 animate-[wiggle_0.4s_ease_both]">
            👆 タップで こたえを みる
          </p>
        ) : (
          <p className="text-4xl font-black text-[var(--color-bingo-orange)] animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
            {problem.answer}
          </p>
        )}
      </div>
    );
  }

  // ── Standard mode ──────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center h-20 rounded-3xl bg-white border-4 border-[var(--color-bingo-pink)] shadow-lg animate-[number-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]">
      <p className="text-6xl font-black text-[var(--color-bingo-pink)]">{number}</p>
    </div>
  );
}
