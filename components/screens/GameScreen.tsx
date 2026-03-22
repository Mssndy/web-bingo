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
  onFinish: () => void;
  onReset: () => void;
}

export default function GameScreen({
  playerName,
  gameState,
  settings,
  onDraw,
  onAnswerSubmit,
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
    lastAnswerWrong,
    awaitingAnswer,
    isGameOver,
  } = gameState;

  const isWebCard = settings.cardMode === 'web';
  const isInputMode = settings.mode === 'calculation' && settings.answerMode === 'input';

  const unmarkedCount = bingoCard
    ? bingoCard.marked.flat().filter((m) => !m).length
    : 0;

  // Feedback banner content
  let feedbackText: string | null = null;
  let feedbackGreen = false;
  if (lastAnswerWrong) {
    feedbackText = '✗ まちがい！もう一度といてね…';
  } else if (lastMatchFound === true) {
    feedbackText = isWebCard ? '✓ カードにあった！マークしたよ！' : '✓ せいかい！';
    feedbackGreen = true;
  } else if (lastMatchFound === false && !lastAnswerWrong) {
    feedbackText = isWebCard
      ? '✗ カードにない…またでてくるよ！'
      : '✗ はずれ…またでてくるよ！';
  }

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

      {/* Feedback banner */}
      {feedbackText && (
        <div
          key={`${drawnNumbers.length}-${lastAnswerWrong}`}
          className={`
            text-center text-base font-black py-2 rounded-2xl
            animate-[bounce-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]
            ${feedbackGreen ? 'bg-[var(--color-bingo-green)] text-white' : 'bg-gray-100 text-gray-500'}
          `}
        >
          {feedbackText}
        </div>
      )}

      {/* Draw button — disabled while waiting for input answer */}
      <DrawButton
        onDraw={onDraw}
        disabled={isGameOver || awaitingAnswer}
        remaining={isWebCard ? unmarkedCount : remainingNumbers.length}
        label={isWebCard ? 'あと' : 'のこり'}
        unit={isWebCard ? 'マス' : '個'}
      />

      {/* Manual "Bingo!" — paper card mode only */}
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

      {/* Web card */}
      {isWebCard && bingoCard && (
        <BingoCardDisplay
          card={bingoCard}
          lastMatchedNumber={lastMatchFound ? currentNumber : null}
        />
      )}

      {/* Drawn history — paper mode */}
      {!isWebCard && <DrawnHistory drawnNumbers={drawnNumbers} />}
    </div>
  );
}
