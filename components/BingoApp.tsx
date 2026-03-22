'use client';

import { useState, useEffect } from 'react';
import type { AppScreen, GameSettings, GameState, PlayerStats } from '@/lib/types';
import { loadStatsForPlayer, saveStats, createEmptyStats } from '@/lib/storage';
import {
  createInitialGameState,
  drawNextNumber,
  generateBingoCard,
  isNumberOnCard,
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

    // Attach math problem in calculation mode
    if (settings.mode === 'calculation' && next.currentNumber !== null) {
      next.currentProblem = generateProblem(next.currentNumber, settings.operators);
    }

    // Input mode: pause here and wait for the player's answer
    if (settings.mode === 'calculation' && settings.answerMode === 'input') {
      setGameState({ ...next, awaitingAnswer: true, lastMatchFound: null, lastAnswerWrong: false });
      return;
    }

    // Standard / reveal mode: process the card immediately
    setGameState(processCardMatch(next, settings, stats, playerName, setStats, setScreen));
  }

  /** Called by NumberDisplay when the player submits an answer in input mode */
  function handleAnswerSubmit(submitted: number) {
    if (!gameState || !gameState.currentNumber || !gameState.currentProblem) return;

    const correct = submitted === gameState.currentProblem.answer;

    if (!correct) {
      // Wrong answer: recycle the number, clear display
      setGameState({
        ...gameState,
        remainingNumbers: shuffle([...gameState.remainingNumbers, gameState.currentNumber]),
        drawnNumbers: gameState.drawnNumbers.slice(0, -1), // undo the draw from history
        currentNumber: null,
        currentProblem: null,
        awaitingAnswer: false,
        lastMatchFound: false,
        lastAnswerWrong: true,
      });
      return;
    }

    // Correct answer: proceed with card matching
    const processed = processCardMatch(
      { ...gameState, awaitingAnswer: false, lastAnswerWrong: false },
      settings,
      stats,
      playerName,
      setStats,
      setScreen
    );
    setGameState(processed);
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

// ─── Helper: card matching logic (shared between draw and answer-submit) ────

function processCardMatch(
  state: GameState,
  settings: GameSettings,
  stats: PlayerStats | null,
  playerName: string,
  setStats: (s: PlayerStats) => void,
  setScreen: (s: AppScreen) => void
): GameState {
  if (settings.cardMode !== 'web' || !state.currentNumber || !state.bingoCard) {
    return { ...state, lastMatchFound: null, lastAnswerWrong: false };
  }

  const n = state.currentNumber;
  const matched = isNumberOnCard(state.bingoCard, n);

  if (matched) {
    const updatedCard = markNumber(state.bingoCard, n);
    const bingo = checkBingo(updatedCard);
    const next: GameState = {
      ...state,
      bingoCard: updatedCard,
      lastMatchFound: true,
      lastAnswerWrong: false,
      isGameOver: bingo,
    };
    if (bingo) {
      const base = stats ?? createEmptyStats(playerName);
      const updated: PlayerStats = {
        ...base,
        wins: base.wins + 1,
        gamesPlayed: base.gamesPlayed + 1,
      };
      saveStats(updated);
      setStats(updated);
      setScreen('result');
    }
    return next;
  }

  // Number not on card: recycle
  return {
    ...state,
    remainingNumbers: shuffle([...state.remainingNumbers, n]),
    lastMatchFound: false,
    lastAnswerWrong: false,
  };
}
