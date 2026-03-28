'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  generateTossGrid, checkTossLines, calcTossScore, TOSS_BALLS,
  GaugeZone, getZoneFromAngle, calcLandingCell,
} from '@/lib/toss';
import { playToss, playLand, playBingo, playCorrect, playWrong, playGaugeStop } from '@/lib/sounds';

interface Props {
  playerName: string;
  onHome: () => void;
}

interface FlyingBall {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

type Phase = 'play' | 'aiming' | 'result';

// ── SVG Gauge helpers ─────────────────────────────────────────────────────────

/** Convert clock-angle (0° = 12 o'clock, clockwise) to SVG x,y coordinates. */
function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Annular sector path (donut slice) between startDeg and endDeg. */
function donutSeg(
  cx: number, cy: number,
  ir: number, or: number,
  startDeg: number, endDeg: number,
): string {
  const s1 = polarToXY(cx, cy, ir, startDeg);
  const e1 = polarToXY(cx, cy, ir, endDeg);
  const s2 = polarToXY(cx, cy, or, startDeg);
  const e2 = polarToXY(cx, cy, or, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${s2.x.toFixed(2)} ${s2.y.toFixed(2)}`,
    `A ${or} ${or} 0 ${large} 1 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)}`,
    `L ${e1.x.toFixed(2)} ${e1.y.toFixed(2)}`,
    `A ${ir} ${ir} 0 ${large} 0 ${s1.x.toFixed(2)} ${s1.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

// ── Zone config ───────────────────────────────────────────────────────────────

const ZONE_CFG: Record<GaugeZone, { label: string; emoji: string; color: string }> = {
  perfect: { label: 'PERFECT!', emoji: '🎯', color: '#16a34a' },
  good:    { label: 'GOOD!',    emoji: '✨', color: '#d97706' },
  ok:      { label: 'まあまあ…', emoji: '😅', color: '#ea580c' },
  miss:    { label: 'あーあ！',  emoji: '💦', color: '#dc2626' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyMarked(): boolean[][] {
  return Array.from({ length: 5 }, () => Array(5).fill(false));
}

// ── GaugeOverlay sub-component ────────────────────────────────────────────────

function GaugeOverlay({
  stoppedZone,
  onStop,
}: {
  stoppedZone: GaugeZone | null;
  onStop: (zone: GaugeZone) => void;
}) {
  const needleGroupRef = useRef<SVGGElement>(null);
  const angleRef       = useRef(Math.random() * 360);
  const stoppedRef     = useRef(false);
  const rafRef         = useRef<number>(0);

  useEffect(() => {
    if (stoppedZone) return;

    const SPEED = 255; // degrees per second
    let last: number | null = null;

    function tick(t: number) {
      if (stoppedRef.current) return;
      if (last !== null) {
        const dt = (t - last) / 1000;
        angleRef.current = (angleRef.current + SPEED * dt) % 360;
        needleGroupRef.current?.setAttribute(
          'transform',
          `rotate(${angleRef.current.toFixed(1)}, 100, 100)`,
        );
      }
      last = t;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stoppedZone]);

  function handleTap() {
    if (stoppedRef.current || stoppedZone) return;
    stoppedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    playGaugeStop();
    onStop(getZoneFromAngle(angleRef.current));
  }

  const CX = 100, CY = 100, IR = 24, OR = 86;

  // Zone boundary tick marks (angles where zones change)
  const ticks = [15, 60, 120, 240, 300, 345];

  return (
    <div
      className="flex flex-col items-center gap-2 animate-[fade-in_0.25s_ease_both]"
      onClick={stoppedZone ? undefined : handleTap}
      style={{ cursor: stoppedZone ? 'default' : 'pointer', userSelect: 'none' }}
    >
      {/* Zone feedback badge (appears after stopping) */}
      <div style={{ minHeight: 38 }} className="flex items-center justify-center">
        {stoppedZone && (
          <div
            className="px-5 py-1.5 rounded-full text-white font-black text-lg animate-[bounce-in_0.32s_cubic-bezier(0.34,1.56,0.64,1)_both]"
            style={{ background: ZONE_CFG[stoppedZone].color }}
          >
            {ZONE_CFG[stoppedZone].emoji} {ZONE_CFG[stoppedZone].label}
          </div>
        )}
      </div>

      {/* SVG gauge */}
      <svg
        viewBox="0 0 200 200"
        width={190}
        height={190}
        style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.45))' }}
      >
        {/* Outer ring background */}
        <circle cx={CX} cy={CY} r={OR + 5} fill="#1e293b" />

        {/* MISS zone — bottom 120° (120→240) */}
        <path d={donutSeg(CX, CY, IR, OR, 120, 240)} fill="#ef4444" />

        {/* OK zones — 60→120 and 240→300 */}
        <path d={donutSeg(CX, CY, IR, OR, 60, 120)}  fill="#f97316" />
        <path d={donutSeg(CX, CY, IR, OR, 240, 300)} fill="#f97316" />

        {/* GOOD zones — 15→60 and 300→345 */}
        <path d={donutSeg(CX, CY, IR, OR, 15, 60)}   fill="#fbbf24" />
        <path d={donutSeg(CX, CY, IR, OR, 300, 345)} fill="#fbbf24" />

        {/* PERFECT zone — split across 0° (345→360 and 0→15) */}
        <path d={donutSeg(CX, CY, IR, OR, 345, 360)} fill="#22c55e" />
        <path d={donutSeg(CX, CY, IR, OR, 0, 15)}    fill="#22c55e" />

        {/* Zone boundary dividers */}
        {ticks.map(deg => {
          const inner = polarToXY(CX, CY, IR + 1, deg);
          const outer = polarToXY(CX, CY, OR - 1, deg);
          return (
            <line
              key={deg}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="#1e293b" strokeWidth={2}
            />
          );
        })}

        {/* Zone emoji labels */}
        {([
          [0,    '🎯'],
          [37.5, '✨'],
          [90,   '😅'],
          [180,  '💦'],
          [270,  '😅'],
          [322.5,'✨'],
        ] as [number, string][]).map(([deg, emoji]) => {
          const mid = polarToXY(CX, CY, (IR + OR) / 2, deg);
          return (
            <text
              key={deg}
              x={mid.x} y={mid.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={deg === 0 || deg === 180 ? 14 : 11}
            >
              {emoji}
            </text>
          );
        })}

        {/* Spinning needle */}
        <g
          ref={needleGroupRef}
          transform={`rotate(${angleRef.current.toFixed(1)}, 100, 100)`}
        >
          <line
            x1={CX} y1={CY}
            x2={CX} y2={CY - OR + 4}
            stroke="white" strokeWidth={5} strokeLinecap="round"
          />
          <circle cx={CX} cy={CY - OR + 6} r={7} fill="white" />
        </g>

        {/* Center cap */}
        <circle cx={CX} cy={CY} r={13} fill="white" />
        <circle cx={CX} cy={CY} r={7}  fill="#374151" />
      </svg>

      {!stoppedZone && (
        <p className="text-base font-black text-gray-500 animate-pulse">
          ⚾ タップして なげる！
        </p>
      )}
    </div>
  );
}

// ── Cell sub-component ────────────────────────────────────────────────────────

function Cell({
  number,
  marked,
  inLine,
  justLanded,
  isTarget,
  disabled,
  onClick,
  cellRef,
}: {
  number: number;
  marked: boolean;
  inLine: boolean;
  justLanded: boolean;
  isTarget: boolean;
  disabled: boolean;
  onClick: () => void;
  cellRef: (el: HTMLDivElement | null) => void;
}) {
  const bg = inLine
    ? 'linear-gradient(160deg, #FEF08A, #FCD34D)'
    : marked
    ? 'linear-gradient(160deg, #92400E, #78350F)'
    : isTarget
    ? 'linear-gradient(160deg, #DBEAFE, #BFDBFE)'
    : 'linear-gradient(160deg, #FFFBEB, #FEF3C7)';

  const borderColor = isTarget
    ? '#3b82f6'
    : inLine  ? '#B45309'
    : marked  ? '#451A03'
    : '#92400E';

  const shadow = marked
    ? 'inset 0 2px 6px rgba(0,0,0,0.35)'
    : 'inset 0 -2px 3px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.18)';

  const animation = justLanded
    ? 'cell-catch 0.38s cubic-bezier(0.34,1.56,0.64,1) both'
    : isTarget
    ? 'target-pulse 1s ease-in-out infinite'
    : inLine
    ? undefined
    : undefined;

  return (
    <div
      ref={cellRef}
      onClick={disabled ? undefined : onClick}
      className="relative flex items-center justify-center overflow-hidden select-none"
      style={{
        aspectRatio: '1',
        border: `3px solid ${borderColor}`,
        borderRadius: 5,
        background: bg,
        boxShadow: shadow,
        cursor: disabled || marked ? 'default' : 'pointer',
        animation,
        transition: 'background 0.25s, border-color 0.25s',
      }}
    >
      {/* Shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, transparent 55%)',
          borderRadius: 3,
        }}
      />

      {marked ? (
        <>
          <span
            className="text-xl leading-none relative z-10"
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))' }}
          >
            ⚾
          </span>
          <span
            className="absolute bottom-0.5 right-1 leading-none relative z-10 font-black"
            style={{ fontSize: 9, color: inLine ? '#78350F' : 'rgba(255,255,255,0.55)' }}
          >
            {number}
          </span>
        </>
      ) : (
        <span
          className="text-base font-black relative z-10 leading-none"
          style={{ color: isTarget ? '#1d4ed8' : '#78350F' }}
        >
          {number}
        </span>
      )}

      {/* Bingo line shimmer */}
      {inLine && (
        <div
          className="absolute inset-0 rounded pointer-events-none"
          style={{ animation: 'toss-bingo-line 1.4s ease-in-out infinite' }}
        />
      )}
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function TossGameScreen({ playerName, onHome }: Props) {
  const [grid, setGrid]             = useState<number[][]>(() => generateTossGrid());
  const [marked, setMarked]         = useState<boolean[][]>(emptyMarked);
  const [ballsLeft, setBallsLeft]   = useState(TOSS_BALLS);
  const [flyingBall, setFlyingBall] = useState<FlyingBall | null>(null);
  const [justLanded, setJustLanded] = useState<string | null>(null);
  const [lineCells, setLineCells]   = useState<Set<string>>(new Set());
  const [lineCount, setLineCount]   = useState(0);
  const [phase, setPhase]           = useState<Phase>('play');
  const [score, setScore]           = useState(0);
  const [aimTarget, setAimTarget]   = useState<{ row: number; col: number } | null>(null);
  const [stoppedZone, setStoppedZone] = useState<GaugeZone | null>(null);

  // Always-fresh refs to avoid stale closures inside setTimeout
  const markedRef    = useRef(marked);
  const ballsLeftRef = useRef(ballsLeft);
  const lineCellsRef = useRef(lineCells);
  const lineCountRef = useRef(lineCount);
  markedRef.current    = marked;
  ballsLeftRef.current = ballsLeft;
  lineCellsRef.current = lineCells;
  lineCountRef.current = lineCount;

  // Ref to track the actual landing cell across async steps
  const throwTargetRef = useRef<[number, number] | null>(null);
  const ballIdRef      = useRef(0);

  const cellRefs    = useRef<(HTMLDivElement | null)[][]>(
    Array.from({ length: 5 }, () => Array(5).fill(null)),
  );
  const launcherRef = useRef<HTMLDivElement>(null);

  // ── Step 1: Player taps a cell → enter aiming phase ─────────────────────────

  const handleCellTap = useCallback((row: number, col: number) => {
    if (flyingBall || ballsLeftRef.current === 0 || markedRef.current[row][col] || phase !== 'play') return;
    setAimTarget({ row, col });
    setStoppedZone(null);
    setPhase('aiming');
  }, [flyingBall, phase]);

  // ── Step 2: Gauge stopped → calc landing, brief feedback, then throw ─────────

  const handleGaugeStop = useCallback((zone: GaugeZone) => {
    if (!aimTarget) return;

    const [ar, ac] = calcLandingCell(aimTarget.row, aimTarget.col, zone, markedRef.current);
    setStoppedZone(zone);

    // Sound feedback by zone
    if (zone === 'perfect') setTimeout(playCorrect, 80);
    if (zone === 'miss')    setTimeout(playWrong,   80);

    // Brief pause to show feedback, then launch
    setTimeout(() => {
      const cellEl   = cellRefs.current[ar][ac];
      const launchEl = launcherRef.current;
      if (!cellEl || !launchEl || ballsLeftRef.current === 0) return;

      const cRect = cellEl.getBoundingClientRect();
      const lRect = launchEl.getBoundingClientRect();

      const id    = ++ballIdRef.current;
      const fromX = lRect.left + lRect.width  / 2;
      const fromY = lRect.top  + lRect.height / 2;
      const toX   = cRect.left + cRect.width  / 2;
      const toY   = cRect.top  + cRect.height / 2;

      throwTargetRef.current = [ar, ac];
      setFlyingBall({ id, fromX, fromY, toX, toY });
      setPhase('play');
      setAimTarget(null);
      setStoppedZone(null);
      playToss();

      // ── Ball lands ─────────────────────────────────────────────────────────
      setTimeout(() => {
        const [r, c] = throwTargetRef.current!;
        const newMarked     = markedRef.current.map(row => [...row]);
        newMarked[r][c]     = true;

        const { cells: newCells, count: newCount } = checkTossLines(newMarked);
        const newBallsLeft  = ballsLeftRef.current - 1;
        const gotNewBingo   = newCount > lineCountRef.current;

        setMarked(newMarked);
        setLineCells(newCells);
        setLineCount(newCount);
        setBallsLeft(newBallsLeft);
        setFlyingBall(null);
        setJustLanded(`${r},${c}`);

        playLand();
        if (gotNewBingo) setTimeout(playBingo, 80);
        setTimeout(() => setJustLanded(null), 420);

        if (newBallsLeft === 0) {
          const finalScore = calcTossScore(grid, newCells);
          setScore(finalScore);
          setTimeout(() => setPhase('result'), 700);
        }
      }, 520);
    }, 480); // feedback display duration before throw
  }, [aimTarget, grid]);

  // ── Reset ────────────────────────────────────────────────────────────────────

  function handleReset() {
    setGrid(generateTossGrid());
    setMarked(emptyMarked());
    setBallsLeft(TOSS_BALLS);
    setFlyingBall(null);
    setJustLanded(null);
    setLineCells(new Set());
    setLineCount(0);
    setPhase('play');
    setScore(0);
    setAimTarget(null);
    setStoppedZone(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4 py-5 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="w-full max-w-sm px-4 flex items-center justify-between">
        <button
          onClick={onHome}
          className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
          aria-label="ホームにもどる"
        >
          🏠
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black text-gray-700">たまなげビンゴ</h2>
          <p className="text-xs text-gray-400 font-bold">{playerName} ⚾</p>
        </div>
        {/* Live score */}
        <div className="text-right">
          <p className="text-xs text-gray-400 font-bold">スコア</p>
          <p
            key={lineCount}
            className="text-2xl font-black animate-[number-pop_0.35s_cubic-bezier(0.34,1.56,0.64,1)_both]"
            style={{ color: 'var(--color-bingo-yellow)' }}
          >
            {calcTossScore(grid, lineCells)}
          </p>
        </div>
      </div>

      {/* Instruction */}
      <p className="text-sm font-bold text-gray-500 text-center px-4 min-h-[1.25rem]">
        {phase === 'play' && ballsLeft > 0 && !flyingBall && (
          'ねらうマスを タップしよう！'
        )}
        {phase === 'aiming' && aimTarget && (
          <span>
            マス <span className="font-black text-blue-600">{grid[aimTarget.row][aimTarget.col]}</span> をねらってる！
          </span>
        )}
        {lineCount > 0 && phase === 'play' && !flyingBall && (
          <span className="ml-1 font-black" style={{ color: 'var(--color-bingo-green)' }}>
            ✨ ビンゴ {lineCount} ライン！
          </span>
        )}
      </p>

      {/* Grid */}
      <div className="w-full max-w-sm px-3">
        <div
          className="rounded-2xl p-2 shadow-xl"
          style={{
            background: 'linear-gradient(160deg, #3B1A08, #6B2D0D)',
            border: '3px solid #2D1206',
            boxShadow: '0 8px 28px rgba(59,26,8,0.5)',
            opacity: phase === 'aiming' ? 0.85 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {grid.map((row, r) =>
              row.map((num, c) => {
                const key      = `${r},${c}`;
                const isTarget = aimTarget?.row === r && aimTarget?.col === c;
                return (
                  <Cell
                    key={key}
                    number={num}
                    marked={marked[r][c]}
                    inLine={lineCells.has(key)}
                    justLanded={justLanded === key}
                    isTarget={!!isTarget}
                    disabled={!!flyingBall || phase !== 'play'}
                    onClick={() => handleCellTap(r, c)}
                    cellRef={(el) => { cellRefs.current[r][c] = el; }}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Remaining balls (launcher origin — always mounted) */}
      <div className="flex flex-col items-center gap-2">
        <div
          ref={launcherRef}
          className="flex items-center justify-center gap-1 flex-wrap px-4 py-2 rounded-2xl"
          style={{ background: 'white', border: '2px solid rgba(0,0,0,0.07)', maxWidth: 300 }}
        >
          {Array.from({ length: TOSS_BALLS }).map((_, i) => (
            <span
              key={i}
              className="text-2xl leading-none transition-opacity duration-300"
              style={{ opacity: i < ballsLeft ? 1 : 0.15 }}
            >
              ⚾
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 font-bold">
          あと <span className="text-lg font-black text-gray-600">{ballsLeft}</span> 球
        </p>
      </div>

      {/* Gauge (shown only during aiming phase) */}
      {phase === 'aiming' && (
        <GaugeOverlay
          stoppedZone={stoppedZone}
          onStop={handleGaugeStop}
        />
      )}

      {/* Flying ball overlay */}
      {flyingBall && (
        <div
          key={flyingBall.id}
          style={{
            position: 'fixed',
            left: flyingBall.fromX,
            top:  flyingBall.fromY,
            zIndex: 200,
            pointerEvents: 'none',
            fontSize: 28,
            lineHeight: 1,
            ['--dx' as string]: `${flyingBall.toX - flyingBall.fromX}px`,
            ['--dy' as string]: `${flyingBall.toY - flyingBall.fromY}px`,
            animation: 'ball-toss 0.52s cubic-bezier(0.4, 0.0, 0.55, 1) forwards',
          }}
        >
          ⚾
        </div>
      )}

      {/* Result overlay */}
      {phase === 'result' && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        >
          <div
            className="mx-5 rounded-3xl p-7 shadow-2xl flex flex-col items-center gap-4 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
            style={{ background: 'white', maxWidth: 340, width: '100%' }}
          >
            <p className="text-2xl font-black text-gray-700">ゲームしゅうりょう！🎉</p>

            {lineCount > 0 ? (
              <>
                <div className="text-center">
                  <p className="text-6xl font-black" style={{ color: 'var(--color-bingo-yellow)' }}>
                    {score}
                  </p>
                  <p className="text-sm text-gray-400 font-bold">てん</p>
                </div>
                <div
                  className="rounded-2xl px-6 py-2 text-center"
                  style={{ background: 'var(--color-bingo-green)', color: 'white' }}
                >
                  <p className="text-lg font-black">ビンゴ {lineCount} ライン！</p>
                </div>
                <p className="text-sm text-gray-500 text-center font-bold">
                  ビンゴラインの数字を合わせると<br />{score}てんだよ！
                </p>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-5xl">😢</p>
                  <p className="text-base font-black text-gray-500 mt-2">ビンゴ ならなかった…</p>
                  <p className="text-sm text-gray-400 mt-1">もう一度 チャレンジしよう！</p>
                </div>
              </>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={handleReset}
                className="flex-1 py-4 rounded-2xl text-lg font-black text-white shadow-md active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #ff922b 0%, #e03131 100%)' }}
              >
                もう一度！⚾
              </button>
              <button
                onClick={onHome}
                className="py-4 px-4 rounded-2xl text-lg font-black text-gray-500 shadow-md active:scale-95 transition-all bg-gray-100"
              >
                🏠
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
