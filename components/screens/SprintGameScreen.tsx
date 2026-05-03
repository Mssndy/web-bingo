'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DISTANCE_M,
  M_PER_TAP,
  getBestTime,
  saveBestTime,
  rankForTime,
  RANK_META,
  formatSeconds,
  RUNNERS,
  type RunnerChar,
  type SprintRank,
} from '@/lib/sprint';
import {
  playMiniGameStart, playSprintWhistle, playSprintBeep,
  playSprintStep, playSprintCheer,
} from '@/lib/sounds';

type Phase = 'setup' | 'countdown' | 'racing' | 'finish';

interface Props {
  playerName: string;
  onHome: () => void;
}

// ── Subcomponents ───────────────────────────────────────────────────────────

/** Layered stadium background: sky → mountains → grandstand → crowd. */
function StadiumBackdrop() {
  return (
    <svg viewBox="0 0 400 120" className="w-full h-[120px] block" preserveAspectRatio="none">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="60%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="100%" stopColor="#fde047" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <rect width="400" height="120" fill="url(#skyGrad)" />
      {/* Sun */}
      <circle cx="340" cy="32" r="18" fill="url(#sun)" />
      <circle cx="340" cy="32" r="11" fill="#fef9c3" />
      {/* Mountains */}
      <polygon points="0,82 60,50 120,76 200,42 270,72 360,52 400,78 400,120 0,120" fill="#475569" opacity="0.55" />
      <polygon points="0,90 50,68 130,86 210,68 280,88 360,72 400,90 400,120 0,120" fill="#1e293b" opacity="0.55" />
      {/* Grandstand structure */}
      <rect x="0" y="72" width="400" height="32" fill="#475569" opacity="0.5" />
      {/* Crowd dots */}
      {Array.from({ length: 110 }).map((_, i) => {
        const x = (i * 3.6) % 400;
        const y = 76 + (i % 3) * 5 + ((i * 7) % 3);
        const colors = ['#ef4444', '#3b82f6', '#22c55e', '#fde047', '#f97316', '#ec4899', '#8b5cf6', '#14b8a6', '#fff'];
        const c = colors[i % colors.length];
        return <circle key={i} cx={x} cy={y} r="1.6" fill={c} opacity="0.85" />;
      })}
      {/* Banner pole + flag */}
      <rect x="36" y="40" width="2" height="40" fill="#1e293b" />
      <polygon points="38,42 60,48 38,54" fill="#ef4444" />
      <rect x="356" y="36" width="2" height="44" fill="#1e293b" />
      <polygon points="358,38 376,44 358,50" fill="#3b82f6" />
    </svg>
  );
}

/** Track with lanes, distance markers, and finish-line tape on the right. */
function Track({ position, runner, racing }: { position: number; runner: RunnerChar; racing: boolean }) {
  // Runner's left position as % of track width.
  const pct = Math.max(0, Math.min(100, (position / DISTANCE_M) * 100));
  // Tap rate proxy = runner emoji animation speed (faster = bouncier)
  return (
    <div
      className="relative w-full"
      style={{
        height: 130,
        background: 'linear-gradient(180deg, #fb923c 0%, #ea580c 100%)',
        borderTop: '3px solid #fff',
        borderBottom: '3px solid #fff',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    >
      {/* Lane dividers (dashed white lines) */}
      {[0.25, 0.5, 0.75].map((y, i) => (
        <div
          key={i}
          className="absolute left-0 right-0"
          style={{
            top: `${y * 100}%`,
            height: 2,
            backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 16px, transparent 16px 32px)',
            opacity: 0.85,
          }}
        />
      ))}

      {/* Distance markers — every 20m */}
      {[20, 40, 60, 80].map((m) => (
        <div
          key={m}
          className="absolute top-1 text-[10px] font-black text-white/80 tracking-wider select-none"
          style={{ left: `${m}%`, transform: 'translateX(-50%)' }}
        >
          {m}m
        </div>
      ))}

      {/* Finish line — checkered pattern + rope tape */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          right: 0,
          width: 12,
          background:
            'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 6px 6px',
        }}
      />
      {/* Tape rope (thin red line crossing the lanes; "breaks" when runner finishes) */}
      <div
        className="absolute"
        style={{
          right: 12,
          top: '50%',
          width: 8,
          height: 2,
          background: '#ef4444',
          transform: 'translateY(-50%)',
          opacity: position >= DISTANCE_M ? 0 : 1,
          transition: 'opacity 0.25s',
        }}
      />

      {/* Speed lines (more visible as runner moves) */}
      {racing && pct > 5 && Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: `${30 + i * 14}%`,
            left: `calc(${pct}% - ${24 + i * 8}px)`,
            width: 18 + i * 4,
            height: 2,
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 2,
            animation: `sprint-line-fade 0.3s ease-out infinite ${i * 0.06}s`,
          }}
        />
      ))}

      {/* Runner — positioned by left%, vertically centered */}
      <div
        className="absolute"
        style={{
          left: `${pct}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.08s linear',
        }}
      >
        <div
          style={{
            fontSize: 48,
            lineHeight: 1,
            display: 'inline-block',
            filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.4))',
            animation: racing ? 'sprint-bounce 0.18s ease-in-out infinite' : undefined,
          }}
        >
          {runner.emoji}
        </div>
      </div>
    </div>
  );
}

/** Confetti burst overlay shown on a new best. */
function Confetti() {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#fde047', '#f97316', '#ec4899', '#8b5cf6'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 28 }).map((_, i) => {
        const left = (i * 13) % 100;
        const delay = (i % 6) * 0.12;
        const c = colors[i % colors.length];
        return (
          <span
            key={i}
            className="absolute text-2xl"
            style={{
              left: `${left}%`,
              top: '-10%',
              color: c,
              animation: `confetti-fall ${1.6 + (i % 4) * 0.3}s linear ${delay}s forwards`,
            }}
          >
            ●
          </span>
        );
      })}
    </div>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function SprintGameScreen({ playerName, onHome }: Props) {
  const [phase, setPhase]         = useState<Phase>('setup');
  const [runner, setRunner]       = useState<RunnerChar>(RUNNERS[0]);
  const [position, setPosition]   = useState(0);
  const [taps, setTaps]           = useState(0);
  const [bestTime, setBestTime]   = useState(0);
  const [finishMs, setFinishMs]   = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [countdown, setCountdown] = useState<number | 'GO'>(3);
  const [tick, setTick]           = useState(0);  // forces timer re-render

  const positionRef  = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const tapCountRef  = useRef(0);

  // Load best on mount / name change
  useEffect(() => {
    if (playerName) setBestTime(getBestTime(playerName));
  }, [playerName]);

  // Countdown sequence
  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdown(3);
    playSprintBeep(660);
    const t1 = setTimeout(() => { setCountdown(2);    playSprintBeep(660); }, 800);
    const t2 = setTimeout(() => { setCountdown(1);    playSprintBeep(660); }, 1600);
    const t3 = setTimeout(() => { setCountdown('GO'); playSprintWhistle(); }, 2400);
    const t4 = setTimeout(() => {
      // Begin race
      startTimeRef.current = Date.now();
      positionRef.current = 0;
      tapCountRef.current = 0;
      setPosition(0);
      setTaps(0);
      setPhase('racing');
    }, 2700);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [phase]);

  // Tick to refresh the visible timer (no logic, just re-render every 50ms)
  useEffect(() => {
    if (phase !== 'racing') return;
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, [phase]);

  // Watch for finish (position >= DISTANCE_M)
  useEffect(() => {
    if (phase !== 'racing') return;
    if (positionRef.current < DISTANCE_M) return;
    const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
    const wasBest = saveBestTime(playerName, elapsed);
    setFinishMs(elapsed);
    setIsNewBest(wasBest);
    if (wasBest) setBestTime(elapsed);
    playSprintCheer();
    setPhase('finish');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, phase]);

  const handleStart = useCallback(() => {
    playMiniGameStart();
    setFinishMs(null);
    setIsNewBest(false);
    setPhase('countdown');
  }, []);

  const handleTap = useCallback(() => {
    if (phase !== 'racing') return;
    tapCountRef.current += 1;
    setTaps(tapCountRef.current);
    positionRef.current = Math.min(DISTANCE_M, positionRef.current + M_PER_TAP);
    setPosition(positionRef.current);
    // Footstep sound — every 3rd tap to avoid noise overload
    if (tapCountRef.current % 3 === 0) playSprintStep();
  }, [phase]);

  // Compute live elapsed / final time for display
  const elapsedMs =
    phase === 'racing' && startTimeRef.current
      ? Date.now() - startTimeRef.current
      : (finishMs ?? 0);

  void tick; // referenced to keep the 50ms re-render cycle live

  // ── Setup phase ──────────────────────────────────────────────────────────

  if (phase === 'setup') {
    return (
      <div className="flex flex-col gap-4 px-4 py-4 animate-[fade-in_0.3s_ease_both]">
        <div className="flex items-center justify-between">
          <button
            onClick={onHome}
            className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
            aria-label="ホームにもどる"
          >
            🏠
          </button>
          <div className="w-10" />
        </div>

        <div className="text-center">
          <h2
            className="text-3xl font-black"
            style={{
              background: 'linear-gradient(90deg, #ef4444 0%, #f97316 50%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            🏃‍♂️ 100m走
          </h2>
          <p className="text-sm text-gray-500 font-bold mt-1">
            {playerName}、れんだで ゴールまで！
          </p>
        </div>

        {/* Stadium preview */}
        <div className="rounded-3xl overflow-hidden shadow-lg border-4 border-white">
          <StadiumBackdrop />
          <Track position={2} runner={runner} racing={false} />
        </div>

        {/* Runner picker */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-black text-gray-500 text-center">ランナーを えらんでね</p>
          <div className="grid grid-cols-4 gap-2">
            {RUNNERS.map((r) => {
              const active = runner.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRunner(r)}
                  className="rounded-2xl py-3 transition-all active:scale-90 shadow"
                  style={{
                    background: active ? r.color : 'white',
                    color: active ? 'white' : '#94a3b8',
                    border: active ? `3px solid ${r.color}` : '3px solid #e5e7eb',
                    boxShadow: active ? `0 4px 12px ${r.color}66` : undefined,
                  }}
                >
                  <div className="text-3xl leading-none">{r.emoji}</div>
                  <div className="text-[10px] font-black mt-1">{r.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Best time */}
        {bestTime > 0 ? (
          <div
            className="rounded-2xl px-4 py-3 flex items-center justify-between shadow"
            style={{ background: 'white', border: '2px solid rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏅</span>
              <span className="text-sm font-black text-gray-500">ベストタイム</span>
            </div>
            <span className="text-2xl font-black tabular-nums" style={{ color: 'var(--color-bingo-orange)' }}>
              {formatSeconds(bestTime)}<span className="text-sm">秒</span>
            </span>
          </div>
        ) : (
          <p className="text-xs text-gray-400 font-bold text-center">
            まだベストタイムが ないよ！はじめての挑戦！
          </p>
        )}

        <button
          onClick={handleStart}
          className="w-full py-5 rounded-3xl text-2xl font-black text-white shadow-xl active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
            animation: 'float-bob-1 3s ease-in-out infinite',
          }}
        >
          🏁 スタート！
        </button>

        <p className="text-xs text-gray-400 font-bold text-center">
          がめんを どんどん タップして ゴールを めざそう！
        </p>
      </div>
    );
  }

  // ── Countdown / racing / finish phases ───────────────────────────────────

  const currentTime = phase === 'finish' ? (finishMs ?? 0) : elapsedMs;
  const rank: SprintRank | null = phase === 'finish' && finishMs ? rankForTime(finishMs) : null;
  const rankCfg = rank ? RANK_META[rank] : null;

  return (
    <div className="flex flex-col h-full select-none">

      {/* Top header bar */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button
          onClick={onHome}
          className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
          aria-label="ホームにもどる"
        >
          🏠
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-gray-400">タイム</p>
          <p className="text-3xl font-black tabular-nums text-gray-800 leading-none">
            {formatSeconds(currentTime)}
            <span className="text-sm ml-1 text-gray-500">s</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400">きょり</p>
          <p className="text-base font-black tabular-nums text-gray-700">
            {Math.min(DISTANCE_M, Math.round(position * 10) / 10).toFixed(1)}<span className="text-xs">m</span>
          </p>
        </div>
      </div>

      {/* Stadium scene */}
      <div className="rounded-2xl overflow-hidden shadow-md mx-2 border-2 border-white">
        <StadiumBackdrop />
        <Track position={position} runner={runner} racing={phase === 'racing'} />
      </div>

      {/* Body — countdown, tap-pad, or finish overlay */}
      {phase === 'countdown' && (
        <div className="flex-1 flex items-center justify-center">
          <p
            key={String(countdown)}
            className="font-black drop-shadow-lg"
            style={{
              fontSize: countdown === 'GO' ? 96 : 120,
              color: countdown === 'GO' ? '#16a34a' : '#ef4444',
              animation: 'janken-countdown 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
              textShadow: '0 6px 20px rgba(0,0,0,0.18)',
            }}
          >
            {countdown === 'GO' ? 'GO!' : countdown}
          </p>
        </div>
      )}

      {phase === 'racing' && (
        <button
          onClick={handleTap}
          onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
          className="flex-1 mx-2 mt-2 mb-2 rounded-3xl shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center text-white font-black text-3xl"
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            border: '4px solid #fff',
            boxShadow: '0 6px 20px rgba(239,68,68,0.45)',
            touchAction: 'manipulation',
          }}
        >
          <span style={{ fontSize: 56, lineHeight: 1 }}>👇</span>
          <span className="mt-2">タップ！</span>
          <span className="text-xs font-bold opacity-80 mt-1">{taps} かい</span>
        </button>
      )}

      {phase === 'finish' && finishMs !== null && rankCfg && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
          {isNewBest && <Confetti />}
          <div
            className="rounded-3xl shadow-xl px-6 py-5 text-center text-white animate-[bounce-in_0.6s_cubic-bezier(0.34,1.56,0.64,1)_both] w-full max-w-xs relative z-10"
            style={{ background: rankCfg.bg }}
          >
            <div
              className="text-7xl mb-2"
              style={{ animation: 'float-bob-1 2.4s ease-in-out infinite', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' }}
            >
              {rankCfg.emoji}
            </div>
            <p className="text-xl font-black drop-shadow mb-1">{rankCfg.label}</p>
            {isNewBest && (
              <p
                className="inline-block px-3 py-1 rounded-full bg-white/30 text-xs font-black mb-2"
                style={{ animation: 'wiggle 0.6s ease both' }}
              >
                🌟 NEW BEST!
              </p>
            )}
            <p className="text-5xl font-black tabular-nums drop-shadow-lg leading-none mt-2">
              {formatSeconds(finishMs)}<span className="text-2xl">s</span>
            </p>
            <p className="text-xs font-bold opacity-90 mt-3">
              {taps} タップで ゴール！
            </p>
            {bestTime > 0 && !isNewBest && (
              <p className="text-xs font-bold opacity-90 mt-1">
                ベスト: {formatSeconds(bestTime)}秒
              </p>
            )}
          </div>

          <div className="w-full max-w-xs flex flex-col gap-2 mt-4 relative z-10">
            <button
              onClick={handleStart}
              className="w-full py-4 rounded-3xl text-xl font-black text-white shadow-lg active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)' }}
            >
              🔁 もう一回！
            </button>
            <button
              onClick={onHome}
              className="w-full py-3 rounded-2xl text-base font-black text-gray-500 active:scale-95 transition-all bg-white shadow"
              style={{ border: '2px solid #e5e7eb' }}
            >
              🏠 ホームに もどる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
