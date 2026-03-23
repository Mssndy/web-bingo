'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MathProblem, PracticeSettings } from '@/lib/types';
import { generateProblem } from '@/lib/math-problems';
import { getBestStreak, saveBestStreak } from '@/lib/storage';
import { playCorrect, playWrong, playNewBest } from '@/lib/sounds';

interface Props {
  playerName: string;
  settings: PracticeSettings;
  onBack: () => void;
}

function randomNumber(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

export default function PracticeGameScreen({ playerName, settings, onBack }: Props) {
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<'good' | 'newbest' | 'wrong' | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const nextProblem = useCallback(() => {
    const n = randomNumber(settings.maxNumber);
    setProblem(generateProblem(n, settings.operators));
    setInputValue('');
    setFeedback(null);
  }, [settings]);

  useEffect(() => {
    setBestStreak(getBestStreak(playerName));
    nextProblem();
  }, [playerName, nextProblem]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!problem || inputValue === '') return;

    const submitted = parseInt(inputValue, 10);
    if (isNaN(submitted)) return;

    if (submitted === problem.answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        saveBestStreak(playerName, newStreak);
        playNewBest();
        setFeedback('newbest');
      } else {
        playCorrect();
        setFeedback('good');
      }
    } else {
      playWrong();
      setStreak(0);
      setFeedback('wrong');
    }
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 animate-[fade-in_0.3s_ease_both]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm font-bold text-gray-400 active:scale-95 transition-transform"
        >
          ← やめる
        </button>
        <div className="text-right">
          <p className="text-xs text-gray-400">ベスト</p>
          <p className="text-lg font-black text-[var(--color-bingo-orange)]">
            🏅 {bestStreak}もん
          </p>
        </div>
      </div>

      {/* Streak */}
      <div className="text-center bg-white rounded-2xl border-4 border-[var(--color-bingo-purple)] py-4 shadow-md">
        <p className="text-sm font-bold text-[var(--color-bingo-purple)] mb-1">れんぞく正解</p>
        <p
          key={streak}
          className="text-6xl font-black text-[var(--color-bingo-purple)] animate-[number-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        >
          {streak}
        </p>
        <p className="text-sm text-gray-400 mt-1">もん</p>
      </div>

      {/* Problem card */}
      {problem && (
        <div className="text-center bg-[var(--color-bingo-yellow)] rounded-3xl border-4 border-[var(--color-bingo-orange)] py-8 px-6 shadow-lg">
          <p className="text-sm font-bold text-gray-500 mb-3">つぎの問題</p>
          <p className="text-5xl font-black text-gray-800 tracking-wide">
            {problem.expression} ＝ ？
          </p>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          key={feedback + streak}
          className={`
            text-center rounded-2xl py-5 border-4 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]
            ${feedback === 'wrong'
              ? 'bg-[var(--color-bingo-blue)] border-[var(--color-bingo-blue)]'
              : feedback === 'newbest'
              ? 'bg-[var(--color-bingo-pink)] border-[var(--color-bingo-pink)]'
              : 'bg-[var(--color-bingo-green)] border-[var(--color-bingo-green)]'}
          `}
        >
          {feedback === 'newbest' ? (
            <>
              <p className="text-4xl font-black text-white">NEW BEST！ 🌟</p>
              <p className="text-lg text-white mt-1 opacity-90">{streak}もん れんぞく！すごい！</p>
            </>
          ) : feedback === 'good' ? (
            <p className="text-4xl font-black text-white">GOOD！ 🎉</p>
          ) : (
            <>
              <p className="text-4xl font-black text-white">おしい！ 💪</p>
              <p className="text-lg text-white mt-1 opacity-90">
                こたえは <span className="font-black">{problem?.answer}</span> だよ、もう一度！
              </p>
            </>
          )}
        </div>
      )}

      {/* Input or Next button */}
      {!feedback ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="こたえ"
            autoFocus
            className="w-full text-4xl font-black text-center rounded-2xl border-4 border-[var(--color-bingo-blue)] px-4 py-4 outline-none focus:border-[var(--color-bingo-purple)] transition-colors bg-white shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="submit"
            disabled={inputValue === ''}
            className="w-full text-2xl font-black text-white rounded-2xl py-5 bg-[var(--color-bingo-purple)] shadow-lg active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            こたえる！
          </button>
        </form>
      ) : (
        <button
          onClick={nextProblem}
          className="w-full text-2xl font-black text-white rounded-2xl py-5 bg-[var(--color-bingo-blue)] shadow-lg active:scale-95 transition-transform"
        >
          つぎの問題 →
        </button>
      )}
    </div>
  );
}
