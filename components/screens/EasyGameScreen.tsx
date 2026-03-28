'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EasyProblem, EasySettings } from '@/lib/types';
import { generateEasyProblem, generateChoices } from '@/lib/easy-problems';
import { getEasyBestStreak, saveEasyBestStreak } from '@/lib/storage';
import { playCorrect, playWrong, playNewBest } from '@/lib/sounds';
import { speakFeedback } from '@/lib/speech';
import { saveRankEntry } from '@/lib/ranking';
import ElapsedTimer from '@/components/ui/ElapsedTimer';
import Mascot, { type MascotState } from '@/components/ui/Mascot';

const SESSION_GOAL = 5;

interface Props {
  playerName: string;
  settings: EasySettings;
  onHome: () => void;
  onSessionComplete: (correctCount: number) => void;
}

const AUTO_ADVANCE_SECS = 3;

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Fixed 5-per-row grid of emoji items */
function ItemGrid({
  count,
  emoji = '🍎',
  dimCount = 0,
  color = '#f9fafb',
  borderColor = '#d1d5db',
  label,
}: {
  count: number;
  emoji?: string;
  dimCount?: number;
  color?: string;
  borderColor?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="rounded-2xl p-2.5 border-2" style={{ background: color, borderColor }}>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {Array.from({ length: count }).map((_, i) => (
            <span key={`b-${i}`} className="text-3xl leading-none text-center select-none">{emoji}</span>
          ))}
          {Array.from({ length: dimCount }).map((_, i) => (
            <span
              key={`d-${i}`}
              className="text-3xl leading-none text-center select-none"
              style={{ filter: 'grayscale(1)', opacity: 0.25 }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>
      {label && <span className="text-sm font-black text-gray-500">{label}</span>}
    </div>
  );
}

/** Colored rows for multiplication: operandA rows of operandB emoji each */
function MultiplyRows({
  rows,
  cols,
  emoji,
}: {
  rows: number;
  cols: number;
  emoji: string;
}) {
  const rowStyles = [
    { bg: '#fef2f2', border: '#fca5a5' },
    { bg: '#eff6ff', border: '#93c5fd' },
    { bg: '#f0fdf4', border: '#86efac' },
    { bg: '#fefce8', border: '#fde047' },
    { bg: '#fdf4ff', border: '#d8b4fe' },
  ];
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: rows }).map((_, r) => {
        const s = rowStyles[r % rowStyles.length];
        return (
          <div key={r} className="flex items-center gap-2">
            <div
              className="rounded-xl border-2 px-2.5 py-1.5 flex gap-1.5 items-center"
              style={{ background: s.bg, borderColor: s.border }}
            >
              {Array.from({ length: cols }).map((_, c) => (
                <span key={c} className="text-3xl leading-none select-none">{emoji}</span>
              ))}
            </div>
            <span className="text-xs font-black text-gray-400 shrink-0">{cols}こ</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Visual question (before answering) ───────────────────────────────────────

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
          <ItemGrid count={operandA} color="#f0fdf4" borderColor="#86efac" label={`${operandA}こ`} />
          <span className="text-3xl font-black" style={{ color: 'var(--color-bingo-green)' }}>＋</span>
          <ItemGrid count={operandB} color="#eff6ff" borderColor="#93c5fd" label={`${operandB}こ`} />
          <span className="text-3xl font-black text-gray-400">＝</span>
          <div className="rounded-2xl px-8 py-3 border-2 border-dashed flex items-center justify-center"
            style={{ background: '#fefce8', borderColor: '#fbbf24' }}>
            <span className="text-3xl font-black text-gray-400">？</span>
          </div>
          <span className="text-sm font-black text-gray-400">なんこ？</span>
        </div>
      </div>
    );
  }

  if (operator === '-') {
    return (
      <div
        className="rounded-3xl border-4 p-4"
        style={{ background: 'white', borderColor: 'var(--color-bingo-orange)' }}
      >
        <p className="text-center text-xs font-bold text-gray-400 mb-3">りんごをかぞえてみよう！</p>
        <div className="flex flex-col items-center gap-3">
          <ItemGrid
            count={problem.answer}
            dimCount={operandB}
            color="#f9fafb"
            borderColor="#d1d5db"
            label={`ぜんぶで ${operandA}こ`}
          />
          <span className="text-base font-black" style={{ color: 'var(--color-bingo-blue)' }}>
            {operandB}こ とったら…？
          </span>
          <div className="rounded-2xl px-8 py-3 border-2 border-dashed flex items-center justify-center"
            style={{ background: '#fefce8', borderColor: '#fbbf24' }}>
            <span className="text-3xl font-black text-gray-400">？</span>
          </div>
          <span className="text-sm font-black text-gray-400">のこりなんこ？</span>
        </div>
      </div>
    );
  }

  // Multiplication
  return (
    <div
      className="rounded-3xl border-4 p-4"
      style={{ background: 'white', borderColor: 'var(--color-bingo-purple)' }}
    >
      <p className="text-center text-xs font-bold text-gray-400 mb-2">かたまりをかぞえてみよう！</p>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-black text-gray-500">
          <span style={{ color: 'var(--color-bingo-purple)' }}>{operandA}かたまり</span>
          、それぞれ
          <span style={{ color: 'var(--color-bingo-orange)' }}>{operandB}こずつ</span>
        </p>
        <MultiplyRows rows={operandA} cols={operandB} emoji={problem.emoji ?? '🍎'} />
        <span className="text-3xl font-black text-gray-400">＝</span>
        <div className="rounded-2xl px-8 py-3 border-2 border-dashed flex items-center justify-center"
          style={{ background: '#fefce8', borderColor: '#fbbf24' }}>
          <span className="text-3xl font-black text-gray-400">？</span>
        </div>
        <span className="text-sm font-black text-gray-400">ぜんぶでなんこ？</span>
      </div>
    </div>
  );
}

// ── Visual feedback (after answering) ────────────────────────────────────────

function VisualFeedback({ problem }: { problem: EasyProblem }) {
  const { operator, operandA, operandB, answer } = problem;
  const emoji = problem.emoji ?? '🍎';

  if (operator === '+') {
    return (
      <div
        className="rounded-3xl border-4 p-4 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        style={{ background: 'white', borderColor: 'var(--color-bingo-green)' }}
      >
        <p className="text-center text-xs font-bold text-gray-400 mb-3">りんごでかんがえてみよう！</p>
        <div className="flex flex-col items-center gap-2">
          <ItemGrid count={operandA} color="#f0fdf4" borderColor="#86efac" label={`${operandA}こ`} />
          <span className="text-3xl font-black" style={{ color: 'var(--color-bingo-green)' }}>＋</span>
          <ItemGrid count={operandB} color="#eff6ff" borderColor="#93c5fd" label={`${operandB}こ`} />
          <span className="text-3xl font-black text-gray-400">＝</span>
          <ItemGrid count={answer} color="#fefce8" borderColor="#fbbf24" label={`${answer}こ！`} />
        </div>
      </div>
    );
  }

  if (operator === '-') {
    return (
      <div
        className="rounded-3xl border-4 p-4 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        style={{ background: 'white', borderColor: 'var(--color-bingo-blue)' }}
      >
        <p className="text-center text-xs font-bold text-gray-400 mb-3">りんごでかんがえてみよう！</p>
        <div className="flex flex-col items-center gap-3">
          <ItemGrid
            count={answer}
            dimCount={operandB}
            color="#f9fafb"
            borderColor="#d1d5db"
            label={`ぜんぶで ${operandA}こ`}
          />
          <span className="text-base font-black" style={{ color: 'var(--color-bingo-blue)' }}>
            {operandB}こ とった →
          </span>
          <ItemGrid count={answer} color="#f0fdf4" borderColor="#86efac" label={`のこり ${answer}こ！`} />
        </div>
      </div>
    );
  }

  // Multiplication
  return (
    <div
      className="rounded-3xl border-4 p-4 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
      style={{ background: 'white', borderColor: 'var(--color-bingo-purple)' }}
    >
      <p className="text-center text-xs font-bold text-gray-400 mb-2">かたまりでかんがえてみよう！</p>
      <div className="flex flex-col items-center gap-2">
        <MultiplyRows rows={operandA} cols={operandB} emoji={emoji} />
        <span className="text-3xl font-black text-gray-400">＝</span>
        <div
          className="rounded-2xl px-6 py-2 border-2 flex items-center gap-1.5"
          style={{ background: '#fefce8', borderColor: '#fbbf24' }}
        >
          <span className="text-4xl font-black" style={{ color: 'var(--color-bingo-purple)' }}>
            {answer}
          </span>
          <span className="text-base font-black text-gray-500">こ！</span>
        </div>
        <span className="text-xs font-black text-gray-400">
          {operandA}かたまり × {operandB}こ ＝ {answer}こ
        </span>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function EasyGameScreen({ playerName, settings, onHome, onSessionComplete }: Props) {
  const [problem, setProblem]           = useState<EasyProblem | null>(null);
  const [choices, setChoices]           = useState<number[]>([]);
  const [selected, setSelected]         = useState<number | null>(null);
  const [feedback, setFeedback]         = useState<'correct' | 'newbest' | 'wrong' | null>(null);
  const [streak, setStreak]             = useState(0);
  const [bestStreak, setBestStreak]     = useState(0);
  const [countdown, setCountdown]       = useState<number | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [mascotState, setMascotState]   = useState<MascotState>('idle');

  const nextProblem = useCallback(() => {
    const p = generateEasyProblem(settings.operators);
    setProblem(p);
    setChoices(generateChoices(p.answer));
    setSelected(null);
    setFeedback(null);
    setCountdown(null);
  }, [settings]);

  // マスコットをidleに戻す
  useEffect(() => {
    if (mascotState !== 'idle') {
      const t = setTimeout(() => setMascotState('idle'), 800);
      return () => clearTimeout(t);
    }
  }, [mascotState]);

  useEffect(() => {
    setBestStreak(getEasyBestStreak(playerName));
    nextProblem();
  }, [playerName, nextProblem]);

  useEffect(() => {
    if (feedback === 'correct' || feedback === 'newbest') {
      setCountdown(AUTO_ADVANCE_SECS);
    }
  }, [feedback]);

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
      const newSessionCorrect = sessionCorrect + 1;
      setStreak(newStreak);
      setSessionCorrect(newSessionCorrect);

      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        saveEasyBestStreak(playerName, newStreak);
        playNewBest();
        speakFeedback('newbest');
        setMascotState('veryHappy');
        setFeedback('newbest');
      } else {
        playCorrect();
        speakFeedback('correct');
        setMascotState('happy');
        setFeedback('correct');
      }

      if (newSessionCorrect >= SESSION_GOAL) {
        setTimeout(() => onSessionComplete(SESSION_GOAL), 1800);
      }
    } else {
      playWrong();
      speakFeedback('wrong');
      setMascotState('encourage');
      setStreak(0);
      setFeedback('wrong');
    }
  }

  // Operator label for the problem header
  const opLabel = problem
    ? problem.operator === '+'
      ? 'たしざん'
      : problem.operator === '-'
      ? 'ひきざん'
      : 'かけざん'
    : '';
  const opColor = problem
    ? problem.operator === '+'
      ? 'var(--color-bingo-green)'
      : problem.operator === '-'
      ? 'var(--color-bingo-blue)'
      : 'var(--color-bingo-purple)'
    : '';

  return (
    <div className="flex flex-col gap-3 px-4 py-4 animate-[fade-in_0.3s_ease_both]">

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

      {/* セッション進捗 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-black text-gray-400 shrink-0">きょう</span>
        <div className="flex-1 flex gap-1">
          {Array.from({ length: SESSION_GOAL }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-3 rounded-full transition-all duration-300"
              style={{
                background: i < sessionCorrect
                  ? 'var(--color-bingo-green)'
                  : '#e5e7eb',
              }}
            />
          ))}
        </div>
        <span className="text-xs font-black text-gray-400 shrink-0">
          {sessionCorrect}/{SESSION_GOAL}
        </span>
      </div>

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
          className="text-center rounded-3xl border-4 py-3 px-6 shadow-lg"
          style={{
            background: 'var(--color-bingo-yellow)',
            borderColor: 'var(--color-bingo-orange)',
          }}
        >
          <p className="text-xs font-bold mb-1" style={{ color: opColor }}>{opLabel}</p>
          <p className="text-4xl font-black text-gray-800 tracking-wide">
            {problem.expression} ＝ ？
          </p>
        </div>
      )}

      {/* Visual aid */}
      {problem && !feedback && <VisualQuestion problem={problem} />}
      {problem && feedback && <VisualFeedback problem={problem} />}

      {/* Mascot + Feedback banner */}
      {feedback ? (
        <div className="flex items-center gap-3">
          <Mascot state={mascotState} size="sm" />
          <div
            key={feedback + streak}
            className="flex-1 text-center rounded-2xl py-3 border-4 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
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
              <p className="text-3xl font-black text-white">よくできました！ 🎉</p>
            ) : (
              <>
                <p className="text-2xl font-black text-white mb-1">おしい！もう一回！ 💪</p>
                <div className="bg-white rounded-xl py-2 px-4 mx-4">
                  <p className="text-xs font-bold text-gray-400 mb-0.5">せいかいは</p>
                  <p className="text-4xl font-black" style={{ color: 'var(--color-bingo-blue)' }}>{problem?.answer}</p>
                  <p className="text-xs font-bold text-gray-400 mt-0.5">だよ！</p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <Mascot state="idle" size="sm" />
        </div>
      )}

      {/* 4-choice grid — big tappable buttons for small fingers */}
      {problem && (
        <div className="grid grid-cols-2 gap-3">
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
                className="rounded-2xl border-4 py-5 text-4xl font-black transition-all active:scale-90 shadow-sm disabled:cursor-default"
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
