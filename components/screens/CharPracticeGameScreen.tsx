'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CharPracticeSettings } from '@/lib/types';
import { getCharSet, CHAR_LOCALE, ROMAJI, generateCharChoices } from '@/lib/characters';
import { speakChar } from '@/lib/speech';
import { getCharBestStreak, saveCharBestStreak } from '@/lib/storage';
import { playCorrect, playWrong, playNewBest } from '@/lib/sounds';
import { saveRankEntry } from '@/lib/ranking';
import ElapsedTimer from '@/components/ui/ElapsedTimer';

interface Props {
  playerName: string;
  settings: CharPracticeSettings;
  onHome: () => void;
}

const AUTO_ADVANCE_SECS = 3;

export default function CharPracticeGameScreen({ playerName, settings, onHome }: Props) {
  const chars = getCharSet(settings.contentType);
  const locale = CHAR_LOCALE[settings.contentType];

  const [currentChar, setCurrentChar] = useState<string>('');
  const [choices, setChoices]         = useState<string[]>([]);
  const [selected, setSelected]       = useState<string | null>(null);
  const [feedback, setFeedback]       = useState<'correct' | 'newbest' | 'wrong' | null>(null);
  const [streak, setStreak]           = useState(0);
  const [bestStreak, setBestStreak]   = useState(0);
  const [countdown, setCountdown]     = useState<number | null>(null);

  const nextQuestion = useCallback(() => {
    const randomChar = chars[Math.floor(Math.random() * chars.length)];
    setCurrentChar(randomChar);
    setChoices(generateCharChoices(randomChar, chars));
    setSelected(null);
    setFeedback(null);
    setCountdown(null);
    // Auto-play TTS for new character
    speakChar(randomChar, locale);
  }, [chars, locale]);

  // Init
  useEffect(() => {
    setBestStreak(getCharBestStreak(playerName, settings.contentType));
    nextQuestion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName, settings.contentType]);

  // Countdown after correct
  useEffect(() => {
    if (feedback === 'correct' || feedback === 'newbest') {
      setCountdown(AUTO_ADVANCE_SECS);
    }
  }, [feedback]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { nextQuestion(); return; }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown, nextQuestion]);

  function handleChoice(choice: string) {
    if (feedback !== null || !currentChar) return;
    setSelected(choice);

    if (choice === currentChar) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        saveCharBestStreak(playerName, settings.contentType, newStreak);
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

  function handleSpeak() {
    if (currentChar) speakChar(currentChar, locale);
  }

  const romaji = ROMAJI[currentChar] ?? '';

  return (
    <div className="flex flex-col gap-3 px-4 py-4 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            saveRankEntry({ playerName, score: bestStreak, mode: 'char-practice' });
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
        ちゃん、おとをきいてもじをえらんでね！
      </p>

      {/* Streak counter */}
      <div
        className="text-center bg-white rounded-2xl border-4 py-2 shadow-md"
        style={{ borderColor: 'var(--color-bingo-purple)' }}
      >
        <p className="text-sm font-bold text-[var(--color-bingo-purple)] mb-1">れんぞく正解</p>
        <p
          key={streak}
          className="text-6xl font-black text-[var(--color-bingo-purple)] animate-[number-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        >
          {streak}
        </p>
        <p className="text-sm text-gray-400 mt-1">もん</p>
      </div>

      {/* Audio prompt */}
      <div
        className="text-center rounded-3xl border-4 py-3 px-6 shadow-lg"
        style={{ background: 'var(--color-bingo-yellow)', borderColor: 'var(--color-bingo-orange)' }}
      >
        <p className="text-sm font-bold text-gray-500 mb-3">もんだい：このおとはどのもじ？</p>
        <button
          onClick={handleSpeak}
          className="text-6xl leading-none active:scale-90 transition-transform"
          aria-label="もう一度きく"
        >
          🔊
        </button>
        <p className="text-xs text-gray-400 mt-2 font-bold">タップしてもう一度きこう</p>

        {/* Reveal character + romaji after answering */}
        {feedback && (
          <div className="mt-3 animate-[bounce-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]">
            <p
              className="font-black leading-none"
              style={{ fontSize: '3.5rem', color: '#1e293b' }}
            >
              {currentChar}
            </p>
            {romaji && (
              <p className="text-base font-bold text-gray-500 mt-1">{romaji}</p>
            )}
          </div>
        )}
      </div>

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
            <p className="text-3xl font-black text-white">よくできました！ 🎉</p>
          ) : (
            <>
              <p className="text-2xl font-black text-white mb-1">おしい！もう一回！ 💪</p>
              <div className="bg-white rounded-xl py-2 px-4 mx-4">
                <p className="text-xs font-bold text-gray-400 mb-0.5">せいかいは</p>
                <p className="text-4xl font-black" style={{ color: 'var(--color-bingo-blue)' }}>
                  {currentChar}
                </p>
                {romaji && (
                  <p className="text-sm font-bold text-gray-400 mt-0.5">{romaji}</p>
                )}
                <p className="text-xs font-bold text-gray-400 mt-0.5">だよ！</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* 4-choice grid */}
      {currentChar && (
        <div className="grid grid-cols-2 gap-3">
          {choices.map((choice) => {
            const isCorrectChoice  = choice === currentChar;
            const isSelectedWrong  = choice === selected && feedback === 'wrong';
            const answered         = feedback !== null;

            let bg     = 'white';
            let border = '#e5e7eb';
            let text   = '#374151';

            if (answered) {
              if (isCorrectChoice) {
                bg = 'var(--color-bingo-green)'; border = 'var(--color-bingo-green)'; text = 'white';
              } else if (isSelectedWrong) {
                bg = 'var(--color-bingo-orange)'; border = 'var(--color-bingo-orange)'; text = 'white';
              } else {
                bg = '#f9fafb'; text = '#d1d5db'; border = '#f3f4f6';
              }
            }

            return (
              <button
                key={choice}
                onClick={() => handleChoice(choice)}
                disabled={answered}
                className="rounded-2xl border-4 py-7 font-black transition-all active:scale-90 shadow-sm disabled:cursor-default"
                style={{
                  background: bg,
                  borderColor: border,
                  color: text,
                  fontSize: settings.contentType === 'alphabet' ? '2.5rem' : '3rem',
                }}
              >
                {choice}
              </button>
            );
          })}
        </div>
      )}

      {/* Next button */}
      {feedback && (
        <button
          onClick={nextQuestion}
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
