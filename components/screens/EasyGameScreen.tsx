'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EasyProblem, EasySettings } from '@/lib/types';
import { generateEasyProblem, generateChoices } from '@/lib/easy-problems';
import { getEasyBestStreak, saveEasyBestStreak } from '@/lib/storage';
import { playCorrect, playWrong, playNewBest } from '@/lib/sounds';
import { saveRankEntry } from '@/lib/ranking';
import ElapsedTimer from '@/components/ui/ElapsedTimer';

interface Props {
  playerName: string;
  settings: EasySettings;
  onHome: () => void;
}

const AUTO_ADVANCE_SECS = 3;

// ── Apple visual helpers ────────────────────────────────────────────────────

/** Renders apples in a fixed 5-per-row grid. brightCount = normal, dimCount = greyed-out (removed). */
function AppleGrid({
  brightCount,
  dimCount = 0,
  color = '#f9fafb',
  borderColor = '#d1d5db',
  label,
}: {
  brightCount: number;
  dimCount?: number;
  color?: string;
  borderColor?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="rounded-2xl p-3 border-2"
        style={{ background: color, borderColor }}
      >
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {Array.from({ length: brightCount }).map((_, i) => (
            <span key={`b-${i}`} className="text-3xl leading-none text-center select-none">🍎</span>
          ))}
          {Array.from({ length: dimCount }).map((_, i) => (
            <span
              key={`d-${i}`}
              className="text-3xl leading-none text-center select-none"
              style={{ filter: 'grayscale(1)', opacity: 0.28 }}
            >
              🍎
            </span>
          ))}
        </div>
      </div>
      {label && <span className="text-sm font-black text-gray-500">{label}</span>}
    </div>
  );
}

/** Apple illustration shown DURING the question (answer not yet revealed) */
function VisualQuestion({ problem }: { problem: EasyProblem }) {
  const { operator, operandA, operandB } = problem;

  if (operator === '+') {
    return (
      <div
        className="rounded-3xl border-4 p-4"
        style={{ background: 'white', borderColor: 'var(--color-bingo-orange)' }}
      >
        <p className="text-center text-xs font-bold text-gray-400 mb-3">りんごをかぞえてみよう！</p>
        <div className="flex flex-col items-center gap-2">
          <AppleGrid brightCount={operandA} color="#f0fdf4" borderColor="#86efac" label={`${operandA}こ`} />
          <span className="text-3xl font-black" style={{ color: 'var(--color-bingo-green)' }}>＋</span>
          <AppleGrid brightCount={operandB} color="#eff6ff" borderColor="#93c5fd" label={`${operandB}こ`} />
          <span className="text-3xl font-black text-gray-400">＝</span>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="rounded-2xl px-8 py-3 border-2 border-dashed flex items-center justify-center"
              style={{ background: '#fefce8', borderColor: '#fbbf24' }}
            >
              <span className="text-3xl font-black text-gray-400">？</span>
            </div>
            <span className="text-sm font-black text-gray-400">なんこ？</span>
          </div>
        </div>
      </div>
    );
  }

  // Subtraction: show all operandA apples (answer bright + operandB dim), result is ？
  return (
    <div
      className="rounded-3xl border-4 p-4"
      style={{ background: 'white', borderColor: 'var(--color-bingo-orange)' }}
    >
      <p className="text-center text-xs font-bold text-gray-400 mb-3">りんごをかぞえてみよう！</p>
      <div className="flex flex-col items-center gap-3">
        <AppleGrid
          brightCount={problem.answer}
          dimCount={operandB}
          color="#f9fafb"
          borderColor="#d1d5db"
          label={`ぜんぶで ${operandA}こ`}
        />
        <span className="text-base font-black" style={{ color: 'var(--color-bingo-blue)' }}>
          {operandB}こ とったら…？
        </span>
        <div className="flex flex-col items-center gap-1.5">
          <div
            className="rounded-2xl px-8 py-3 border-2 border-dashed flex items-center justify-center"
            style={{ background: '#fefce8', borderColor: '#fbbf24' }}
          >
            <span className="text-3xl font-black text-gray-400">？</span>
          </div>
          <span className="text-sm font-black text-gray-400">のこりなんこ？</span>
        </div>
      </div>
    </div>
  );
}

function VisualFeedback({ problem }: { problem: EasyProblem }) {
  const { operator, operandA, operandB, answer } = problem;

  if (operator === '+') {
    return (
      <div
        className="rounded-3xl border-4 p-4 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        style={{ background: 'white', borderColor: 'var(--color-bingo-green)' }}
      >
        <p className="text-center text-xs font-bold text-gray-400 mb-3">りんごでかんがえてみよう！</p>
        <div className="flex flex-col items-center gap-2">
          <AppleGrid brightCount={operandA} color="#f0fdf4" borderColor="#86efac" label={`${operandA}こ`} />
          <span className="text-3xl font-black" style={{ color: 'var(--color-bingo-green)' }}>＋</span>
          <AppleGrid brightCount={operandB} color="#eff6ff" borderColor="#93c5fd" label={`${operandB}こ`} />
          <span className="text-3xl font-black text-gray-400">＝</span>
          <AppleGrid brightCount={answer} color="#fefce8" borderColor="#fbbf24" label={`${answer}こ！`} />
        </div>
      </div>
    );
  }

  // Subtraction: show all (removed grayed), then just the remaining
  return (
    <div
      className="rounded-3xl border-4 p-4 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
      style={{ background: 'white', borderColor: 'var(--color-bingo-blue)' }}
    >
      <p className="text-center text-xs font-bold text-gray-400 mb-3">りんごでかんがえてみよう！</p>
      <div className="flex flex-col items-center gap-3">
        <AppleGrid
          brightCount={answer}
          dimCount={operandB}
          color="#f9fafb"
          borderColor="#d1d5db"
          label={`ぜんぶで ${operandA}こ`}
        />
        <span className="text-base font-black" style={{ color: 'var(--color-bingo-blue)' }}>
          {operandB}こ とった →
        </span>
        <AppleGrid brightCount={answer} color="#f0fdf4" borderColor="#86efac" label={`のこり ${answer}こ！`} />
      </div>
    </div>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function EasyGameScreen({ playerName, settings, onHome }: Props) {
  const [problem, setProblem]       = useState<EasyProblem | null>(null);
  const [choices, setChoices]       = useState<number[]>([]);
  const [selected, setSelected]     = useState<number | null>(null);
  const [feedback, setFeedback]     = useState<'correct' | 'newbest' | 'wrong' | null>(null);
  const [streak, setStreak]         = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [countdown, setCountdown]   = useState<number | null>(null);

  const nextProblem = useCallback(() => {
    const p = generateEasyProblem(settings.operators);
    setProblem(p);
    setChoices(generateChoices(p.answer));
    setSelected(null);
    setFeedback(null);
    setCountdown(null);
  }, [settings]);

  useEffect(() => {
    setBestStreak(getEasyBestStreak(playerName));
    nextProblem();
  }, [playerName, nextProblem]);

  // Start countdown after correct answer
  useEffect(() => {
    if (feedback === 'correct' || feedback === 'newbest') {
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

  function handleChoice(choice: number) {
    if (feedback !== null || !problem) return;
    setSelected(choice);

    if (choice === problem.answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        saveEasyBestStreak(playerName, newStreak);
        playNewBest();
        setFeedback('newbest');
      } else {
        playCorrect();
        setFeedback('correct');
      }
    } else {
      playWrong();
      setStreak(0);
      setFeedback('wrong');
    }
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-6 animate-[fade-in_0.3s_ease_both]">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            saveRankEntry({ playerName, score: bestStreak, mode: 'easy' });
            onHome();
          }}
          className="flex items-center gap-1 text-sm font-bold text-gray-400 active:scale-95 transition-transform"
        >
          🏠 ホーム
        </button>
        <ElapsedTimer />
        <div className="text-right">
          <p className="text-xs text-gray-400">ベスト</p>
          <p className="text-base font-black" style={{ color: 'var(--color-bingo-orange)' }}>🏅 {bestStreak}もん</p>
        </div>
      </div>

      {/* Greeting */}
      <p className="text-center text-base font-bold text-gray-500">
        <span className="font-black" style={{ color: 'var(--color-bingo-green)' }}>{playerName}</span>
        ちゃん、こたえをえらんでね！
      </p>

      {/* Streak counter */}
      <div
        className="text-center bg-white rounded-2xl border-4 py-2 shadow-md"
        style={{ borderColor: 'var(--color-bingo-green)' }}
      >
        <p className="text-sm font-bold" style={{ color: 'var(--color-bingo-green)' }}>れんぞく正解</p>
        <p
          key={streak}
          className="text-5xl font-black animate-[number-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          style={{ color: 'var(--color-bingo-green)' }}
        >
          {streak}
        </p>
        <p className="text-xs text-gray-400">もん</p>
      </div>

      {/* Problem display */}
      {problem && (
        <div
          className="text-center rounded-3xl border-4 py-4 px-6 shadow-lg"
          style={{
            background: 'var(--color-bingo-yellow)',
            borderColor: 'var(--color-bingo-orange)',
          }}
        >
          <p className="text-sm font-bold text-gray-500 mb-1">もんだい</p>
          <p className="text-4xl font-black text-gray-800 tracking-wide">
            {problem.expression} ＝ ？
          </p>
        </div>
      )}

      {/* Apple illustration: question phase → VisualQuestion, answered → VisualFeedback */}
      {problem && !feedback && <VisualQuestion problem={problem} />}
      {problem && feedback && <VisualFeedback problem={problem} />}

      {/* Feedback banner */}
      {feedback && (
        <div
          key={feedback + streak}
          className="text-center rounded-2xl py-3 border-4 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          style={
            feedback === 'wrong'
              ? { background: 'var(--color-bingo-blue)', borderColor: 'var(--color-bingo-blue)' }
              : feedback === 'newbest'
              ? { background: 'var(--color-bingo-pink)', borderColor: 'var(--color-bingo-pink)' }
              : { background: 'var(--color-bingo-green)', borderColor: 'var(--color-bingo-green)' }
          }
        >
          {feedback === 'newbest' ? (
            <>
              <p className="text-3xl font-black text-white">NEW BEST！ 🌟</p>
              <p className="text-base text-white opacity-90">{streak}もん れんぞく！さいこう！</p>
            </>
          ) : feedback === 'correct' ? (
            <p className="text-3xl font-black text-white">GOOD！ 🎉</p>
          ) : (
            <>
              <p className="text-2xl font-black text-white mb-1">おしい！ 💪</p>
              <div className="bg-white rounded-xl py-2 px-4 mx-4">
                <p className="text-xs font-bold text-gray-400 mb-0.5">せいかいは</p>
                <p className="text-4xl font-black" style={{ color: 'var(--color-bingo-blue)' }}>{problem?.answer}</p>
                <p className="text-xs font-bold text-gray-400 mt-0.5">だよ！</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* 8-choice grid */}
      {problem && (
        <div className="grid grid-cols-4 gap-2">
          {choices.map((choice) => {
            const isCorrectChoice = choice === problem.answer;
            const isSelectedWrong = choice === selected && feedback === 'wrong';
            const answered = feedback !== null;

            let bg = 'white';
            let border = '#e5e7eb';
            let text = '#374151';

            if (answered) {
              if (isCorrectChoice) {
                bg = 'var(--color-bingo-green)';
                border = 'var(--color-bingo-green)';
                text = 'white';
              } else if (isSelectedWrong) {
                bg = 'var(--color-bingo-orange)';
                border = 'var(--color-bingo-orange)';
                text = 'white';
              } else {
                bg = '#f9fafb';
                text = '#d1d5db';
                border = '#f3f4f6';
              }
            }

            return (
              <button
                key={choice}
                onClick={() => handleChoice(choice)}
                disabled={answered}
                className="rounded-2xl border-4 py-4 text-2xl font-black transition-all active:scale-90 shadow-sm disabled:cursor-default"
                style={{ background: bg, borderColor: border, color: text }}
              >
                {choice}
              </button>
            );
          })}
        </div>
      )}

      {/* Next question button */}
      {feedback && (
        <button
          onClick={nextProblem}
          className="w-full text-xl font-black text-white rounded-2xl py-4 shadow-lg active:scale-95 transition-transform"
          style={{
            background: feedback === 'wrong' ? 'var(--color-bingo-blue)' : 'var(--color-bingo-green)',
          }}
        >
          つぎの問題 →
          {feedback !== 'wrong' && countdown !== null && countdown > 0 && (
            <span className="ml-2 text-lg opacity-80">({countdown})</span>
          )}
        </button>
      )}
    </div>
  );
}
