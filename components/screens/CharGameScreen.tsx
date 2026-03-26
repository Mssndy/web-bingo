'use client';

import { useEffect, useRef } from 'react';
import type { CharGameSettings } from '@/lib/types';
import type { CharGameState } from '@/lib/characters';
import { CHAR_LOCALE, ROMAJI } from '@/lib/characters';
import { speakChar } from '@/lib/speech';
import CharBingoCardDisplay from '@/components/game/CharBingoCardDisplay';
import DrawButton from '@/components/game/DrawButton';
import Button from '@/components/ui/Button';
import ElapsedTimer from '@/components/ui/ElapsedTimer';

interface Props {
  playerName: string;
  gameState: CharGameState;
  settings: CharGameSettings;
  onDraw: () => void;
  onCellTap: (row: number, col: number) => void;
  onFinish: () => void;
  onHome: () => void;
}

function CharDisplay({
  char,
  subMode,
  onSpeak,
}: {
  char: string | null;
  subMode: CharGameSettings['bingoSubMode'];
  onSpeak: () => void;
}) {
  if (!char) {
    return (
      <div
        className="text-center rounded-3xl border-4 py-8 px-6 shadow-lg"
        style={{ background: '#f0f4ff', borderColor: '#c7d2fe' }}
      >
        <p className="text-gray-400 font-bold text-lg">ボタンをおしてスタート！</p>
      </div>
    );
  }

  if (subMode === 'char-show') {
    return (
      <div
        className="text-center rounded-3xl border-4 py-6 px-6 shadow-lg"
        style={{ background: 'var(--color-bingo-yellow)', borderColor: 'var(--color-bingo-orange)' }}
      >
        <p className="text-sm font-bold text-gray-500 mb-2">このもじは？</p>
        <p
          className="font-black leading-none animate-[number-pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          style={{ fontSize: '5rem', color: '#1e293b' }}
        >
          {char}
        </p>
        <p className="text-base font-bold text-gray-400 mt-2">{ROMAJI[char] ?? ''}</p>
        <button
          onClick={onSpeak}
          className="mt-3 text-sm font-bold text-[var(--color-bingo-blue)] active:scale-95 transition-transform"
        >
          🔊 もう一度きく
        </button>
      </div>
    );
  }

  // sound-match mode: show speaker + character
  return (
    <div
      className="text-center rounded-3xl border-4 py-6 px-6 shadow-lg"
      style={{ background: 'var(--color-bingo-yellow)', borderColor: 'var(--color-bingo-orange)' }}
    >
      <p className="text-sm font-bold text-gray-500 mb-2">きいてカードをさがしてね！</p>
      <button
        onClick={onSpeak}
        className="text-6xl leading-none active:scale-90 transition-transform animate-[number-pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        aria-label="もう一度きく"
      >
        🔊
      </button>
      <p className="text-sm font-bold text-gray-400 mt-3">タップしてもう一度きこう</p>
      <p
        className="font-black mt-2 leading-none"
        style={{ fontSize: '3rem', color: '#1e293b' }}
      >
        {char}
      </p>
    </div>
  );
}

export default function CharGameScreen({
  playerName,
  gameState,
  settings,
  onDraw,
  onCellTap,
  onFinish,
  onHome,
}: Props) {
  const { drawnChars, currentChar, bingoCard, remainingChars, isGameOver } = gameState;
  const isWebCard = settings.cardMode === 'web';
  const locale = CHAR_LOCALE[settings.contentType];

  const prevCharRef = useRef<string | null>(null);

  // Auto-play TTS when a new character is drawn in sound-match mode
  useEffect(() => {
    if (
      settings.bingoSubMode === 'sound-match' &&
      currentChar &&
      currentChar !== prevCharRef.current
    ) {
      prevCharRef.current = currentChar;
      speakChar(currentChar, locale);
    }
  }, [currentChar, settings.bingoSubMode, locale]);

  function handleSpeak() {
    if (currentChar) speakChar(currentChar, locale);
  }

  const unmarkedCount = bingoCard
    ? bingoCard.marked.flat().filter((m) => !m).length
    : 0;

  return (
    <div className="flex flex-col gap-4 px-5 py-5 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onHome}
          className="flex items-center gap-1 text-sm font-bold text-gray-400 active:scale-95 transition-transform shrink-0"
        >
          🏠 ホーム
        </button>
        <ElapsedTimer />
      </div>

      {/* Greeting */}
      <p className="text-center text-base font-bold text-gray-500">
        <span className="font-black text-[var(--color-bingo-blue)]">{playerName}</span>
        ちゃん、がんばれ！🔥
      </p>

      {/* Character display */}
      <CharDisplay
        key={currentChar ?? 'empty'}
        char={currentChar}
        subMode={settings.bingoSubMode}
        onSpeak={handleSpeak}
      />

      {/* Draw button */}
      <DrawButton
        onDraw={onDraw}
        disabled={isGameOver}
        remaining={isWebCard ? unmarkedCount : remainingChars.length}
        label={isWebCard ? 'あと' : 'のこり'}
        unit={isWebCard ? 'マス' : '個'}
      />

      {/* Manual Bingo button — paper only */}
      {!isWebCard && (
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={onFinish}
          disabled={drawnChars.length === 0}
        >
          🏆 ビンゴ！
        </Button>
      )}

      {/* Web card */}
      {isWebCard && bingoCard && (
        <CharBingoCardDisplay
          card={bingoCard}
          drawnChars={drawnChars}
          onCellTap={onCellTap}
        />
      )}

      {/* Drawn history — paper mode (show chars as chips) */}
      {!isWebCard && drawnChars.length > 0 && (
        <div
          className="rounded-2xl p-3 border-2"
          style={{ background: '#f8faff', borderColor: '#e0e7ff' }}
        >
          <p className="text-xs font-bold text-gray-400 mb-2 text-center">でたもじ</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {[...drawnChars].reverse().map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                className="text-lg font-black rounded-xl px-2 py-0.5"
                style={{ background: '#e0e7ff', color: '#4338ca' }}
              >
                {ch}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
