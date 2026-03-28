'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRandomHand, judgeJanken, getRelationshipText, HAND_LABEL } from '@/lib/janken';
import type { JankenHand, JankenResult } from '@/lib/janken';
import {
  playJankenJan, playJankenKen, playJankenPonFinal,
  playJankenWin, playJankenLose, playJankenDraw,
} from '@/lib/sounds';

interface Props {
  playerName: string;
  onHome: () => void;
}

type Phase = 'ready' | 'countdown' | 'pick' | 'battle' | 'reveal';
type BattleStep = 'enter' | 'shake' | 'transform' | 'done';

interface PickResult {
  playerHand: JankenHand;
  cpuHand: JankenHand;
  result: JankenResult;
}

// ── SVG Hand Illustrations ────────────────────────────────────────────────────
// All hands use a consistent warm-yellow skin palette and face left (flip CPU).

const S  = '#FBBF24';   // main skin
const SD = '#D97706';   // dark skin / line
const SH = 'rgba(255,255,255,0.26)';  // shine

/** グー: 閉じたこぶし */
function GuuHand({ size = 90, flip = false }: { size?: number; flip?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
      style={flip ? { transform: 'scaleX(-1)', display: 'block' } : { display: 'block' }}>
      <ellipse cx="50" cy="92" rx="26" ry="5" fill="rgba(0,0,0,0.10)" />
      {/* wrist */}
      <rect x="33" y="65" width="34" height="24" rx="8" fill={S} />
      <rect x="33" y="65" width="34" height="9"  rx="5" fill={SD} opacity="0.18" />
      {/* fist body */}
      <path d="M18 62 Q15 44 22 30 Q31 15 50 15 Q69 15 78 30 Q85 44 82 62 Q80 74 64 77 Q50 80 36 77 Q22 74 18 62Z" fill={S} />
      {/* knuckle row */}
      <path d="M27 47 Q36 40 44 47 Q52 40 60 47 Q68 40 74 47" stroke={SD} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* thumb */}
      <path d="M18 64 Q7 54 11 40 Q15 29 26 35 Q23 46 18 64Z" fill={S} />
      <path d="M15 48 Q20 38 25 40" stroke={SD} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* shine */}
      <ellipse cx="40" cy="28" rx="13" ry="7" fill={SH} transform="rotate(-16 40 28)" />
    </svg>
  );
}

/** チョキ: 人差し指+中指を立てたV字 */
function ChokiHand({ size = 90, flip = false }: { size?: number; flip?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
      style={flip ? { transform: 'scaleX(-1)', display: 'block' } : { display: 'block' }}>
      <ellipse cx="50" cy="92" rx="26" ry="5" fill="rgba(0,0,0,0.10)" />
      {/* wrist */}
      <rect x="33" y="65" width="34" height="24" rx="8" fill={S} />
      <rect x="33" y="65" width="34" height="9"  rx="5" fill={SD} opacity="0.18" />
      {/* lower palm / knuckle base */}
      <path d="M24 67 Q22 55 26 48 Q36 52 50 52 Q64 52 74 48 Q78 55 76 67Z" fill={S} />
      {/* index finger */}
      <rect x="33" y="13" width="14" height="44" rx="7" fill={S} />
      <ellipse cx="40" cy="23" rx="4" ry="8" fill={SH} />
      <line x1="36" y1="40" x2="46" y2="40" stroke={SD} strokeWidth="1.5" opacity="0.5" />
      {/* middle finger */}
      <rect x="51" y="10" width="14" height="45" rx="7" fill={S} />
      <ellipse cx="58" cy="22" rx="4" ry="8" fill={SH} />
      <line x1="54" y1="38" x2="64" y2="38" stroke={SD} strokeWidth="1.5" opacity="0.5" />
      {/* ring + pinky (curled) */}
      <path d="M66 52 Q76 46 78 56 Q76 66 66 66Z" fill={SD} opacity="0.25" />
      {/* thumb */}
      <path d="M24 62 Q12 54 15 41 Q19 31 28 37 Q25 48 24 62Z" fill={S} />
      {/* palm knuckle row */}
      <path d="M26 54 Q36 50 50 49 Q64 50 74 54" stroke={SD} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}

/** パー: 5本指を広げた開いた手 */
function PaaHand({ size = 90, flip = false }: { size?: number; flip?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
      style={flip ? { transform: 'scaleX(-1)', display: 'block' } : { display: 'block' }}>
      <ellipse cx="50" cy="92" rx="26" ry="5" fill="rgba(0,0,0,0.10)" />
      {/* wrist */}
      <rect x="33" y="67" width="34" height="22" rx="8" fill={S} />
      <rect x="33" y="67" width="34" height="9"  rx="5" fill={SD} opacity="0.18" />
      {/* palm */}
      <path d="M20 70 Q18 57 22 50 Q36 54 50 54 Q64 54 78 50 Q82 57 80 70Z" fill={S} />
      {/* pinky */}
      <rect x="18" y="20" width="13" height="40" rx="6.5" fill={S} />
      <ellipse cx="25" cy="29" rx="4" ry="8" fill={SH} />
      {/* ring */}
      <rect x="33" y="13" width="13" height="45" rx="6.5" fill={S} />
      <ellipse cx="40" cy="22" rx="4" ry="9" fill={SH} />
      {/* middle */}
      <rect x="48" y="10" width="13" height="46" rx="6.5" fill={S} />
      <ellipse cx="55" cy="20" rx="4" ry="9" fill={SH} />
      {/* index */}
      <rect x="63" y="14" width="13" height="44" rx="6.5" fill={S} />
      <ellipse cx="70" cy="24" rx="4" ry="8" fill={SH} />
      {/* thumb */}
      <path d="M20 66 Q8 56 11 40 Q15 28 26 36 Q22 50 20 66Z" fill={S} />
      {/* knuckle row */}
      <path d="M20 56 Q35 51 50 50 Q65 51 80 56" stroke={SD} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}

/** ？手: カウントダウン中の謎の手（こぶし） */
function MysteryHand({ size = 90, flip = false }: { size?: number; flip?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
      style={flip ? { transform: 'scaleX(-1)', display: 'block' } : { display: 'block' }}>
      <ellipse cx="50" cy="92" rx="26" ry="5" fill="rgba(0,0,0,0.10)" />
      <rect x="33" y="65" width="34" height="24" rx="8" fill="#94a3b8" />
      <rect x="33" y="65" width="34" height="9"  rx="5" fill="#64748b" opacity="0.30" />
      <path d="M18 62 Q15 44 22 30 Q31 15 50 15 Q69 15 78 30 Q85 44 82 62 Q80 74 64 77 Q50 80 36 77 Q22 74 18 62Z" fill="#94a3b8" />
      <path d="M27 47 Q36 40 44 47 Q52 40 60 47 Q68 40 74 47" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M18 64 Q7 54 11 40 Q15 29 26 35 Q23 46 18 64Z" fill="#94a3b8" />
      <ellipse cx="40" cy="28" rx="13" ry="7" fill="rgba(255,255,255,0.22)" transform="rotate(-16 40 28)" />
      {/* ? mark */}
      <text x="50" y="58" textAnchor="middle" fontSize="26" fontWeight="900" fill="rgba(255,255,255,0.70)">？</text>
    </svg>
  );
}

const HAND_COMPONENT: Record<JankenHand, typeof GuuHand> = {
  guu:   GuuHand,
  choki: ChokiHand,
  paa:   PaaHand,
};

// ── Style / Config ────────────────────────────────────────────────────────────

const HAND_BG: Record<JankenHand, string> = {
  guu:   'linear-gradient(145deg, #a1a1aa 0%, #52525b 100%)',
  choki: 'linear-gradient(145deg, #f87171 0%, #b91c1c 100%)',
  paa:   'linear-gradient(145deg, #fde68a 0%, #b45309 100%)',
};

const RESULT_CFG: Record<JankenResult, { label: string; emoji: string; bg: string }> = {
  win:  { label: 'やった！かった！', emoji: '🎉', bg: 'linear-gradient(135deg, #34d399 0%, #059669 100%)' },
  lose: { label: 'おしい！まけた！', emoji: '💪', bg: 'linear-gradient(135deg, #fb923c 0%, #c2410c 100%)' },
  draw: { label: 'あいこ！',         emoji: '🤝', bg: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)' },
};

// ── HandCard component ────────────────────────────────────────────────────────

function HandCard({
  hand,
  label,
  revealed,
  animState,
  flip = false,
}: {
  hand: JankenHand | null;
  label: string;
  revealed: boolean;
  animState: BattleStep | null;
  flip?: boolean;
}) {
  const bg = hand && revealed
    ? HAND_BG[hand]
    : 'linear-gradient(145deg, #e2e8f0 0%, #94a3b8 100%)';

  const HandComp = hand && revealed ? HAND_COMPONENT[hand] : null;

  const cardAnimation = (() => {
    if (animState === 'enter')     return 'janken-object-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both';
    if (animState === 'shake')     return 'janken-battle-shake 0.6s ease-in-out 3';
    if (animState === 'transform') return 'janken-hand-transform 0.55s cubic-bezier(0.34,1.56,0.64,1) both';
    if (animState === 'done') {
      if (!hand) return undefined;
      // result animations set externally on parent
      return undefined;
    }
    return undefined;
  })();

  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-xs font-black text-gray-400 tracking-wide">{label}</p>
      <div
        className="w-[108px] h-[108px] rounded-3xl flex items-center justify-center shadow-xl"
        style={{
          background: bg,
          border: '3px solid rgba(255,255,255,0.3)',
          animation: cardAnimation,
        }}
      >
        {HandComp
          ? <HandComp size={80} flip={flip} />
          : <MysteryHand size={80} flip={flip} />
        }
      </div>
      {hand && revealed && (
        <p
          className="text-sm font-black text-gray-600"
          style={{ animation: 'janken-explanation 0.3s ease 0.3s both', opacity: 0 }}
        >
          {HAND_LABEL[hand]}
        </p>
      )}
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function JankenGameScreen({ playerName, onHome }: Props) {
  const [phase, setPhase]           = useState<Phase>('ready');
  const [beat, setBeat]             = useState<0 | 1 | 2 | 3>(0);  // 1=じゃん 2=けん 3=ぽん
  const [pickResult, setPickResult] = useState<PickResult | null>(null);
  const [battleStep, setBattleStep] = useState<BattleStep>('enter');
  const [score, setScore]           = useState({ win: 0, lose: 0, draw: 0 });
  const pickTimeoutRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Countdown beats ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    const t1 = setTimeout(() => { setBeat(1); playJankenJan(); },       80);
    const t2 = setTimeout(() => { setBeat(2); playJankenKen(); },      480);
    const t3 = setTimeout(() => { setBeat(3); playJankenPonFinal(); }, 880);
    const t4 = setTimeout(() => setPhase('pick'),                      1050);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [phase]);

  // ── Auto-pick timeout during pick phase ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'pick') return;
    pickTimeoutRef.current = setTimeout(() => {
      // Time's up → random pick
      commitPick(getRandomHand());
    }, 1800);
    return () => { if (pickTimeoutRef.current) clearTimeout(pickTimeoutRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Battle animation sequence ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'battle' || !pickResult) return;

    setBattleStep('enter');
    const t1 = setTimeout(() => setBattleStep('shake'),     400);
    // shake runs for 0.6s × 3 = 1800ms
    const t2 = setTimeout(() => setBattleStep('transform'), 2200);
    const t3 = setTimeout(() => setBattleStep('done'),      2800);
    const t4 = setTimeout(() => {
      // Play result sound
      if (pickResult.result === 'win')       playJankenWin();
      else if (pickResult.result === 'lose') playJankenLose();
      else                                   playJankenDraw();
      setPhase('reveal');
    }, 3000);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [phase, pickResult]);

  // ── Pick handler ─────────────────────────────────────────────────────────────
  const commitPick = useCallback((hand: JankenHand) => {
    if (pickTimeoutRef.current) clearTimeout(pickTimeoutRef.current);
    const cpuHand = getRandomHand();
    const result  = judgeJanken(hand, cpuHand);
    setPickResult({ playerHand: hand, cpuHand, result });
    setScore(s => ({ ...s, [result]: s[result] + 1 }));
    setPhase('battle');
  }, []);

  const handleStartCountdown = useCallback(() => {
    setBeat(0);
    setPickResult(null);
    setPhase('countdown');
  }, []);

  const handleAgain = useCallback(() => {
    setBeat(0);
    setPickResult(null);
    setBattleStep('enter');
    setPhase('ready');
  }, []);

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
          <h2 className="text-xl font-black text-gray-700">じゃんけん</h2>
          <p className="text-xs text-gray-400 font-bold">{playerName} ✊✌️🖐️</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Score */}
      <div
        className="flex gap-5 text-center px-6 py-2 rounded-2xl"
        style={{ background: 'white', border: '2px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {[
          { key: 'win',  label: 'かち',  color: 'var(--color-bingo-green)'  },
          { key: 'lose', label: 'まけ',  color: 'var(--color-bingo-orange)' },
          { key: 'draw', label: 'あいこ', color: 'var(--color-bingo-blue)'  },
        ].map(({ key, label, color }, i) => (
          <div key={key} className="flex items-center gap-3">
            {i > 0 && <div className="text-gray-200 text-2xl">|</div>}
            <div>
              <p className="text-2xl font-black" style={{ color }}>
                {score[key as keyof typeof score]}
              </p>
              <p className="text-xs text-gray-400 font-bold">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── READY phase ── */}
      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4 animate-[fade-in_0.25s_ease_both]">

          {/* Neutral hands preview */}
          <div className="flex items-end justify-center gap-10">
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-black text-gray-400">CPU</p>
              <MysteryHand size={90} flip />
            </div>
            <div className="text-4xl font-black text-gray-200 pb-4">VS</div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-black text-gray-400">{playerName}</p>
              <MysteryHand size={90} />
            </div>
          </div>

          <button
            onClick={handleStartCountdown}
            className="w-full py-5 rounded-3xl text-2xl font-black text-white shadow-xl active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              animation: 'float-bob-1 3s ease-in-out infinite',
            }}
          >
            ✊ スタート！
          </button>

          <p className="text-xs text-gray-400 font-bold text-center">
            「ぽん！」のあとに てを えらんでね！
          </p>
        </div>
      )}

      {/* ── COUNTDOWN phase ── */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4 animate-[fade-in_0.2s_ease_both]">

          {/* Hands (mystery, shaking) */}
          <div className="flex items-end justify-center gap-10">
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-black text-gray-400">CPU</p>
              <div style={{ animation: beat >= 1 ? 'janken-battle-shake 0.42s ease-in-out infinite' : undefined }}>
                <MysteryHand size={90} flip />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-200 pb-4">VS</div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-black text-gray-400">{playerName}</p>
              <div style={{ animation: beat >= 1 ? 'janken-battle-shake 0.42s ease-in-out infinite' : undefined }}>
                <MysteryHand size={90} />
              </div>
            </div>
          </div>

          {/* Big beat text */}
          <div className="h-24 flex items-center justify-center">
            {beat === 1 && (
              <p
                key="jan"
                className="text-7xl font-black text-gray-700"
                style={{ animation: 'janken-countdown 0.32s cubic-bezier(0.34,1.56,0.64,1) both' }}
              >
                じゃん
              </p>
            )}
            {beat === 2 && (
              <p
                key="ken"
                className="text-7xl font-black text-gray-700"
                style={{ animation: 'janken-countdown 0.32s cubic-bezier(0.34,1.56,0.64,1) both' }}
              >
                けん
              </p>
            )}
            {beat === 3 && (
              <p
                key="pon"
                className="text-8xl font-black"
                style={{
                  color: 'var(--color-bingo-orange)',
                  animation: 'janken-pon-burst 0.38s cubic-bezier(0.34,1.56,0.64,1) both',
                  textShadow: '0 0 24px rgba(249,115,22,0.6)',
                }}
              >
                ぽん！
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── PICK phase ── */}
      {phase === 'pick' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-4 animate-[fade-in_0.15s_ease_both]">

          <p
            className="text-2xl font-black text-gray-700"
            style={{ animation: 'janken-banner 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            どれにする？⚡
          </p>

          <div className="grid grid-cols-3 gap-3 w-full">
            {(['guu', 'choki', 'paa'] as JankenHand[]).map((hand, i) => {
              const HandComp = HAND_COMPONENT[hand];
              return (
                <button
                  key={hand}
                  onClick={() => commitPick(hand)}
                  className="flex flex-col items-center gap-2 rounded-3xl py-4 px-1 shadow-lg active:scale-90 transition-all relative overflow-hidden"
                  style={{
                    background: HAND_BG[hand],
                    border: '3px solid rgba(255,255,255,0.35)',
                    animation: `janken-pick-appear 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.06}s both`,
                  }}
                >
                  <div className="absolute inset-0 rounded-3xl"
                    style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.20) 0%,transparent 55%)' }}
                  />
                  <HandComp size={68} />
                  <span className="text-sm font-black text-white drop-shadow relative z-10">
                    {HAND_LABEL[hand]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BATTLE phase ── */}
      {phase === 'battle' && pickResult && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4 animate-[fade-in_0.2s_ease_both]">

          <div className="flex items-end justify-center gap-8">
            {/* CPU */}
            <HandCard
              hand={pickResult.cpuHand}
              label="CPU"
              revealed={battleStep === 'transform' || battleStep === 'done'}
              animState={battleStep}
              flip
            />
            <div className="text-3xl font-black text-gray-200 pb-8">VS</div>
            {/* Player */}
            <HandCard
              hand={pickResult.playerHand}
              label={playerName}
              revealed={battleStep === 'transform' || battleStep === 'done'}
              animState={battleStep}
            />
          </div>

          {battleStep === 'shake' && (
            <p className="text-xl font-black text-gray-500 animate-pulse">…どっちが かつ？！</p>
          )}
          {(battleStep === 'transform' || battleStep === 'done') && (
            <p
              className="text-xl font-black text-gray-600"
              style={{ animation: 'janken-explanation 0.35s ease both' }}
            >
              {pickResult.result !== 'draw'
                ? getRelationshipText(
                    pickResult.result === 'win' ? pickResult.playerHand : pickResult.cpuHand,
                    pickResult.result === 'win' ? pickResult.cpuHand    : pickResult.playerHand,
                  )
                : 'おなじ手！'}
            </p>
          )}
        </div>
      )}

      {/* ── REVEAL phase ── */}
      {phase === 'reveal' && pickResult && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-4 animate-[fade-in_0.25s_ease_both]">

          {/* Both hands with win/lose glow */}
          <div className="flex items-end justify-center gap-8">
            {/* CPU hand */}
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-xs font-black text-gray-400">CPU</p>
              <div
                className="w-[108px] h-[108px] rounded-3xl flex items-center justify-center shadow-xl"
                style={{
                  background: HAND_BG[pickResult.cpuHand],
                  border: '3px solid rgba(255,255,255,0.3)',
                  animation: (() => {
                    if (pickResult.result === 'lose') return 'janken-winner-bounce 0.8s ease-in-out 3';
                    if (pickResult.result === 'win')  return 'janken-loser-fade 0.5s ease forwards';
                    return 'janken-draw 1.2s ease-in-out infinite';
                  })(),
                }}
              >
                {(() => { const C = HAND_COMPONENT[pickResult.cpuHand]; return <C size={80} flip />; })()}
              </div>
              <p className="text-sm font-black text-gray-600">{HAND_LABEL[pickResult.cpuHand]}</p>
            </div>

            <div className="text-3xl font-black text-gray-200 pb-8">VS</div>

            {/* Player hand */}
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-xs font-black text-gray-400">{playerName}</p>
              <div
                className="w-[108px] h-[108px] rounded-3xl flex items-center justify-center shadow-xl"
                style={{
                  background: HAND_BG[pickResult.playerHand],
                  border: '3px solid rgba(255,255,255,0.3)',
                  animation: (() => {
                    if (pickResult.result === 'win')  return 'janken-winner-bounce 0.8s ease-in-out 3';
                    if (pickResult.result === 'lose') return 'janken-loser-fade 0.5s ease forwards';
                    return 'janken-draw 1.2s ease-in-out infinite';
                  })(),
                }}
              >
                {(() => { const C = HAND_COMPONENT[pickResult.playerHand]; return <C size={80} />; })()}
              </div>
              <p className="text-sm font-black text-gray-600">{HAND_LABEL[pickResult.playerHand]}</p>
            </div>
          </div>

          {/* Relationship text */}
          {pickResult.result !== 'draw' && (
            <p
              className="text-base font-black text-gray-600 text-center"
              style={{ animation: 'janken-explanation 0.4s ease 0.2s both', opacity: 0 }}
            >
              {getRelationshipText(
                pickResult.result === 'win' ? pickResult.playerHand : pickResult.cpuHand,
                pickResult.result === 'win' ? pickResult.cpuHand    : pickResult.playerHand,
              )}
            </p>
          )}

          {/* Result banner */}
          {(() => {
            const cfg = RESULT_CFG[pickResult.result];
            return (
              <div
                className="w-full rounded-3xl px-6 py-3.5 text-center shadow-lg"
                style={{
                  background: cfg.bg,
                  animation: 'janken-banner 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
                }}
              >
                <p className="text-2xl font-black text-white drop-shadow">
                  {cfg.emoji} {cfg.label}
                </p>
              </div>
            );
          })()}

          <button
            onClick={handleAgain}
            className="w-full py-4 rounded-3xl text-xl font-black text-white shadow-lg active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              animation: 'fade-in 0.3s ease 0.5s both',
              opacity: 0,
            }}
          >
            もう一度！✊
          </button>
        </div>
      )}
    </div>
  );
}
