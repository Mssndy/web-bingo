'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  generateQuiz,
  scoreToResult,
  QUIZ_LENGTH_OPTIONS,
  DEFAULT_QUIZ_LENGTH,
  DEFAULT_SUB_LEVEL,
  type IqProblem,
  type QuizLength,
  type IqResult,
  type IqMode,
  type SubLevel,
} from '@/lib/iq-quiz';
import { playCorrect, playWrong, playMiniGameStart, playNewBest } from '@/lib/sounds';

interface Props {
  playerName: string;
  onHome: () => void;
}

type Phase = 'setup' | 'quiz' | 'result';

const AGE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// Preset name buttons. The last entry switches to a free text input.
const NAME_PRESETS = ['かずと', 'せりか', 'はると', 'ゆいと'] as const;
const OTHER = 'その他' as const;

const COLOR_BG: Record<IqResult['color'], string> = {
  pink:   'linear-gradient(135deg, #ff6b9d 0%, #cc5de8 100%)',
  orange: 'linear-gradient(135deg, #ff922b 0%, #ff6b9d 100%)',
  yellow: 'linear-gradient(135deg, #ffd93d 0%, #ff922b 100%)',
  green:  'linear-gradient(135deg, #6bcb77 0%, #4d96ff 100%)',
  blue:   'linear-gradient(135deg, #4d96ff 0%, #cc5de8 100%)',
  purple: 'linear-gradient(135deg, #cc5de8 0%, #4d96ff 100%)',
};

// ── Visual: how the question is shown ──────────────────────────────────────

function VisualBlock({ problem }: { problem: IqProblem }) {
  if (problem.kind === 'odd-one-out') {
    // The choice grid IS the visual — render no extra block.
    return null;
  }

  // Multi-line text kinds: logic, long-logic, analogy
  if (problem.kind === 'logic' || problem.kind === 'long-logic' || problem.kind === 'analogy') {
    return (
      <div className="flex flex-col gap-2 w-full">
        {problem.visual.map((line, i) => (
          <div
            key={i}
            className="rounded-2xl border-4 px-4 py-3 text-center text-xl font-black text-gray-700"
            style={{
              background: 'white',
              borderColor: 'var(--color-bingo-purple)',
            }}
          >
            {line}
          </div>
        ))}
      </div>
    );
  }

  // Single big expression — mental math
  if (problem.kind === 'mental-math') {
    return (
      <div
        className="rounded-3xl border-4 p-6 text-center"
        style={{ background: 'white', borderColor: 'var(--color-bingo-blue)' }}
      >
        <p className="text-4xl font-black text-gray-800 tracking-wider">
          {problem.visual[0]}
        </p>
      </div>
    );
  }

  if (problem.kind === 'count') {
    return (
      <div
        className="rounded-3xl border-4 p-3"
        style={{ background: 'white', borderColor: 'var(--color-bingo-orange)' }}
      >
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {problem.visual.map((tok, i) => (
            <span key={i} className="text-3xl text-center leading-none select-none">
              {tok}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Token-row kinds: pattern, sequence, size-order, adv-sequence, letter-seq
  const isNumeric = problem.kind === 'sequence' || problem.kind === 'adv-sequence' || problem.kind === 'letter-seq';
  return (
    <div
      className="rounded-3xl border-4 p-3 overflow-x-auto"
      style={{
        background: 'white',
        borderColor: isNumeric ? 'var(--color-bingo-blue)' : 'var(--color-bingo-purple)',
      }}
    >
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {problem.visual.map((tok, i) => (
          <div
            key={i}
            className={
              isNumeric
                ? 'min-w-[48px] h-[48px] rounded-xl border-2 flex items-center justify-center text-2xl font-black'
                : 'text-4xl leading-none select-none'
            }
            style={isNumeric ? {
              background: tok === '?' ? '#fefce8' : '#f0f9ff',
              borderColor: tok === '?' ? '#fbbf24' : '#bae6fd',
              color: '#1e293b',
              borderStyle: tok === '?' ? 'dashed' : 'solid',
            } : {
              opacity: tok === '?' ? 0.4 : 1,
            }}
          >
            {tok}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Star row used on result screen ─────────────────────────────────────────

function StarRow({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length: max }).map((_, i) => {
        const lit = i < count;
        return (
          <span
            key={i}
            className="text-3xl"
            style={{
              opacity: lit ? 1 : 0.25,
              filter: lit ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' : 'grayscale(1)',
              animation: lit
                ? `bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.15 + i * 0.12}s both`
                : undefined,
            }}
          >
            ⭐
          </span>
        );
      })}
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function IqGameScreen({ playerName, onHome }: Props) {
  const [phase, setPhase]       = useState<Phase>('setup');
  const [age, setAge]           = useState<number>(6);
  const [mode, setMode]         = useState<IqMode>('kid');
  // Name selection: which preset is active (or OTHER for free text), plus
  // the actual text used when OTHER is selected.
  const initialNamePreset = (NAME_PRESETS as readonly string[]).includes(playerName)
    ? (playerName as typeof NAME_PRESETS[number])
    : OTHER;
  const [namePreset, setNamePreset] = useState<typeof NAME_PRESETS[number] | typeof OTHER>(initialNamePreset);
  const [otherName,  setOtherName]  = useState<string>(playerName ?? '');
  const [count, setCount]       = useState<QuizLength>(DEFAULT_QUIZ_LENGTH);
  const [subLevel, setSubLevel] = useState<SubLevel>(DEFAULT_SUB_LEVEL);
  const [quiz, setQuiz]         = useState<IqProblem[]>([]);
  const [qIndex, setQIndex]     = useState(0);
  const [correctCount, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Display name resolved from current selection. Falls back to playerName, then "プレイヤー".
  const displayName = namePreset === OTHER
    ? (otherName.trim() || playerName || 'プレイヤー')
    : namePreset;

  const current = quiz[qIndex];
  const result  = useMemo<IqResult | null>(
    () => (phase === 'result' ? scoreToResult(correctCount, quiz.length, age, mode, subLevel) : null),
    [phase, correctCount, quiz.length, age, mode, subLevel],
  );

  const handleStart = useCallback(() => {
    playMiniGameStart();
    setQuiz(generateQuiz(age, count, mode, subLevel));
    setQIndex(0);
    setCorrect(0);
    setFeedback(null);
    setSelected(null);
    setPhase('quiz');
  }, [age, count, mode, subLevel]);

  const handleChoice = useCallback((label: string) => {
    if (feedback !== null || !current) return;
    setSelected(label);
    const isCorrect = current.choices.find((c) => c.label === label)?.correct;
    if (isCorrect) {
      playCorrect();
      setCorrect((c) => c + 1);
      setFeedback('correct');
    } else {
      playWrong();
      setFeedback('wrong');
    }
  }, [feedback, current]);

  const handleNext = useCallback(() => {
    if (qIndex + 1 >= quiz.length) {
      playNewBest();
      setPhase('result');
      return;
    }
    setQIndex((i) => i + 1);
    setFeedback(null);
    setSelected(null);
  }, [qIndex, quiz.length]);

  const handlePlayAgain = useCallback(() => {
    setPhase('setup');
    setQuiz([]);
    setQIndex(0);
    setCorrect(0);
    setFeedback(null);
    setSelected(null);
  }, []);

  // ── Setup phase ────────────────────────────────────────────────────────

  if (phase === 'setup') {
    const isAdult = mode === 'adult';
    const startDisabled = namePreset === OTHER && !otherName.trim() && !playerName;
    // Sub-level picker config: label + bg gradient when active
    const subOptions: { value: SubLevel; label: string; gradient: string; activeBorder: string; shadow: string }[] = [
      { value: 'easy',   label: isAdult ? 'やさしい' : 'かんたん',   gradient: 'linear-gradient(135deg, #6bcb77 0%, #4d96ff 100%)', activeBorder: '#6bcb77', shadow: 'rgba(107,203,119,0.35)' },
      { value: 'normal', label: 'ふつう',                             gradient: 'linear-gradient(135deg, #ffd93d 0%, #ff922b 100%)', activeBorder: '#ff922b', shadow: 'rgba(255,146,43,0.35)' },
      { value: 'hard',   label: 'むずかしい',                         gradient: 'linear-gradient(135deg, #cc5de8 0%, #ff6b9d 100%)', activeBorder: '#cc5de8', shadow: 'rgba(204,93,232,0.35)' },
    ];

    return (
      <div className="flex flex-col gap-4 px-4 py-4 animate-[fade-in_0.3s_ease_both]">
        <div className="flex items-center justify-between">
          <button
            onClick={onHome}
            className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
            aria-label="ホームにもどる"
          >
            🏠
          </button>
          <div className="w-10" />
        </div>

        <div className="text-center">
          <h2
            className="text-3xl font-black"
            style={{
              background: isAdult
                ? 'linear-gradient(90deg, #1e293b 0%, #4d96ff 50%, #cc5de8 100%)'
                : 'linear-gradient(90deg, #cc5de8 0%, #ff6b9d 50%, #ff922b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            🧠 ひらめき診断{isAdult ? ' [大人]' : ''}
          </h2>
          <p className="text-sm text-gray-500 font-bold mt-1">
            {isAdult ? `${displayName} さん、準備はいい？` : `${displayName}、なんさい？`}
          </p>
        </div>

        {/* Name picker */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-black text-gray-500 text-center">
            {isAdult ? 'お名前' : 'なまえを えらんでね'}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {NAME_PRESETS.map((n) => {
              const active = namePreset === n;
              return (
                <button
                  key={n}
                  onClick={() => setNamePreset(n)}
                  className="rounded-2xl py-3 text-sm font-black transition-all active:scale-90 shadow"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #6bcb77 0%, #4d96ff 100%)'
                      : 'white',
                    color: active ? 'white' : '#94a3b8',
                    border: active ? '3px solid #4d96ff' : '3px solid #e5e7eb',
                    boxShadow: active ? '0 4px 12px rgba(77,150,255,0.35)' : undefined,
                  }}
                >
                  {n}
                </button>
              );
            })}
            <button
              onClick={() => setNamePreset(OTHER)}
              className="rounded-2xl py-3 text-xs font-black transition-all active:scale-90 shadow leading-tight"
              style={{
                background: namePreset === OTHER
                  ? 'linear-gradient(135deg, #6bcb77 0%, #4d96ff 100%)'
                  : 'white',
                color: namePreset === OTHER ? 'white' : '#94a3b8',
                border: namePreset === OTHER ? '3px solid #4d96ff' : '3px solid #e5e7eb',
                boxShadow: namePreset === OTHER ? '0 4px 12px rgba(77,150,255,0.35)' : undefined,
              }}
            >
              その他
              <div className="text-[9px] opacity-80">(おとな含む)</div>
            </button>
          </div>
          {namePreset === OTHER && (
            <input
              type="text"
              value={otherName}
              onChange={(e) => setOtherName(e.target.value.slice(0, 12))}
              maxLength={12}
              placeholder="なまえを にゅうりょく"
              className="w-full px-4 py-3 rounded-2xl text-center font-black text-gray-700 outline-none"
              style={{ background: 'white', border: '2px solid #e5e7eb' }}
              aria-label="お名前を入力"
            />
          )}
        </div>

        {/* Age picker — 0..12 + おとなモード */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-black text-gray-500 text-center">
            {isAdult ? 'モード' : 'なんさい？'}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {AGE_OPTIONS.map((a) => {
              const active = mode === 'kid' && a === age;
              return (
                <button
                  key={a}
                  onClick={() => { setMode('kid'); setAge(a); }}
                  className="rounded-2xl py-3 text-xl font-black transition-all active:scale-90 shadow"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #cc5de8 0%, #ff6b9d 100%)'
                      : 'white',
                    color: active ? 'white' : '#94a3b8',
                    border: active ? '3px solid #ff6b9d' : '3px solid #e5e7eb',
                    boxShadow: active ? '0 4px 12px rgba(204,93,232,0.35)' : undefined,
                  }}
                >
                  {a}
                </button>
              );
            })}
            {/* Adult mode button — spans 2 cols so it stands out */}
            <button
              onClick={() => setMode('adult')}
              className="col-span-2 rounded-2xl py-3 text-sm font-black transition-all active:scale-90 shadow leading-tight"
              style={{
                background: isAdult
                  ? 'linear-gradient(135deg, #1e293b 0%, #4d96ff 100%)'
                  : 'white',
                color: isAdult ? 'white' : '#475569',
                border: isAdult ? '3px solid #4d96ff' : '3px solid #cbd5e1',
                boxShadow: isAdult ? '0 4px 12px rgba(30,41,59,0.35)' : undefined,
              }}
            >
              🎩 おとなモード
            </button>
          </div>
        </div>

        {/* Sub-difficulty picker — within the chosen age, pick かんたん/ふつう/むずかしい */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-black text-gray-500 text-center">
            {isAdult ? '難しさ' : 'むずかしさ'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {subOptions.map((opt) => {
              const active = subLevel === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSubLevel(opt.value)}
                  className="rounded-2xl py-3 text-base font-black transition-all active:scale-90 shadow"
                  style={{
                    background: active ? opt.gradient : 'white',
                    color: active ? 'white' : '#94a3b8',
                    border: `3px solid ${active ? opt.activeBorder : '#e5e7eb'}`,
                    boxShadow: active ? `0 4px 12px ${opt.shadow}` : undefined,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question count */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-black text-gray-500 text-center">
            {isAdult ? '出題数' : 'なんもん やる？'}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {QUIZ_LENGTH_OPTIONS.map((n) => {
              const active = n === count;
              return (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className="rounded-2xl py-3 font-black transition-all active:scale-90 shadow"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #4d96ff 0%, #cc5de8 100%)'
                      : 'white',
                    color: active ? 'white' : '#94a3b8',
                    border: active ? '3px solid #4d96ff' : '3px solid #e5e7eb',
                    boxShadow: active ? '0 4px 12px rgba(77,150,255,0.35)' : undefined,
                  }}
                >
                  <div className="text-xl">{n}</div>
                  <div className="text-[9px] opacity-80">{isAdult ? '問' : 'もん'}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={startDisabled}
          className="w-full py-5 rounded-3xl text-2xl font-black text-white shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isAdult
              ? 'linear-gradient(135deg, #1e293b 0%, #4d96ff 100%)'
              : 'linear-gradient(135deg, #cc5de8 0%, #ff6b9d 100%)',
            animation: startDisabled ? undefined : 'float-bob-1 3s ease-in-out infinite',
          }}
        >
          {isAdult ? '🚀 スタート' : '✨ スタート！'}
        </button>

        <p className="text-xs text-gray-400 font-bold text-center">
          {isAdult
            ? `${count}問でひらめきIQを測定します`
            : `${count}もん やって、ひらめき IQ を しらべよう！`}
        </p>
      </div>
    );
  }

  // ── Quiz phase ─────────────────────────────────────────────────────────

  if (phase === 'quiz' && current) {
    const isOddOneOut = current.kind === 'odd-one-out';
    return (
      <div className="flex flex-col gap-3 px-4 py-4 animate-[fade-in_0.3s_ease_both]">

        <div className="flex items-center justify-between">
          <button
            onClick={onHome}
            className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
            aria-label="ホームにもどる"
          >
            🏠
          </button>
          <div className="text-center">
            <p className="text-xs font-black text-gray-400">もんだい</p>
            <p className="text-base font-black text-gray-700">
              {qIndex + 1} / {quiz.length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-gray-400">せいかい</p>
            <p className="text-base font-black" style={{ color: 'var(--color-bingo-green)' }}>
              {correctCount}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {quiz.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-2 rounded-full transition-all"
              style={{
                background:
                  i < qIndex
                    ? 'var(--color-bingo-green)'
                    : i === qIndex
                    ? 'var(--color-bingo-orange)'
                    : '#e5e7eb',
              }}
            />
          ))}
        </div>

        {/* Prompt */}
        <div
          key={current.id}
          className="text-center rounded-3xl border-4 py-3 px-4 shadow-md animate-[bounce-in_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          style={{
            background: 'var(--color-bingo-yellow)',
            borderColor: 'var(--color-bingo-orange)',
          }}
        >
          <p className="text-xl font-black text-gray-800">{current.prompt}</p>
        </div>

        {/* Visual */}
        {!isOddOneOut && <VisualBlock problem={current} />}

        {/* Choices */}
        <div className={isOddOneOut ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-3'}>
          {current.choices.map((choice, i) => {
            const answered = feedback !== null;
            const isCorrect = choice.correct;
            const isSelectedWrong = selected === choice.label && !choice.correct;

            let bg = 'white';
            let border = '#e5e7eb';
            let text = '#374151';

            if (answered) {
              if (isCorrect) {
                bg = 'var(--color-bingo-green)';
                border = 'var(--color-bingo-green)';
                text = 'white';
              } else if (isSelectedWrong) {
                bg = 'var(--color-bingo-blue)';
                border = 'var(--color-bingo-blue)';
                text = 'white';
              } else {
                bg = '#f9fafb';
                border = '#f3f4f6';
                text = '#d1d5db';
              }
            }

            // Scale text down for longer labels (analogy answers can be 3+ kanji)
            const len = [...choice.label].length;
            const sizeClass = len <= 2 ? 'text-3xl' : len <= 4 ? 'text-2xl' : 'text-xl';
            return (
              <button
                key={`${choice.label}-${i}`}
                onClick={() => handleChoice(choice.label)}
                disabled={answered}
                className={`rounded-2xl border-4 py-5 px-2 ${sizeClass} font-black transition-all active:scale-90 shadow-sm disabled:cursor-default min-h-[80px] flex items-center justify-center text-center break-words`}
                style={{ background: bg, borderColor: border, color: text }}
              >
                {choice.label}
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <>
            <div
              key={`fb-${qIndex}`}
              className="text-center rounded-2xl py-3 border-4 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
              style={
                feedback === 'wrong'
                  ? { background: 'var(--color-bingo-blue)', borderColor: 'var(--color-bingo-blue)' }
                  : { background: 'var(--color-bingo-green)', borderColor: 'var(--color-bingo-green)' }
              }
            >
              <p className="text-2xl font-black text-white">
                {feedback === 'correct'
                  ? (mode === 'adult' ? '🎉 正解！' : '🎉 せいかい！')
                  : (mode === 'adult' ? '💡 惜しい！' : '💪 おしい！もう一回チャレンジ！')}
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full text-xl font-black text-white rounded-2xl py-4 shadow-lg active:scale-95 transition-transform"
              style={{
                background: feedback === 'correct'
                  ? 'var(--color-bingo-green)'
                  : 'var(--color-bingo-blue)',
              }}
            >
              {qIndex + 1 >= quiz.length
                ? (mode === 'adult' ? '🏁 結果を見る' : '🏁 けっか を みる')
                : (mode === 'adult' ? '次の問題 →' : 'つぎの もんだい →')}
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Result phase ───────────────────────────────────────────────────────

  if (phase === 'result' && result) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4 animate-[fade-in_0.3s_ease_both]">
        <div className="flex items-center justify-between">
          <button
            onClick={onHome}
            className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
            aria-label="ホームにもどる"
          >
            🏠
          </button>
          <div className="w-10" />
        </div>

        {/* Big result card */}
        <div
          className="rounded-3xl shadow-xl px-5 py-6 text-center text-white animate-[bounce-in_0.6s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          style={{ background: COLOR_BG[result.color] }}
        >
          <div className="text-6xl mb-1" style={{ animation: 'float-bob-1 3s ease-in-out infinite' }}>
            {result.emoji}
          </div>
          <h2 className="text-2xl font-black drop-shadow mb-1">{result.title}</h2>
          <p className="text-sm font-bold opacity-90">{result.message}</p>

          <div className="mt-3">
            <StarRow count={result.stars} />
          </div>

          {/* IQ score panel */}
          <div
            className="mt-4 rounded-2xl px-4 py-3 inline-block"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}
          >
            <p className="text-xs font-black tracking-wider opacity-90">ひらめき IQ</p>
            <p
              className="text-6xl font-black drop-shadow-lg leading-none mt-1"
              style={{ animation: 'number-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' }}
            >
              {result.iq}
            </p>
          </div>
        </div>

        {/* Detail strip */}
        <div
          className="rounded-2xl bg-white shadow-md border-2 p-3 flex items-center justify-around text-center"
          style={{ borderColor: 'rgba(0,0,0,0.06)' }}
        >
          <div>
            <p className="text-xs font-black text-gray-400">{mode === 'adult' ? 'プレイヤー' : 'なまえ'}</p>
            <p className="text-base font-black text-gray-700 max-w-[80px] truncate">{displayName}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-xs font-black text-gray-400">{mode === 'adult' ? 'モード' : 'なんさい'}</p>
            <p className="text-base font-black text-gray-700">
              {mode === 'adult' ? '🎩 大人' : `${age}さい`}
            </p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-xs font-black text-gray-400">{mode === 'adult' ? '正解' : 'せいかい'}</p>
            <p className="text-base font-black" style={{ color: 'var(--color-bingo-green)' }}>
              {correctCount}/{quiz.length}
            </p>
          </div>
        </div>

        <button
          onClick={handlePlayAgain}
          className="w-full py-4 rounded-3xl text-xl font-black text-white shadow-lg active:scale-95 transition-all"
          style={{
            background: mode === 'adult'
              ? 'linear-gradient(135deg, #1e293b 0%, #4d96ff 100%)'
              : 'linear-gradient(135deg, #cc5de8 0%, #ff6b9d 100%)',
          }}
        >
          🔁 {mode === 'adult' ? 'もう一度挑戦' : 'もう一回 やる！'}
        </button>

        <button
          onClick={onHome}
          className="w-full py-3 rounded-2xl text-base font-black text-gray-500 active:scale-95 transition-all bg-white shadow"
          style={{ border: '2px solid #e5e7eb' }}
        >
          🏠 {mode === 'adult' ? 'ホームに戻る' : 'ホームに もどる'}
        </button>
      </div>
    );
  }

  return null;
}
