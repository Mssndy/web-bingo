'use client';

import type { GameSettings, GameState } from '@/lib/types';
import NumberDisplay from '@/components/game/NumberDisplay';
import DrawnHistory from '@/components/game/DrawnHistory';
import DrawButton from '@/components/game/DrawButton';
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
  const { drawnNumbers, currentNumber, currentProblem, remainingNumbers, isGameOver } = gameState;

  return (
    <div className="flex flex-col gap-5 px-5 py-6 animate-[fade-in_0.3s_ease_both]">
      {/* Player greeting */}
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-gray-500">
          <span className="text-[var(--color-bingo-pink)] font-black">{playerName}</span>
          ちゃん、がんばれ！
        </p>
        <button
          onClick={onReset}
          className="text-xs text-gray-400 underline"
        >
          やりなおす
        </button>
      </div>

      {/* Number display — key forces remount on each draw to replay animation */}
      <NumberDisplay
        key={currentNumber ?? 'empty'}
        number={currentNumber}
        problem={currentProblem}
        mode={settings.mode}
      />

      {/* Draw button */}
      <DrawButton
        onDraw={onDraw}
        disabled={isGameOver}
        remaining={remainingNumbers.length}
      />

      {/* Bingo! button */}
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={onFinish}
        disabled={drawnNumbers.length === 0}
      >
        🏆 ビンゴ！
      </Button>

      {/* History */}
      <DrawnHistory drawnNumbers={drawnNumbers} />
    </div>
  );
}
