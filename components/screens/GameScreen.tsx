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
  onAnswerSubmit: (answer: number) => void;
  onCellTap: (row: number, col: number) => void;
  onFinish: () => void;
  onReset: () => void;
}

export default function GameScreen({
  playerName,
  gameState,
  settings,
  onDraw,
  onAnswerSubmit,
  onCellTap,
  onFinish,
  onReset,
}: Props) {
  const {
    drawnNumbers,
    currentNumber,
    currentProblem,
    remainingNumbers,
    bingoCard,
    lastAnswerWrong,
    awaitingAnswer,
    isGameOver,
  } = gameState;

  const isWebCard = settings.cardMode === 'web';
  const isInputMode = settings.mode === 'calculation' && settings.answerMode === 'input';

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

      {/* Number / problem display */}
      <NumberDisplay
        key={`${currentNumber ?? 'empty'}-${drawnNumbers.length}`}
        number={currentNumber}
        problem={currentProblem}
        mode={settings.mode}
        answerMode={settings.answerMode}
        onAnswer={isInputMode ? onAnswerSubmit : undefined}
      />

      {/* Wrong-answer feedback (input mode only) */}
      {lastAnswerWrong && (
        <div
          key={drawnNumbers.length}
          className="text-center text-base font-black py-2 rounded-2xl bg-gray-100 text-gray-500 animate-[bounce-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        >
          ✗ まちがい！もう一度といてね…
        </div>
      )}

      {/* Draw button */}
      <DrawButton
        onDraw={onDraw}
        disabled={isGameOver || awaitingAnswer}
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

      {/* Web card with tap-to-open */}
      {isWebCard && bingoCard && (
        <BingoCardDisplay
          card={bingoCard}
          drawnNumbers={drawnNumbers}
          onCellTap={onCellTap}
        />
      )}

      {/* Drawn history — paper mode */}
      {!isWebCard && <DrawnHistory drawnNumbers={drawnNumbers} />}
    </div>
  );
}
