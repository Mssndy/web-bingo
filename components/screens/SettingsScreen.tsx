'use client';

import type { AnswerMode, CardMode, GameSettings, MaxNumber } from '@/lib/types';
import Button from '@/components/ui/Button';
import OperatorPicker from '@/components/game/OperatorPicker';

interface Props {
  playerName: string;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
  onStartGame: () => void;
  onBack: () => void;
}

const MAX_NUMBER_OPTIONS: { value: MaxNumber; label: string }[] = [
  { value: 30, label: '1〜30' },
  { value: 50, label: '1〜50' },
  { value: 75, label: '1〜75' },
];

const CARD_MODE_OPTIONS: { value: CardMode; emoji: string; label: string; desc: string }[] = [
  { value: 'paper', emoji: '📄', label: 'かみカード', desc: '手元の紙で遊ぶ' },
  { value: 'web',   emoji: '📱', label: 'Webカード',  desc: '画面にカードを表示' },
];

export default function SettingsScreen({
  playerName,
  settings,
  onSettingsChange,
  onStartGame,
  onBack,
}: Props) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="text-center">
        <p className="text-lg text-gray-500">
          <span className="font-black text-[var(--color-bingo-pink)]">{playerName}</span>
          ちゃん、よういはいい？
        </p>
      </div>

      {/* ── START button — top and prominent ── */}
      <Button size="lg" className="w-full" onClick={onStartGame}>
        🎯 スタート！
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <p className="text-xs font-bold text-gray-400 tracking-widest">せってい</p>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Card mode */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">カードのしゅるい</h2>
        <div className="flex gap-3">
          {CARD_MODE_OPTIONS.map(({ value, emoji, label, desc }) => (
            <button
              key={value}
              onClick={() => onSettingsChange({ ...settings, cardMode: value })}
              className={`
                flex-1 py-4 px-3 rounded-2xl border-4 transition-all active:scale-95 text-left
                ${settings.cardMode === value
                  ? 'bg-[var(--color-bingo-yellow)] border-[var(--color-bingo-orange)] shadow-md'
                  : 'bg-white border-gray-200'}
              `}
            >
              <p className="text-2xl">{emoji}</p>
              <p className={`text-base font-black mt-1 ${settings.cardMode === value ? 'text-gray-800' : 'text-gray-400'}`}>
                {label}
              </p>
              <p className={`text-xs mt-0.5 ${settings.cardMode === value ? 'text-gray-600' : 'text-gray-300'}`}>
                {desc}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Game mode */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">ゲームモード</h2>
        <div className="flex gap-3">
          {(['standard', 'calculation'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onSettingsChange({ ...settings, mode: m })}
              className={`
                flex-1 py-4 rounded-2xl text-lg font-black border-4 transition-all active:scale-95
                ${settings.mode === m
                  ? 'bg-[var(--color-bingo-blue)] border-[var(--color-bingo-blue)] text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-400'}
              `}
            >
              {m === 'standard' ? '🎲 ふつう' : '🧮 けいさん'}
            </button>
          ))}
        </div>
      </section>

      {/* Calculation sub-settings */}
      {settings.mode === 'calculation' && (
        <>
          <section className="animate-[fade-in_0.3s_ease_both]">
            <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">こたえのいれかた</h2>
            <div className="flex gap-3">
              {([
                { value: 'reveal' as AnswerMode, emoji: '👆', label: 'タップでみる', desc: '式をタップして答えを確認' },
                { value: 'input'  as AnswerMode, emoji: '✏️', label: 'じぶんで入力', desc: '答えを自分で打ち込む' },
              ] as const).map(({ value, emoji, label, desc }) => (
                <button
                  key={value}
                  onClick={() => onSettingsChange({ ...settings, answerMode: value })}
                  className={`
                    flex-1 py-3 px-3 rounded-2xl border-4 transition-all active:scale-95 text-left
                    ${settings.answerMode === value
                      ? 'bg-[var(--color-bingo-purple)] border-[var(--color-bingo-purple)] shadow-md'
                      : 'bg-white border-gray-200'}
                  `}
                >
                  <p className="text-xl">{emoji}</p>
                  <p className={`text-sm font-black mt-1 ${settings.answerMode === value ? 'text-white' : 'text-gray-400'}`}>
                    {label}
                  </p>
                  <p className={`text-xs mt-0.5 ${settings.answerMode === value ? 'text-purple-200' : 'text-gray-300'}`}>
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="animate-[fade-in_0.3s_ease_both]">
            <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">けいさんのしゅるい</h2>
            <OperatorPicker
              selected={settings.operators}
              onChange={(ops) => onSettingsChange({ ...settings, operators: ops })}
            />
          </section>
        </>
      )}

      {/* Number range */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 mb-2 tracking-wide">すうじのはんい</h2>
        <div className="flex gap-3">
          {MAX_NUMBER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onSettingsChange({ ...settings, maxNumber: value })}
              className={`
                flex-1 py-3 rounded-2xl text-base font-black border-4 transition-all active:scale-95
                ${settings.maxNumber === value
                  ? 'bg-[var(--color-bingo-pink)] border-[var(--color-bingo-pink)] text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-400'}
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Back */}
      <Button variant="ghost" size="sm" className="w-full" onClick={onBack}>
        ← もどる
      </Button>
    </div>
  );
}
