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
        className="text-center rounded-2xl border-4 py-3 px-4 shadow"
        style={{ background: '#f0f4ff', borderColor: '#c7d2fe' }}
      >
        <p className="text-gray-400 font-bold text-base">ボタンをおしてスタート！</p>
      </div>
    );
  }

  if (subMode === 'char-show') {
    return (
      <div
        className="text-center rounded-2xl border-4 py-3 px-4 shadow"
        style={{ background: 'var(--color-bingo-yellow)', borderColor: 'var(--color-bingo-orange)' }}
      >
        <div className="flex items-center justify-center gap-4">
          <p
            className="font-black leading-none animate-[number-pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
            style={{ fontSize: '3.5rem', color: '#1e293b' }}
          >
            {char}
          </p>
          <div className="flex flex-col items-start">
            <p className="text-sm font-bold text-gray-500">{ROMAJI[char] ?? ''}</p>
            <button
              onClick={onSpeak}
              className="mt-1 text-sm font-bold text-[var(--color-bingo-blue)] active:scale-95 transition-transform"
            >
              🔊 もう一度きく
            </button>
          </div>
        </div>
      </div>
    );
  }

  // sound-match mode
  return (
    <div
      className="text-center rounded-2xl border-4 py-3 px-4 shadow"
      style={{ background: 'var(--color-bingo-yellow)', borderColor: 'var(--color-bingo-orange)' }}
    >
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onSpeak}
          className="text-5xl leading-none active:scale-90 transition-transform animate-[number-pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          aria-label="もう一度きく"
        >
          🔊
        </button>
        <div className="flex flex-col items-start">
          <p className="text-xs font-bold text-gray-500">きいてカードをさがしてね！</p>
          <p
            className="font-black leading-none mt-1"
            style={{ fontSize: '2.5rem', color: '#1e293b' }}
          >
            {char}
          </p>
        </div>
      </div>
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

  // Auto-play TTS whenever a new character is drawn
  useEffect(() => {
    if (currentChar && currentChar !== prevCharRef.current) {
      prevCharRef.current = currentChar;
      speakChar(currentChar, locale);
    }
  }, [currentChar, locale]);

  function handleSpeak() {
    if (currentChar) speakChar(currentChar, locale);
  }

  const unmarkedCount = bingoCard
    ? bingoCard.marked.flat().filter((m) => !m).length
    : 0;

  return (
    <div className="flex flex-col gap-2 px-4 pt-3 pb-2 h-full animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <button
          onClick={onHome}
          className="flex items-center gap-1 text-sm font-bold text-gray-400 active:scale-95 transition-transform shrink-0"
        >
          🏠 ホーム
        </button>
        <p className="text-sm font-bold text-gray-500 text-center">
          <span className="font-black text-[var(--color-bingo-blue)]">{playerName}</span>
          ちゃん、がんばれ！🔥
        </p>
        <ElapsedTimer />
      </div>

      {/* Character display */}
      <div className="shrink-0">
        <CharDisplay
          key={currentChar ?? 'empty'}
          char={currentChar}
          subMode={settings.bingoSubMode}
          onSpeak={handleSpeak}
        />
      </div>

      {/* Draw button */}
      <div className="shrink-0">
        <DrawButton
          onDraw={onDraw}
          disabled={isGameOver}
          remaining={isWebCard ? unmarkedCount : remainingChars.length}
          label={isWebCard ? 'あと' : 'のこり'}
          unit={isWebCard ? 'マス' : '個'}
        />
      </div>

      {/* Manual Bingo button — paper only */}
      {!isWebCard && (
        <div className="shrink-0">
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={onFinish}
            disabled={drawnChars.length === 0}
          >
            🏆 ビンゴ！
          </Button>
        </div>
      )}

      {/* Web card — fills remaining space */}
      {isWebCard && bingoCard && (
        <div className="flex-1 min-h-0">
          <CharBingoCardDisplay
            card={bingoCard}
            drawnChars={drawnChars}
            onCellTap={onCellTap}
          />
        </div>
      )}

      {/* Drawn history — paper mode */}
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
