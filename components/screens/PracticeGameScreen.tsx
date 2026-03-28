'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MathProblem, PracticeSettings } from '@/lib/types';
import { generateProblem } from '@/lib/math-problems';
import { getBestStreak, saveBestStreak } from '@/lib/storage';
import { playCorrect, playWrong, playNewBest } from '@/lib/sounds';
import { saveRankEntry } from '@/lib/ranking';
import ElapsedTimer from '@/components/ui/ElapsedTimer';

interface Props {
  playerName: string;
  settings: PracticeSettings;
  onHome: () => void;
}

function randomNumber(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

const AUTO_ADVANCE_SECS = 3;

export default function PracticeGameScreen({ playerName, settings, onHome }: Props) {
  const [problem, setProblem]       = useState<MathProblem | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback]     = useState<'good' | 'newbest' | 'wrong' | null>(null);
  const [streak, setStreak]         = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [countdown, setCountdown]   = useState<number | null>(null);

  const nextProblem = useCallback(() => {
    const n = randomNumber(settings.maxNumber);
    setProblem(generateProblem(n, settings.operators));
    setInputValue('');
    setFeedback(null);
    setCountdown(null);
  }, [settings]);

  // Init
  useEffect(() => {
    setBestStreak(getBestStreak(playerName));
    nextProblem();
  }, [playerName, nextProblem]);

  // Start countdown after a correct answer
  useEffect(() => {
    if (feedback === 'good' || feedback === 'newbest') {
      setCountdown(AUTO_ADVANCE_SECS);
    }
  }, [feedback]);

  // Tick countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { nextProblem(); return; }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown, nextProblem]);

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
    <div className="flex flex-col gap-5 px-5 py-6 animate-[fade-in_0.3s_ease_both]">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            saveRankEntry({ playerName, score: bestStreak, mode: 'practice' });
            onHome();
          }}
          className="flex items-center gap-1 text-sm font-bold text-gray-400 active:scale-95 transition-transform"
        >
          🏠 ホーム
        </button>
        <ElapsedTimer />
        <div className="text-right">
          <p className="text-xs text-gray-400">ベスト</p>
          <p className="text-base font-black text-[var(--color-bingo-orange)]">🏅 {bestStreak}もん</p>
        </div>
      </div>

      {/* Greeting */}
      <p className="text-center text-base font-bold text-gray-500">
        <span className="font-black text-[var(--color-bingo-purple)]">{playerName}</span>
        ちゃん、れんぞく正解をめざそう！
      </p>

      {/* Streak */}
      <div className="text-center bg-white rounded-2xl border-4 border-[var(--color-bingo-purple)] py-3 shadow-md">
        <p className="text-sm font-bold text-[var(--color-bingo-purple)] mb-1">れんぞく正解</p>
        <p
          key={streak}
          className="text-6xl font-black text-[var(--color-bingo-purple)] animate-[number-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        >
          {streak}
        </p>
        <p className="text-sm text-gray-400 mt-1">もん</p>
      </div>

      {/* Problem */}
      {problem && (
        <div className="text-center bg-[var(--color-bingo-yellow)] rounded-3xl border-4 border-[var(--color-bingo-orange)] py-7 px-6 shadow-lg">
          <p className="text-sm font-bold text-gray-500 mb-2">もんだい</p>
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
            text-center rounded-2xl py-4 border-4 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]
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
              <p className="text-lg text-white mt-1 opacity-90">{streak}もん れんぞく！さいこう！</p>
            </>
          ) : feedback === 'good' ? (
            <p className="text-4xl font-black text-white">GOOD！ 🎉</p>
          ) : (
            /* Wrong: show correct answer clearly */
            <>
              <p className="text-3xl font-black text-white mb-2">おしい！ 💪</p>
              <div className="bg-white rounded-2xl py-3 px-6 mx-4">
                <p className="text-xs font-bold text-gray-400 mb-1">せいかいは</p>
                <p className="text-5xl font-black text-[var(--color-bingo-blue)]">
                  {problem?.answer}
                </p>
                <p className="text-xs font-bold text-gray-400 mt-1">だよ！</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Input / Next button */}
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
      ) : feedback === 'wrong' ? (
        <button
          onClick={nextProblem}
          className="w-full text-2xl font-black text-white rounded-2xl py-5 bg-[var(--color-bingo-blue)] shadow-lg active:scale-95 transition-transform"
        >
          つぎの問題 →
        </button>
      ) : (
        /* Correct: show countdown button */
        <button
          onClick={nextProblem}
          className="w-full text-2xl font-black text-white rounded-2xl py-5 bg-[var(--color-bingo-green)] shadow-lg active:scale-95 transition-transform"
        >
          つぎの問題 →{countdown !== null && countdown > 0 && (
            <span className="ml-2 text-xl opacity-80">({countdown})</span>
          )}
        </button>
      )}
    </div>
  );
}
