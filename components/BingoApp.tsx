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

    // Pop the next number from the pool
    let next = drawNextNumber(gameState);

    // Attach math problem in calculation mode
    if (settings.mode === 'calculation' && next.currentNumber !== null) {
      next.currentProblem = generateProblem(next.currentNumber, settings.operators);
    }

    // Web card mode: check match, recycle on miss, auto-finish on bingo
    if (settings.cardMode === 'web' && next.currentNumber !== null && next.bingoCard) {
      const n = next.currentNumber;
      const matched = isNumberOnCard(next.bingoCard, n);

      if (matched) {
        const updatedCard = markNumber(next.bingoCard, n);
        const bingo = checkBingo(updatedCard);
        next = {
          ...next,
          bingoCard: updatedCard,
          lastMatchFound: true,
          isGameOver: bingo,
        };
        setGameState(next);
        if (bingo) {
          // Auto-record win and navigate to result
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
        return;
      } else {
        // Recycle: put number back into pool (shuffle to avoid predictability)
        next = {
          ...next,
          remainingNumbers: shuffle([...next.remainingNumbers, n]),
          lastMatchFound: false,
          isGameOver: false,
        };
      }
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
