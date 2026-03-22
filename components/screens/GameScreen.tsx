'use client';

import type { GameSettings, GameState } from '@/lib/types';
import NumberDisplay from '@/components/game/NumberDisplay';
import DrawnHistory from '@/components/game/DrawnHistory';
import DrawButton from '@/components/game/DrawButton';
import BingoCardDisplay from '@/components/game/BingoCardDisplay';
import Button from '@/components/ui/Button';

interface Props {
  playerName: string;
  gameState: GameState;
  settings: GameSettings;
  onDraw: () => void;
  onFinish: () => void;
  onReset: () => void;
}

export default function GameScreen({
  playerName,
  gameState,
  settings,
  onDraw,
  onFinish,
  onReset,
}: Props) {
  const {
    drawnNumbers,
    currentNumber,
    currentProblem,
    remainingNumbers,
    bingoCard,
    lastMatchFound,
    isGameOver,
  } = gameState;

  const isWebCard = settings.cardMode === 'web';

  // In web card mode, show unmarked cell count as "remaining"
  const unmarkedCount = bingoCard
    ? bingoCard.marked.flat().filter((m) => !m).length
    : 0;

  return (
    <div className="flex flex-col gap-4 px-5 py-6 animate-[fade-in_0.3s_ease_both]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-gray-500">
          <span className="text-[var(--color-bingo-pink)] font-black">{playerName}</span>
          ちゃん、がんばれ！
        </p>
        <button onClick={onReset} className="text-xs text-gray-400 underline">
          やりなおす
        </button>
      </div>

      {/* Number display */}
      <NumberDisplay
        key={`${currentNumber ?? 'empty'}-${drawnNumbers.length}`}
        number={currentNumber}
        problem={currentProblem}
        mode={settings.mode}
      />

      {/* Match feedback (web card mode only) */}
      {isWebCard && lastMatchFound !== null && (
        <div
          key={drawnNumbers.length}
          className={`
            text-center text-base font-black py-2 rounded-2xl animate-[bounce-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]
            ${lastMatchFound
              ? 'bg-[var(--color-bingo-green)] text-white'
              : 'bg-gray-100 text-gray-500'}
          `}
        >
          {lastMatchFound ? '✓ カードにあった！マークしたよ！' : '✗ はずれ… またでてくるよ！'}
        </div>
      )}

      {/* Draw button */}
      <DrawButton
        onDraw={onDraw}
        disabled={isGameOver}
        remaining={isWebCard ? unmarkedCount : remainingNumbers.length}
        label={isWebCard ? 'あと' : 'のこり'}
        unit={isWebCard ? 'マス' : '個'}
      />

      {/* Manual "Bingo!" button — paper card mode only */}
      {!isWebCard && (
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={onFinish}
          disabled={drawnNumbers.length === 0}
        >
          🏆 ビンゴ！
        </Button>
      )}

      {/* Bingo card (web card mode) */}
      {isWebCard && bingoCard && (
        <BingoCardDisplay
          card={bingoCard}
          lastMatchedNumber={lastMatchFound ? currentNumber : null}
        />
      )}

      {/* Drawn history (paper mode) */}
      {!isWebCard && <DrawnHistory drawnNumbers={drawnNumbers} />}
    </div>
  );
}
