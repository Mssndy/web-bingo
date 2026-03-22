'use client';

import { useState, useEffect } from 'react';
import type { AppScreen, GameSettings, GameState, PlayerStats } from '@/lib/types';
import { loadStatsForPlayer, saveStats, createEmptyStats } from '@/lib/storage';
import {
  createInitialGameState,
  drawNextNumber,
  generateBingoCard,
  markNumber,
  checkBingo,
  shuffle,
} from '@/lib/bingo';
import { generateProblem } from '@/lib/math-problems';

import NameEntryScreen from '@/components/screens/NameEntryScreen';
import SettingsScreen from '@/components/screens/SettingsScreen';
import GameScreen from '@/components/screens/GameScreen';
import ResultScreen from '@/components/screens/ResultScreen';

const DEFAULT_SETTINGS: GameSettings = {
  mode: 'standard',
  answerMode: 'reveal',
  operators: ['+', '-', '×', '÷'],
  maxNumber: 75,
  cardMode: 'paper',
};

export default function BingoApp() {
  const [screen, setScreen] = useState<AppScreen>('name-entry');
  const [playerName, setPlayerName] = useState('');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!playerName) return;
    setStats(loadStatsForPlayer(playerName));
  }, [playerName]);

  function handleStart(name: string) {
    setPlayerName(name);
    setStats(loadStatsForPlayer(name));
    setScreen('settings');
  }

  function handleStartGame() {
    const card = settings.cardMode === 'web' ? generateBingoCard(settings.maxNumber) : null;
    setGameState(createInitialGameState(settings.maxNumber, card));
    setScreen('game');
  }

  function handleDraw() {
    if (!gameState) return;
    const next = drawNextNumber(gameState);

    if (settings.mode === 'calculation' && next.currentNumber !== null) {
      next.currentProblem = generateProblem(next.currentNumber, settings.operators);
    }

    // Input mode: pause and wait for the player's typed answer
    if (settings.mode === 'calculation' && settings.answerMode === 'input') {
      setGameState({ ...next, awaitingAnswer: true, lastMatchFound: null, lastAnswerWrong: false });
      return;
    }

    setGameState({ ...next, lastMatchFound: null, lastAnswerWrong: false });
  }

  /** Called when the player submits a typed answer in calculation+input mode */
  function handleAnswerSubmit(submitted: number) {
    if (!gameState?.currentProblem || !gameState.currentNumber) return;

    const correct = submitted === gameState.currentProblem.answer;

    if (!correct) {
      // Wrong: recycle the number, player cannot open that card cell
      setGameState({
        ...gameState,
        remainingNumbers: shuffle([...gameState.remainingNumbers, gameState.currentNumber]),
        drawnNumbers: gameState.drawnNumbers.slice(0, -1),
        currentNumber: null,
        currentProblem: null,
        awaitingAnswer: false,
        lastMatchFound: null,
        lastAnswerWrong: true,
      });
      return;
    }

    // Correct: mark as answered, player can now tap the cell on their card
    setGameState({ ...gameState, awaitingAnswer: false, lastAnswerWrong: false });
  }

  /** Called when the player taps a cell on their web card */
  function handleCellTap(row: number, col: number) {
    if (!gameState?.bingoCard) return;
    const cell = gameState.bingoCard.cells[row][col];
    if (cell === 'FREE' || gameState.bingoCard.marked[row][col]) return;
    // Only allow tapping cells whose number has already been drawn
    if (!gameState.drawnNumbers.includes(cell as number)) return;

    const updatedCard = markNumber(gameState.bingoCard, cell as number);
    const bingo = checkBingo(updatedCard);
    const next: GameState = { ...gameState, bingoCard: updatedCard, isGameOver: bingo };

    if (bingo) {
      const base = stats ?? createEmptyStats(playerName);
      const updated: PlayerStats = {
        ...base,
        wins: base.wins + 1,
        gamesPlayed: base.gamesPlayed + 1,
      };
      saveStats(updated);
      setStats(updated);
      setGameState(next);
      setScreen('result');
      return;
    }

    setGameState(next);
  }

  function handleFinish() {
    setScreen('result');
  }

  function handleRecordResult(won: boolean) {
    const base = stats ?? createEmptyStats(playerName);
    const updated: PlayerStats = {
      ...base,
      wins: base.wins + (won ? 1 : 0),
      losses: base.losses + (won ? 0 : 1),
      gamesPlayed: base.gamesPlayed + 1,
    };
    saveStats(updated);
    setStats(updated);
  }

  function handlePlayAgain() {
    setScreen('settings');
    setGameState(null);
  }

  function handleBackToName() {
    setScreen('name-entry');
    setGameState(null);
  }

  return (
    <main className="max-w-lg mx-auto w-full">
      {screen === 'name-entry' && (
        <NameEntryScreen onStart={handleStart} stats={stats} />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          playerName={playerName}
          settings={settings}
          onSettingsChange={setSettings}
          onStartGame={handleStartGame}
          onBack={handleBackToName}
        />
      )}
      {screen === 'game' && gameState && (
        <GameScreen
          playerName={playerName}
          gameState={gameState}
          settings={settings}
          onDraw={handleDraw}
          onAnswerSubmit={handleAnswerSubmit}
          onCellTap={handleCellTap}
          onFinish={handleFinish}
          onReset={handlePlayAgain}
        />
      )}
      {screen === 'result' && (
        <ResultScreen
          playerName={playerName}
          stats={stats ?? createEmptyStats(playerName)}
          isBingoAuto={settings.cardMode === 'web'}
          onRecordWin={() => handleRecordResult(true)}
          onRecordLoss={() => handleRecordResult(false)}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </main>
  );
}
