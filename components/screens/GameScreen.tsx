'use client';

import type { GameSettings, GameState } from '@/lib/types';
import NumberDisplay from '@/components/game/NumberDisplay';
import DrawnHistory from '@/components/game/DrawnHistory';
import DrawButton from '@/components/game/DrawButton';
import BingoCardDisplay from '@/components/game/BingoCardDisplay';
import Button from '@/components/ui/Button';
import ElapsedTimer from '@/components/ui/ElapsedTimer';

interface Props {
  playerName: string;
  gameState: GameState;
  settings: GameSettings;
  onDraw: () => void;
  onAnswerSubmit: (answer: number) => void;
  onCellTap: (row: number, col: number) => void;
  onFinish: () => void;
  onHome: () => void;
}

export default function GameScreen({
  playerName,
  gameState,
  settings,
  onDraw,
  onAnswerSubmit,
  onCellTap,
  onFinish,
  onHome,
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

  const isWebCard   = settings.cardMode === 'web';
  const isInputMode = settings.mode === 'calculation' && settings.answerMode === 'input';

  const answeredCorrectly =
    isInputMode && !awaitingAnswer && currentNumber !== null && !lastAnswerWrong;

  const numberOnCard =
    answeredCorrectly && bingoCard
      ? bingoCard.cells.flat().some((c) => c === currentNumber)
      : false;

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
        <span className="font-black text-[var(--color-bingo-pink)]">{playerName}</span>
        ちゃん、がんばれ！🔥
      </p>

      {/* Number / problem display */}
      <NumberDisplay
        key={`${currentNumber ?? 'empty'}-${drawnNumbers.length}`}
        number={currentNumber}
        problem={currentProblem}
        mode={settings.mode}
        answerMode={settings.answerMode}
        awaitingAnswer={isInputMode ? awaitingAnswer : undefined}
        onAnswer={isInputMode && awaitingAnswer ? onAnswerSubmit : undefined}
      />

      {/* Correct-answer guidance (input mode) */}
      {answeredCorrectly && (
        isWebCard ? (
          numberOnCard ? (
            <div
              key={`guide-${currentNumber}`}
              className="text-center font-black py-3 px-4 rounded-2xl bg-[var(--color-bingo-yellow)] border-4 border-[var(--color-bingo-orange)] text-gray-800 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
            >
              👆 カードに <span className="text-[var(--color-bingo-pink)]">{currentNumber}</span> があるよ！タップして穴を開けよう！
            </div>
          ) : (
            <div
              key={`guide-${currentNumber}`}
              className="text-center font-black py-3 px-4 rounded-2xl bg-white border-4 border-[var(--color-bingo-blue)] text-gray-700 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
            >
              ✨ 計算はバッチリ！カードに {currentNumber} はないよ。次へ進もう！
            </div>
          )
        ) : (
          <div
            key={`guide-${currentNumber}`}
            className="text-center font-black py-3 px-4 rounded-2xl bg-[var(--color-bingo-yellow)] border-4 border-[var(--color-bingo-orange)] text-gray-800 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          >
            📋 カードに <span className="text-[var(--color-bingo-pink)]">{currentNumber}</span> があったら〇をつけよう！
          </div>
        )
      )}

      {/* Wrong-answer feedback (input mode) */}
      {lastAnswerWrong && (
        <div
          key={drawnNumbers.length}
          className="text-center text-base font-black py-3 rounded-2xl bg-[var(--color-bingo-blue)] text-white animate-[bounce-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        >
          💪 おしい！もう一度チャレンジ！
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

      {/* Manual Bingo button — paper only */}
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
          drawnNumbers={drawnNumbers}
          onCellTap={onCellTap}
        />
      )}

      {/* Drawn history — paper mode */}
      {!isWebCard && <DrawnHistory drawnNumbers={drawnNumbers} />}
    </div>
  );
}
