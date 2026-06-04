'use client';

import { useState, useEffect, useRef } from 'react';
import { generateProblem } from '@/lib/math-problems';
import type { MathOperator } from '@/lib/types';
import { playCorrect, playWrong, playMoguraPop, playMiniGameStart, playNewBest, playGoalReached } from '@/lib/sounds';
import { saveRankEntry, isPersonalBest } from '@/lib/ranking';

interface Props {
  playerName: string;
  onHome: () => void;
}

type Phase = 'ready' | 'play' | 'done';
type Mode = 'addsub' | 'mul';

const HOLES = 6;
const GAME_SEC = 45;
const ORANGE = 'linear-gradient(135deg, #f59f00 0%, #b45309 100%)';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** タイマー用の現在時刻（モジュールスコープに置きレンダー純粋性ルールを回避） */
function nowMs() { return Date.now(); }

interface Round {
  expression: string;
  answer: number;
  nums: number[]; // 各穴に表示する数字（1つだけ正解）
}

function genRound(mode: Mode): Round {
  let expression: string;
  let answer: number;
  if (mode === 'mul') {
    const a = randInt(2, 9), b = randInt(2, 9);
    answer = a * b;
    expression = `${a} × ${b}`;
  } else {
    answer = randInt(2, 18);
    const ops: MathOperator[] = ['+', '-'];
    const p = generateProblem(answer, ops);
    expression = p.expression;
    answer = p.answer;
  }

  // 正解＋紛らわしいダミーを HOLES 個ぶん作る（重複なし）
  const nums = new Set<number>([answer]);
  let guard = 0;
  while (nums.size < HOLES && guard++ < 100) {
    const delta = randInt(1, 9) * (Math.random() < 0.5 ? -1 : 1);
    const cand = answer + delta;
    if (cand >= 0) nums.add(cand);
  }
  // 念のため埋める
  let filler = answer + 10;
  while (nums.size < HOLES) nums.add(filler++);

  const arr = [...nums];
  // シャッフル
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { expression, answer, nums: arr };
}

export default function MoguraGameScreen({ playerName, onHome }: Props) {
  const [phase, setPhase]     = useState<Phase>('ready');
  const [mode, setMode]       = useState<Mode>('addsub');
  const [round, setRound]     = useState<Round | null>(null);
  const [up, setUp]           = useState<boolean[]>(Array(HOLES).fill(false));
  const [score, setScore]     = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SEC);
  const [hitIdx, setHitIdx]   = useState<number | null>(null);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [isBest, setIsBest]   = useState(false);

  const roundRef   = useRef<Round | null>(null);
  const timingRef  = useRef<{ up: boolean; nextChange: number }[]>([]);
  const endTimeRef = useRef(0);
  const loopRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef   = useRef(0);

  function clearLoop() {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
  }
  useEffect(() => () => clearLoop(), []);

  function nextRound() {
    const r = genRound(mode);
    roundRef.current = r;
    setRound(r);
  }

  function handleStart(m: Mode) {
    clearLoop();
    setMode(m);
    setScore(0);
    scoreRef.current = 0;
    setHitIdx(null);
    setWrongIdx(null);
    setTimeLeft(GAME_SEC);
    setPhase('play');
    playMiniGameStart();

    const now = nowMs();
    endTimeRef.current = now + GAME_SEC * 1000;
    timingRef.current = Array.from({ length: HOLES }, (_, i) => ({
      up: false,
      nextChange: now + 300 + i * 180 + randInt(0, 400),
    }));
    setUp(Array(HOLES).fill(false));

    // mode を直接使って初回ラウンド生成（setState の遅延を避ける）
    const r = genRound(m);
    roundRef.current = r;
    setRound(r);

    loopRef.current = setInterval(tick, 90);
  }

  function tick() {
    const now = nowMs();
    if (now >= endTimeRef.current) {
      finish();
      return;
    }
    setTimeLeft(Math.max(0, Math.ceil((endTimeRef.current - now) / 1000)));

    let changed = false;
    const flags = timingRef.current.map((h) => {
      if (now >= h.nextChange) {
        h.up = !h.up;
        h.nextChange = now + (h.up ? randInt(800, 1600) : randInt(450, 950));
        if (h.up) playMoguraPop();
        changed = true;
      }
      return h.up;
    });
    if (changed) setUp(flags);
  }

  function finish() {
    clearLoop();
    const final = scoreRef.current;
    const best = final > 0 && isPersonalBest(playerName, 'mogura', final);
    setIsBest(best);
    if (final > 0) saveRankEntry({ playerName, score: final, mode: 'mogura' });
    if (best) playNewBest(); else playGoalReached();
    setPhase('done');
  }

  function handleWhack(idx: number) {
    if (phase !== 'play') return;
    if (!timingRef.current[idx]?.up) return; // 出ているモグラだけ叩ける
    const r = roundRef.current;
    if (!r) return;

    if (r.nums[idx] === r.answer) {
      playCorrect();
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setHitIdx(idx);
      setTimeout(() => setHitIdx((c) => (c === idx ? null : c)), 350);
      // 叩いた穴は一旦ひっこめる
      timingRef.current[idx].up = false;
      timingRef.current[idx].nextChange = nowMs() + randInt(500, 900);
      setUp(timingRef.current.map((h) => h.up));
      nextRound();
    } else {
      playWrong();
      setWrongIdx(idx);
      setTimeout(() => setWrongIdx((c) => (c === idx ? null : c)), 400);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-5 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="w-full max-w-sm px-4 flex items-center justify-between">
        <button
          onClick={() => { clearLoop(); onHome(); }}
          className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
          aria-label="ホームにもどる"
        >
          🏠
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-700">こたえモグラ</h2>
          <p className="text-xs text-gray-400 font-bold">{playerName} 🐹</p>
        </div>
        <div className="w-10" />
      </div>

      {/* ── READY ── */}
      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4 animate-[fade-in_0.25s_ease_both]">
          <div className="w-full rounded-3xl px-6 py-6 text-center shadow-lg" style={{ background: ORANGE }}>
            <p className="text-5xl mb-2">🐹🔨</p>
            <p className="text-lg font-black text-white drop-shadow leading-relaxed">
              しきの こたえの モグラを<br />たたこう！{GAME_SEC}びょう しょうぶ！
            </p>
          </div>
          <p className="text-sm font-black text-gray-400">どの けいさんで あそぶ？</p>
          <div className="grid grid-cols-2 gap-3 w-full">
            {([['addsub', '➕➖ たし・ひき'], ['mul', '✖️ かけざん']] as [Mode, string][]).map(([m, label]) => (
              <button
                key={m}
                onClick={() => handleStart(m)}
                className="flex flex-col items-center gap-1 rounded-3xl py-5 text-white shadow-xl active:scale-95 transition-all"
                style={{ background: ORANGE, animation: 'float-bob-1 3s ease-in-out infinite' }}
              >
                <span className="text-lg font-black">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 font-bold text-center">
            まちがえても だいじょうぶ！どんどん たたこう✨
          </p>
        </div>
      )}

      {/* ── PLAY ── */}
      {phase === 'play' && round && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm px-4">
          {/* Problem + stats */}
          <div className="w-full flex items-center justify-between gap-3">
            <div
              className="flex-1 rounded-2xl px-4 py-3 text-center shadow-md"
              style={{ background: 'white', border: '3px solid rgba(245,159,0,0.4)' }}
            >
              <p className="text-3xl font-black text-gray-700">{round.expression} = <span style={{ color: '#f59f00' }}>?</span></p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="px-3 py-1 rounded-xl text-white text-center" style={{ background: ORANGE }}>
                <p className="text-xl font-black leading-none">{score}</p>
                <p className="text-[9px] font-bold">てん</p>
              </div>
              <p className="text-sm font-black" style={{ color: timeLeft <= 10 ? '#e03131' : '#6b7280' }}>
                ⏱{timeLeft}
              </p>
            </div>
          </div>

          {/* Holes */}
          <div className="grid grid-cols-3 gap-3 w-full mt-2">
            {Array.from({ length: HOLES }).map((_, idx) => {
              const isUp = up[idx];
              const isHit = hitIdx === idx;
              const isWrong = wrongIdx === idx;
              return (
                <div key={idx} className="relative aspect-square flex items-end justify-center">
                  {/* Hole */}
                  <div
                    className="absolute bottom-0 w-full rounded-[50%]"
                    style={{ height: '34%', background: 'radial-gradient(ellipse at center, #5c3a16 0%, #3d2710 100%)' }}
                  />
                  {/* Mole */}
                  <button
                    onClick={() => handleWhack(idx)}
                    disabled={!isUp}
                    className="absolute left-1/2 flex flex-col items-center justify-center rounded-2xl shadow-lg"
                    style={{
                      width: '78%',
                      height: '78%',
                      transform: `translateX(-50%) translateY(${isUp ? '6%' : '105%'}) scale(${isHit ? 1.12 : 1})`,
                      transition: 'transform 0.16s cubic-bezier(0.34,1.56,0.64,1)',
                      background: isWrong
                        ? 'linear-gradient(145deg, #ffd8a8 0%, #ff922b 100%)'
                        : 'linear-gradient(145deg, #f2c98a 0%, #c98a3c 100%)',
                      border: '3px solid rgba(255,255,255,0.4)',
                      opacity: isUp ? 1 : 0,
                      pointerEvents: isUp ? 'auto' : 'none',
                      animation: isWrong ? 'wiggle 0.4s ease both' : undefined,
                    }}
                  >
                    <span className="text-xl leading-none">🐹</span>
                    <span className="text-2xl font-black text-white drop-shadow leading-none mt-0.5">
                      {round.nums[idx]}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 font-bold text-center">
            こたえは <span className="font-black" style={{ color: '#f59f00' }}>{round.expression}</span> ！でた モグラを よく見てね👀
          </p>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-4 animate-[fade-in_0.3s_ease_both]">
          <div className="w-full rounded-3xl px-6 py-7 text-center shadow-xl" style={{ background: ORANGE }}>
            <p className="text-6xl mb-2" style={{ animation: 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              {isBest ? '🌟' : '🎉'}
            </p>
            <p className="text-2xl font-black text-white drop-shadow">
              {isBest ? 'あたらしい きろく！' : 'おつかれさま！'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-base font-black text-white/80">🐹 たたいた かず</span>
              <span className="text-4xl font-black text-white drop-shadow">{score}</span>
            </div>
          </div>
          <button
            onClick={() => handleStart(mode)}
            className="w-full py-4 rounded-3xl text-xl font-black text-white shadow-lg active:scale-95 transition-all"
            style={{ background: ORANGE }}
          >
            もう一度！🔨
          </button>
          <button
            onClick={() => { clearLoop(); onHome(); }}
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
