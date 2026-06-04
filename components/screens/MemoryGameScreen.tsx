'use client';

import { useState, useEffect, useRef } from 'react';
import { shuffle } from '@/lib/bingo';
import { playCardFlip, playCorrect, playWrong, playMiniGameStart, playNewBest, playGoalReached } from '@/lib/sounds';
import { saveRankEntry, isPersonalBest } from '@/lib/ranking';

interface Props {
  playerName: string;
  onHome: () => void;
}

type Phase = 'ready' | 'play' | 'done';
type Diff = 'easy' | 'normal';

interface Card {
  /** デッキ内の一意キー */
  key: number;
  emoji: string;
  matched: boolean;
}

const PURPLE = 'linear-gradient(135deg, #5f3dc4 0%, #9c36b5 100%)';

/** タイマー用の現在時刻（モジュールスコープに置きレンダー純粋性ルールを回避） */
function nowMs() { return Date.now(); }

/** 子供になじみのある絵文字プール（ペアの素材） */
const EMOJI_POOL = [
  '🐶', '🐱', '🐰', '🐻', '🦊', '🐼', '🐸', '🐵',
  '🦁', '🐯', '🦄', '🐷', '🍎', '🍓', '🍌', '🍇',
  '⚽', '🚗', '⭐', '🌈', '🌸', '🎈', '🎁', '🍪',
];

const DIFF_PAIRS: Record<Diff, number> = { easy: 6, normal: 8 };
const DIFF_COLS:  Record<Diff, number> = { easy: 3, normal: 4 };

function buildDeck(diff: Diff): Card[] {
  const pairs = DIFF_PAIRS[diff];
  const emojis = shuffle([...EMOJI_POOL]).slice(0, pairs);
  const cards = emojis.flatMap((emoji, i) => [
    { key: i * 2,     emoji, matched: false },
    { key: i * 2 + 1, emoji, matched: false },
  ]);
  return shuffle(cards);
}

export default function MemoryGameScreen({ playerName, onHome }: Props) {
  const [phase, setPhase]   = useState<Phase>('ready');
  const [diff, setDiff]     = useState<Diff>('easy');
  const [cards, setCards]   = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]); // cards 配列上の index（最大2）
  const [moves, setMoves]   = useState(0);
  const [locked, setLocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [points, setPoints] = useState(0);
  const [isBest, setIsBest] = useState(false);

  const startRef = useRef(0);
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (tickRef.current)  { clearInterval(tickRef.current); tickRef.current = null; }
    if (flipTimer.current) { clearTimeout(flipTimer.current); flipTimer.current = null; }
  }
  useEffect(() => () => clearTimers(), []);

  function handleStart(d: Diff) {
    clearTimers();
    setDiff(d);
    setCards(buildDeck(d));
    setFlipped([]);
    setMoves(0);
    setLocked(false);
    setElapsed(0);
    setPhase('play');
    playMiniGameStart();
    startRef.current = nowMs();
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((nowMs() - startRef.current) / 1000));
    }, 250);
  }

  function finish(finalMoves: number) {
    clearTimers();
    const pairs = DIFF_PAIRS[diff];
    const sec = Math.floor((nowMs() - startRef.current) / 1000);
    const mistakes = Math.max(0, finalMoves - pairs);
    const pts = Math.max(100, pairs * 150 - mistakes * 40 - sec * 3);
    const best = isPersonalBest(playerName, 'memory', pts);
    setPoints(pts);
    setIsBest(best);
    setElapsed(sec);
    saveRankEntry({ playerName, score: pts, mode: 'memory' });
    if (best) playNewBest(); else playGoalReached();
    setPhase('done');
  }

  function handleFlip(idx: number) {
    if (locked || phase !== 'play') return;
    const card = cards[idx];
    if (card.matched || flipped.includes(idx) || flipped.length === 2) return;

    playCardFlip();
    const next = [...flipped, idx];
    setFlipped(next);

    if (next.length === 2) {
      const newMoves = moves + 1;
      setMoves(newMoves);
      const [a, b] = next;
      if (cards[a].emoji === cards[b].emoji) {
        // マッチ！
        setLocked(true);
        flipTimer.current = setTimeout(() => {
          playCorrect();
          const updated = cards.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c));
          setCards(updated);
          setFlipped([]);
          setLocked(false);
          if (updated.every((c) => c.matched)) finish(newMoves);
        }, 480);
      } else {
        // はずれ — やさしく裏に戻す
        setLocked(true);
        flipTimer.current = setTimeout(() => {
          playWrong();
          setFlipped([]);
          setLocked(false);
        }, 850);
      }
    }
  }

  const pairs = DIFF_PAIRS[diff];
  const matchedPairs = cards.filter((c) => c.matched).length / 2;

  return (
    <div className="flex flex-col items-center gap-4 py-5 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="w-full max-w-sm px-4 flex items-center justify-between">
        <button
          onClick={() => { clearTimers(); onHome(); }}
          className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
          aria-label="ホームにもどる"
        >
          🏠
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-700">しんけいすいじゃく</h2>
          <p className="text-xs text-gray-400 font-bold">{playerName} 🧠</p>
        </div>
        <div className="w-10" />
      </div>

      {/* ── READY ── */}
      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4 animate-[fade-in_0.25s_ease_both]">
          <div className="w-full rounded-3xl px-6 py-6 text-center shadow-lg" style={{ background: PURPLE }}>
            <p className="text-5xl mb-2">🃏🃏</p>
            <p className="text-lg font-black text-white drop-shadow leading-relaxed">
              カードを2まい めくって<br />おなじ絵を そろえてね！
            </p>
          </div>
          <p className="text-sm font-black text-gray-400">どっちで あそぶ？</p>
          <div className="grid grid-cols-2 gap-3 w-full">
            {([['easy', '☺ やさしい', '6ペア'], ['normal', '🔥 ふつう', '8ペア']] as [Diff, string, string][]).map(
              ([d, label, sub]) => (
                <button
                  key={d}
                  onClick={() => handleStart(d)}
                  className="flex flex-col items-center gap-1 rounded-3xl py-5 text-white shadow-xl active:scale-95 transition-all"
                  style={{ background: PURPLE, animation: 'float-bob-1 3s ease-in-out infinite' }}
                >
                  <span className="text-xl font-black">{label}</span>
                  <span className="text-xs font-bold text-white/80">{sub}</span>
                </button>
              ),
            )}
          </div>
          <p className="text-xs text-gray-400 font-bold text-center">
            すくない めくりで そろえると たかいてん！✨
          </p>
        </div>
      )}

      {/* ── PLAY ── */}
      {phase === 'play' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm px-4">
          {/* Stats */}
          <div
            className="flex gap-5 text-center px-6 py-2 rounded-2xl"
            style={{ background: 'white', border: '2px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <div>
              <p className="text-2xl font-black" style={{ color: '#9c36b5' }}>{matchedPairs}<span className="text-sm text-gray-300">/{pairs}</span></p>
              <p className="text-xs text-gray-400 font-bold">そろった</p>
            </div>
            <div className="text-gray-200 text-2xl">|</div>
            <div>
              <p className="text-2xl font-black text-gray-600">{moves}</p>
              <p className="text-xs text-gray-400 font-bold">めくり</p>
            </div>
            <div className="text-gray-200 text-2xl">|</div>
            <div>
              <p className="text-2xl font-black text-gray-600">{elapsed}<span className="text-sm text-gray-300">びょう</span></p>
              <p className="text-xs text-gray-400 font-bold">じかん</p>
            </div>
          </div>

          {/* Board */}
          <div
            className="grid gap-2.5 w-full"
            style={{ gridTemplateColumns: `repeat(${DIFF_COLS[diff]}, minmax(0, 1fr))` }}
          >
            {cards.map((card, idx) => {
              const isUp = card.matched || flipped.includes(idx);
              return (
                <button
                  key={card.key}
                  onClick={() => handleFlip(idx)}
                  disabled={isUp || locked}
                  className="aspect-square rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-all relative"
                  style={{
                    background: isUp
                      ? (card.matched ? 'linear-gradient(145deg, #ffffff 0%, #f3e8ff 100%)' : 'white')
                      : PURPLE,
                    border: card.matched ? '3px solid #9c36b5' : '3px solid rgba(255,255,255,0.35)',
                    opacity: card.matched ? 0.7 : 1,
                    animation: isUp ? 'card-flip-in 0.3s ease both' : undefined,
                  }}
                >
                  <span className="text-3xl leading-none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}>
                    {isUp ? card.emoji : '❓'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-4 animate-[fade-in_0.3s_ease_both]">
          <div className="w-full rounded-3xl px-6 py-7 text-center shadow-xl" style={{ background: PURPLE }}>
            <p className="text-6xl mb-2" style={{ animation: 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              {isBest ? '🌟' : '🎉'}
            </p>
            <p className="text-2xl font-black text-white drop-shadow">
              {isBest ? 'あたらしい きろく！' : 'ぜんぶ そろったね！'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-base font-black text-white/80">⭐ スコア</span>
              <span className="text-4xl font-black text-white drop-shadow">{points}</span>
            </div>
            <p className="text-sm font-bold text-white/80 mt-2">
              {moves}めくり ・ {elapsed}びょう
            </p>
          </div>
          <button
            onClick={() => handleStart(diff)}
            className="w-full py-4 rounded-3xl text-xl font-black text-white shadow-lg active:scale-95 transition-all"
            style={{ background: PURPLE }}
          >
            もう一度！🃏
          </button>
          <button
            onClick={() => { clearTimers(); onHome(); }}
            className="px-6 py-2.5 rounded-2xl text-sm font-black text-gray-500 active:scale-95 transition-all"
            style={{ background: 'white', border: '2px solid rgba(0,0,0,0.08)' }}
          >
            🏠 ひろばに もどる
          </button>
        </div>
      )}
    </div>
  );
}
