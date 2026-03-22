'use client';

import { useState, useEffect } from 'react';
import type { AppScreen, GameSettings, GameState, PlayerStats } from '@/lib/types';
import { loadStatsForPlayer, saveStats, createEmptyStats } from '@/lib/storage';
import { createInitialGameState, drawNextNumber } from '@/lib/bingo';
import { generateProblem } from '@/lib/math-problems';

import NameEntryScreen from '@/components/screens/NameEntryScreen';
import SettingsScreen from '@/components/screens/SettingsScreen';
import GameScreen from '@/components/screens/GameScreen';
import ResultScreen from '@/components/screens/ResultScreen';

const DEFAULT_SETTINGS: GameSettings = {
  mode: 'standard',
  operators: ['+', '-', '×', '÷'],
  maxNumber: 75,
};

export default function BingoApp() {
  const [screen, setScreen] = useState<AppScreen>('name-entry');
  const [playerName, setPlayerName] = useState('');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Load stats when player name changes
  useEffect(() => {
    if (!playerName) return;
    const s = loadStatsForPlayer(playerName);
    setStats(s);
  }, [playerName]);

  function handleStart(name: string) {
    setPlayerName(name);
    const s = loadStatsForPlayer(name);
    setStats(s);
    setScreen('settings');
  }

  function handleStartGame() {
    const state = createInitialGameState(settings.maxNumber);
    setGameState(state);
    setScreen('game');
  }

  function handleDraw() {
    if (!gameState) return;
    const next = drawNextNumber(gameState);
    if (settings.mode === 'calculation' && next.currentNumber !== null) {
      next.currentProblem = generateProblem(next.currentNumber, settings.operators);
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
          onRecordWin={() => handleRecordResult(true)}
          onRecordLoss={() => handleRecordResult(false)}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </main>
  );
}
