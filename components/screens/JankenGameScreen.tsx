'use client';

import { useState, useEffect, useCallback, useRef, type FC } from 'react';
import { getRandomHand, judgeJanken, getRelationshipText, HAND_LABEL } from '@/lib/janken';
import type { JankenHand, JankenResult } from '@/lib/janken';
import {
  playJankenJan, playJankenKen, playJankenPonFinal,
  playJankenWin, playJankenLose, playJankenDraw,
} from '@/lib/sounds';
import { saveRankEntry } from '@/lib/ranking';

interface Props {
  playerName: string;
  onHome: () => void;
  /** すごろくモード: 1回勝負の結果を親に返す */
  onSugorokuComplete?: (result: JankenResult) => void;
}

type Phase = 'ready' | 'countdown' | 'pick' | 'battle' | 'reveal';
type BattleStep = 'enter' | 'shake' | 'transform' | 'done';

interface PickResult {
  playerHand: JankenHand;
  cpuHand: JankenHand;
  result: JankenResult;
}

// ── Simple geometric hand SVGs (countdown / pick / battle pre-reveal) ──────

function GuuSimple({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ display: 'block' }}>
      {/* thumb on left */}
      <rect x="5" y="36" width="15" height="20" rx="7.5" fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />
      {/* fist body — dominant shape */}
      <rect x="12" y="26" width="58" height="40" rx="16" fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />
      {/* 4 small knuckle bumps — short & wide = clearly closed fingers */}
      <rect x="14" y="20" width="13" height="11" rx="5.5" fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />
      <rect x="29" y="16" width="13" height="13" rx="5.5" fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />
      <rect x="44" y="18" width="13" height="12" rx="5.5" fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />
      <rect x="57" y="22" width="11" height="10" rx="5"   fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />
      {/* knuckle highlight row */}
      <rect x="14" y="26" width="13" height="9" rx="4.5" fill="#FCD34D" />
      <rect x="29" y="26" width="13" height="9" rx="4.5" fill="#FCD34D" />
      <rect x="44" y="26" width="13" height="9" rx="4.5" fill="#FCD34D" />
      <rect x="57" y="26" width="11" height="9" rx="4.5" fill="#FCD34D" />
      {/* horizontal crease = fingers folded in */}
      <line x1="14" y1="48" x2="68" y2="48" stroke="rgba(0,0,0,0.10)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChokiSimple({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ display: 'block' }}>
      {/* palm + curled base */}
      <rect x="16" y="46" width="50" height="28" rx="13" fill="#FEF3C7" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
      {/* index finger */}
      <rect x="22" y="8"  width="14" height="44" rx="7" fill="#FEF3C7" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
      {/* middle finger */}
      <rect x="40" y="6"  width="14" height="44" rx="7" fill="#FEF3C7" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
      {/* thumb */}
      <rect x="8"  y="46" width="14" height="14" rx="7" fill="#FEF3C7" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
      {/* knuckle separator */}
      <rect x="22" y="44" width="32" height="6"  rx="3" fill="#FCD34D" />
    </svg>
  );
}

function PaaSimple({ size = 80 }: { size?: number }) {
  // Fingers fan outward — each rotated around its base at the palm top (y≈50)
  // rotate(deg baseCx baseCy)
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ display: 'block' }}>
      {/* pinky — rotated left */}
      <rect x="9"  y="8" width="13" height="42" rx="6.5" fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" transform="rotate(-16 15.5 50)" />
      {/* ring */}
      <rect x="23" y="5" width="13" height="45" rx="6.5" fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" transform="rotate(-6 29.5 50)" />
      {/* middle — straight up */}
      <rect x="33" y="3" width="13" height="47" rx="6.5" fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />
      {/* index */}
      <rect x="43" y="5" width="13" height="45" rx="6.5" fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" transform="rotate(6 49.5 50)" />
      {/* thumb — shorter, rotated right */}
      <rect x="57" y="28" width="13" height="28" rx="6.5" fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" transform="rotate(22 63.5 56)" />
      {/* palm — drawn last to cover finger bases */}
      <ellipse cx="40" cy="62" rx="28" ry="16" fill="#FEF3C7" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />
    </svg>
  );
}

function NeutralSimple({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ display: 'block' }}>
      <rect x="16" y="16" width="11" height="18" rx="5.5" fill="#94a3b8" />
      <rect x="30" y="12" width="11" height="20" rx="5.5" fill="#94a3b8" />
      <rect x="44" y="14" width="11" height="19" rx="5.5" fill="#94a3b8" />
      <rect x="57" y="18" width="9"  height="16" rx="4.5" fill="#94a3b8" />
      <rect x="12" y="28" width="56" height="36" rx="14" fill="#94a3b8" />
      <rect x="16" y="28" width="11" height="8"  rx="4"   fill="#64748b" />
      <rect x="30" y="28" width="11" height="8"  rx="4"   fill="#64748b" />
      <rect x="44" y="28" width="11" height="8"  rx="4"   fill="#64748b" />
      <rect x="57" y="28" width="9"  height="8"  rx="4"   fill="#64748b" />
      <rect x="6"  y="34" width="14" height="16" rx="7"   fill="#94a3b8" />
      <text x="40" y="54" textAnchor="middle" fontSize="22" fontWeight="900" fill="rgba(255,255,255,0.75)">？</text>
    </svg>
  );
}

// ── Object icons (shown at transform / reveal phase) ───────────────────────

function RockObj({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ display: 'block' }}>
      {/* shadow */}
      <ellipse cx="40" cy="75" rx="25" ry="4" fill="rgba(0,0,0,0.13)" />
      {/* jagged rock silhouette */}
      <path d="M40 12 L50 17 L60 14 L66 24 L70 36 L65 48 L58 57 L48 63 L36 64 L24 60 L16 50 L14 38 L18 26 L26 17 Z" fill="#78716c" />
      {/* mid-tone face */}
      <path d="M40 16 L49 21 L58 19 L63 28 L66 38 L62 48 L55 55 L44 59 L34 58 L24 53 L20 42 L22 32 L30 22 Z" fill="#a8a29e" />
      {/* highlight */}
      <ellipse cx="34" cy="30" rx="9" ry="6" fill="rgba(255,255,255,0.30)" />
      {/* cracks for texture */}
      <line x1="48" y1="22" x2="55" y2="38" stroke="rgba(0,0,0,0.20)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="36" x2="25" y2="52" stroke="rgba(0,0,0,0.20)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="50" y1="44" x2="42" y2="56" stroke="rgba(0,0,0,0.13)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function ScissorsObj({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ display: 'block' }}>
      {/* handles */}
      <ellipse cx="20" cy="62" rx="12" ry="13" fill="none" stroke="white" strokeWidth="5" />
      <ellipse cx="60" cy="62" rx="12" ry="13" fill="none" stroke="white" strokeWidth="5" />
      {/* blades */}
      <line x1="28" y1="54" x2="54" y2="20" stroke="#d1d5db" strokeWidth="8" strokeLinecap="round" />
      <line x1="52" y1="54" x2="26" y2="20" stroke="#d1d5db" strokeWidth="8" strokeLinecap="round" />
      <line x1="28" y1="54" x2="54" y2="20" stroke="#9ca3af" strokeWidth="5" strokeLinecap="round" />
      <line x1="52" y1="54" x2="26" y2="20" stroke="#9ca3af" strokeWidth="5" strokeLinecap="round" />
      {/* pivot */}
      <circle cx="40" cy="38" r="5.5" fill="#6b7280" />
      <circle cx="40" cy="38" r="2.5" fill="#374151" />
    </svg>
  );
}

function PaperObj({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" style={{ display: 'block' }}>
      {/* shadow */}
      <rect x="17" y="13" width="50" height="62" rx="3" fill="rgba(0,0,0,0.07)" />
      {/* sheet with folded corner */}
      <path d="M14 10 H60 L66 16 V72 H14 Z" fill="#fef9c3" />
      <path d="M60 10 L66 16 H60 Z" fill="#fde68a" />
      <line x1="60" y1="10" x2="60" y2="16" stroke="#f59e0b" strokeWidth="1.5" />
      <line x1="60" y1="16" x2="66" y2="16" stroke="#f59e0b" strokeWidth="1.5" />
      {/* ruled lines */}
      <line x1="20" y1="30" x2="60" y2="30" stroke="#d1d5db" strokeWidth="2" />
      <line x1="20" y1="40" x2="60" y2="40" stroke="#d1d5db" strokeWidth="2" />
      <line x1="20" y1="50" x2="60" y2="50" stroke="#d1d5db" strokeWidth="2" />
      <line x1="20" y1="60" x2="50" y2="60" stroke="#d1d5db" strokeWidth="2" />
      {/* border */}
      <path d="M14 10 H60 L66 16 V72 H14 Z" fill="none" stroke="#d1d5db" strokeWidth="1.5" />
    </svg>
  );
}

// ── Matchup illustrations ──────────────────────────────────────────────────

/** 紙が石を包む */
function IllustrationPaperWrapsRock() {
  return (
    <svg width={110} height={82} viewBox="0 0 160 120" fill="none" style={{ display: 'block' }}>
      {/* rock */}
      <ellipse cx="80" cy="78" rx="30" ry="24" fill="#a8a29e" />
      <ellipse cx="76" cy="70" rx="14" ry="10" fill="rgba(255,255,255,0.28)" />
      {/* paper wrapping over the rock */}
      <path d="M42 56 Q58 28 80 26 Q102 28 118 56 L118 84 Q102 100 80 100 Q58 100 42 84 Z"
        fill="#fef9c3" opacity="0.88" stroke="#f59e0b" strokeWidth="2" />
      {/* side folds */}
      <line x1="42" y1="56" x2="38" y2="84" stroke="#fbbf24" strokeWidth="1.5" />
      <line x1="118" y1="56" x2="122" y2="84" stroke="#fbbf24" strokeWidth="1.5" />
    </svg>
  );
}

/** 石がはさみを壊す */
function IllustrationRockCrushesScissors() {
  return (
    <svg width={110} height={82} viewBox="0 0 160 120" fill="none" style={{ display: 'block' }}>
      {/* scissors (tilted / broken) at bottom */}
      <g transform="rotate(20 80 96)">
        <ellipse cx="62" cy="108" rx="10" ry="11" fill="none" stroke="#ef4444" strokeWidth="4" />
        <ellipse cx="98" cy="108" rx="10" ry="11" fill="none" stroke="#ef4444" strokeWidth="4" />
        <line x1="69" y1="100" x2="90" y2="72" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
        <line x1="91" y1="100" x2="70" y2="72" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
        <circle cx="80" cy="86" r="5" fill="#6b7280" />
      </g>
      {/* rock falling */}
      <ellipse cx="80" cy="36" rx="26" ry="22" fill="#78716c" />
      <ellipse cx="75" cy="28" rx="11" ry="8"  fill="rgba(255,255,255,0.28)" />
      {/* motion lines */}
      <line x1="80" y1="58" x2="80" y2="66" stroke="#78716c" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="72" y1="60" x2="70" y2="68" stroke="#78716c" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="88" y1="60" x2="90" y2="68" stroke="#78716c" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** はさみが紙を切る */
function IllustrationScissorsCutPaper() {
  return (
    <svg width={110} height={82} viewBox="0 0 160 120" fill="none" style={{ display: 'block' }}>
      {/* left paper half */}
      <rect x="14"  y="24" width="52" height="72" rx="3" fill="#fef9c3" stroke="#d1d5db" strokeWidth="1.5" />
      {/* right paper half */}
      <rect x="94"  y="24" width="52" height="72" rx="3" fill="#fef9c3" stroke="#d1d5db" strokeWidth="1.5" />
      {/* dashed cut line */}
      <line x1="66" y1="60" x2="94" y2="60" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5 3" />
      {/* scissors blades */}
      <line x1="46" y1="46" x2="74" y2="60" stroke="#9ca3af" strokeWidth="7" strokeLinecap="round" />
      <line x1="46" y1="74" x2="74" y2="60" stroke="#9ca3af" strokeWidth="7" strokeLinecap="round" />
      {/* handles */}
      <ellipse cx="38" cy="42" rx="9" ry="10" fill="none" stroke="#ef4444" strokeWidth="4" />
      <ellipse cx="38" cy="78" rx="9" ry="10" fill="none" stroke="#ef4444" strokeWidth="4" />
      <circle  cx="48" cy="60" r="4.5" fill="#6b7280" />
    </svg>
  );
}

// ── Result faces ──────────────────────────────────────────────────────────

function HappyFace({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={{ display: 'block' }}>
      <circle cx="60" cy="60" r="54" fill="#fbbf24" stroke="#f59e0b" strokeWidth="3" />
      <ellipse cx="42" cy="38" rx="14" ry="9" fill="rgba(255,255,255,0.35)" />
      {/* happy squint eyes */}
      <path d="M34 50 Q42 42 50 50" fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 50 Q78 42 86 50" fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
      {/* big smile */}
      <path d="M30 72 Q60 96 90 72" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
      {/* rosy cheeks */}
      <ellipse cx="26" cy="74" rx="11" ry="7" fill="rgba(249,115,22,0.28)" />
      <ellipse cx="94" cy="74" rx="11" ry="7" fill="rgba(249,115,22,0.28)" />
    </svg>
  );
}

function SadFace({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={{ display: 'block' }}>
      <circle cx="60" cy="60" r="54" fill="#93c5fd" stroke="#60a5fa" strokeWidth="3" />
      <ellipse cx="42" cy="38" rx="14" ry="9" fill="rgba(255,255,255,0.35)" />
      {/* droopy eyebrows */}
      <path d="M34 40 Q42 46 50 40" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <path d="M70 40 Q78 46 86 40" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      {/* sad eyes */}
      <circle cx="42" cy="54" r="6" fill="#1e293b" />
      <circle cx="78" cy="54" r="6" fill="#1e293b" />
      {/* sad mouth - downward arc */}
      <path d="M34 80 Q60 65 86 80" fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
      {/* teardrops */}
      <ellipse cx="40" cy="68" rx="4" ry="6" fill="rgba(59,130,246,0.65)" />
      <ellipse cx="80" cy="68" rx="4" ry="6" fill="rgba(59,130,246,0.65)" />
    </svg>
  );
}

// ── Config / style maps ────────────────────────────────────────────────────

const HAND_BG: Record<JankenHand, string> = {
  guu:   'linear-gradient(145deg, #a1a1aa 0%, #52525b 100%)',
  choki: 'linear-gradient(145deg, #f87171 0%, #b91c1c 100%)',
  paa:   'linear-gradient(145deg, #fde68a 0%, #b45309 100%)',
};

const SIMPLE_HAND: Record<JankenHand, FC<{ size?: number }>> = {
  guu:   GuuSimple,
  choki: ChokiSimple,
  paa:   PaaSimple,
};

const OBJECT_COMP: Record<JankenHand, FC<{ size?: number }>> = {
  guu:   RockObj,
  choki: ScissorsObj,
  paa:   PaperObj,
};

const RESULT_CFG: Record<JankenResult, { label: string; emoji: string; bg: string }> = {
  win:  { label: 'やった！かった！', emoji: '🎉', bg: 'linear-gradient(135deg, #34d399 0%, #059669 100%)' },
  lose: { label: 'おしい！まけた！', emoji: '💪', bg: 'linear-gradient(135deg, #fb923c 0%, #c2410c 100%)' },
  draw: { label: 'あいこ！',         emoji: '🤝', bg: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)' },
};

// ── HandCard: mystery hand → object icon at battleStep='transform' ─────────

function HandCard({
  hand,
  label,
  battleStep,
}: {
  hand: JankenHand;
  label: string;
  battleStep: BattleStep;
}) {
  const revealed = battleStep === 'transform' || battleStep === 'done';

  const cardAnim = (() => {
    if (battleStep === 'enter')     return 'janken-object-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both';
    if (battleStep === 'shake')     return 'janken-battle-shake 0.6s ease-in-out 3';
    if (battleStep === 'transform') return 'janken-hand-transform 0.55s cubic-bezier(0.34,1.56,0.64,1) both';
    return undefined;
  })();

  const ObjComp = OBJECT_COMP[hand];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-xs font-black text-gray-400 tracking-wide">{label}</p>
      <div
        className="w-[108px] h-[108px] rounded-3xl flex items-center justify-center shadow-xl"
        style={{
          background: revealed
            ? HAND_BG[hand]
            : 'linear-gradient(145deg, #e2e8f0 0%, #94a3b8 100%)',
          border: '3px solid rgba(255,255,255,0.3)',
          animation: cardAnim,
        }}
      >
        {revealed
          ? <ObjComp size={76} />
          : <NeutralSimple size={76} />
        }
      </div>
      {revealed && (
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

// ── Main Screen ────────────────────────────────────────────────────────────

export default function JankenGameScreen({ playerName, onHome, onSugorokuComplete }: Props) {
  const [phase, setPhase]           = useState<Phase>('ready');
  const [beat, setBeat]             = useState<0 | 1 | 2 | 3>(0);
  const [pickResult, setPickResult] = useState<PickResult | null>(null);
  const [battleStep, setBattleStep] = useState<BattleStep>('enter');
  const [score, setScore]           = useState({ win: 0, lose: 0, draw: 0 });
  const [showFlash, setShowFlash]   = useState(false);

  // Countdown beats
  useEffect(() => {
    if (phase !== 'countdown') return;
    const t1 = setTimeout(() => { setBeat(1); playJankenJan(); },       80);
    const t2 = setTimeout(() => { setBeat(2); playJankenKen(); },      480);
    const t3 = setTimeout(() => { setBeat(3); playJankenPonFinal(); }, 880);
    const t4 = setTimeout(() => setPhase('pick'),                      1050);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [phase]);

  // Battle animation sequence
  useEffect(() => {
    if (phase !== 'battle' || !pickResult) return;
    setBattleStep('enter');
    const t1 = setTimeout(() => setBattleStep('shake'),     400);
    const t2 = setTimeout(() => setBattleStep('transform'), 2200);
    const t3 = setTimeout(() => setBattleStep('done'),      2800);
    const t4 = setTimeout(() => {
      if (pickResult.result === 'win')       playJankenWin();
      else if (pickResult.result === 'lose') playJankenLose();
      else                                   playJankenDraw();
      setPhase('reveal');
      setShowFlash(true);
    }, 3000);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [phase, pickResult]);

  const commitPick = useCallback((hand: JankenHand) => {
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

  // Auto-clear flash after animation completes
  useEffect(() => {
    if (!showFlash) return;
    const t = setTimeout(() => setShowFlash(false), 2600);
    return () => clearTimeout(t);
  }, [showFlash]);

  // すごろくモード: revealフェーズに入って3.5秒後に結果を親へ返す
  useEffect(() => {
    if (phase !== 'reveal' || !onSugorokuComplete || !pickResult) return;
    const t = setTimeout(() => onSugorokuComplete(pickResult.result), 3500);
    return () => clearTimeout(t);
  }, [phase, onSugorokuComplete, pickResult]);

  const handleAgain = useCallback(() => {
    setBeat(0);
    setPickResult(null);
    setBattleStep('enter');
    setShowFlash(false);
    setPhase('ready');
  }, []);

  // ── Reveal phase helpers ───────────────────────────────────────────────────

  const revealMatchup = (() => {
    if (!pickResult || pickResult.result === 'draw') return null;
    const w = pickResult.result === 'win' ? pickResult.playerHand : pickResult.cpuHand;
    const l = pickResult.result === 'win' ? pickResult.cpuHand    : pickResult.playerHand;
    if (w === 'paa'   && l === 'guu')   return { Illus: IllustrationPaperWrapsRock,      w, l };
    if (w === 'guu'   && l === 'choki') return { Illus: IllustrationRockCrushesScissors, w, l };
    if (w === 'choki' && l === 'paa')   return { Illus: IllustrationScissorsCutPaper,    w, l };
    return null;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4 py-5 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="w-full max-w-sm px-4 flex items-center justify-between">
        <button
          onClick={() => {
            saveRankEntry({ playerName, score: score.win, mode: 'janken' });
            onHome();
          }}
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

      {/* ── READY ── */}
      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4 animate-[fade-in_0.25s_ease_both]">
          <div className="flex items-end justify-center gap-10">
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-black text-gray-400">{playerName}</p>
              <div
                className="w-[90px] h-[90px] rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(145deg, #e2e8f0 0%, #94a3b8 100%)' }}
              >
                <NeutralSimple size={72} />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-200 pb-4">VS</div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-black text-gray-400">CPU</p>
              <div
                className="w-[90px] h-[90px] rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(145deg, #e2e8f0 0%, #94a3b8 100%)' }}
              >
                <NeutralSimple size={72} />
              </div>
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

      {/* ── COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4 animate-[fade-in_0.2s_ease_both]">
          <div className="flex items-end justify-center gap-10">
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-black text-gray-400">{playerName}</p>
              <div
                className="w-[90px] h-[90px] rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #e2e8f0 0%, #94a3b8 100%)',
                  animation: beat >= 1 ? 'janken-battle-shake 0.42s ease-in-out infinite' : undefined,
                }}
              >
                <NeutralSimple size={72} />
              </div>
            </div>
            <div className="text-4xl font-black text-gray-200 pb-4">VS</div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-black text-gray-400">CPU</p>
              <div
                className="w-[90px] h-[90px] rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #e2e8f0 0%, #94a3b8 100%)',
                  animation: beat >= 1 ? 'janken-battle-shake 0.42s ease-in-out infinite' : undefined,
                }}
              >
                <NeutralSimple size={72} />
              </div>
            </div>
          </div>

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

      {/* ── PICK ── */}
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
              const HandComp = SIMPLE_HAND[hand];
              const ObjComp  = OBJECT_COMP[hand];
              return (
                <button
                  key={hand}
                  onClick={() => commitPick(hand)}
                  className="flex flex-col items-center gap-1.5 rounded-3xl py-3 px-1 shadow-lg active:scale-90 transition-all relative overflow-hidden"
                  style={{
                    background: HAND_BG[hand],
                    border: '3px solid rgba(255,255,255,0.35)',
                    animation: `janken-pick-appear 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.06}s both`,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-3xl"
                    style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.20) 0%,transparent 55%)' }}
                  />
                  <HandComp size={54} />
                  <div style={{ width: '80%', height: 1, background: 'rgba(255,255,255,0.25)' }} />
                  <ObjComp size={32} />
                  <span className="text-xs font-black text-white drop-shadow relative z-10">
                    {HAND_LABEL[hand]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BATTLE ── */}
      {phase === 'battle' && pickResult && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4 animate-[fade-in_0.2s_ease_both]">
          <div className="flex items-end justify-center gap-8">
            <HandCard hand={pickResult.playerHand} label={playerName} battleStep={battleStep} />
            <div className="text-3xl font-black text-gray-200 pb-8">VS</div>
            <HandCard hand={pickResult.cpuHand}    label="CPU"       battleStep={battleStep} />
          </div>
          {battleStep === 'shake' && (
            <p className="text-xl font-black text-gray-500 animate-pulse">…どっちが かつ？！</p>
          )}
        </div>
      )}

      {/* ── REVEAL ── */}
      {phase === 'reveal' && pickResult && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-4 animate-[fade-in_0.25s_ease_both]">

          {/* Both object icons with win/lose/draw animations */}
          <div className="flex items-end justify-center gap-8">
            {/* Player */}
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
                {(() => { const C = OBJECT_COMP[pickResult.playerHand]; return <C size={80} />; })()}
              </div>
              <p className="text-sm font-black text-gray-600">{HAND_LABEL[pickResult.playerHand]}</p>
            </div>

            <div className="text-3xl font-black text-gray-200 pb-8">VS</div>

            {/* CPU */}
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
                {(() => { const C = OBJECT_COMP[pickResult.cpuHand]; return <C size={80} />; })()}
              </div>
              <p className="text-sm font-black text-gray-600">{HAND_LABEL[pickResult.cpuHand]}</p>
            </div>
          </div>

          {/* Matchup illustration + explanation */}
          {revealMatchup && (
            <div
              className="flex flex-col items-center gap-2 px-5 py-3 rounded-2xl w-full"
              style={{
                background: 'white',
                border: '2px solid rgba(0,0,0,0.06)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                animation: 'janken-explanation 0.4s ease 0.3s both',
                opacity: 0,
              }}
            >
              <revealMatchup.Illus />
              <p className="text-base font-black text-gray-600 text-center">
                {getRelationshipText(revealMatchup.w, revealMatchup.l)}
              </p>
            </div>
          )}

          {pickResult.result === 'draw' && (
            <p
              className="text-base font-black text-gray-500 text-center"
              style={{ animation: 'janken-explanation 0.4s ease 0.2s both', opacity: 0 }}
            >
              おなじ手！
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

      {/* ── WIN / LOSE flash overlay ── */}
      {showFlash && pickResult && pickResult.result !== 'draw' && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 pointer-events-none"
          style={{
            background: pickResult.result === 'win'
              ? 'radial-gradient(circle at 50% 40%, rgba(254,240,138,0.97), rgba(74,222,128,0.93))'
              : 'radial-gradient(circle at 50% 40%, rgba(219,234,254,0.97), rgba(147,197,253,0.93))',
            animation: 'janken-result-flash 2.6s ease forwards',
          }}
        >
          {pickResult.result === 'win' ? (
            <>
              <div style={{ animation: 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                <HappyFace size={150} />
              </div>
              <p
                className="text-5xl font-black text-yellow-800 drop-shadow-lg"
                style={{ animation: 'janken-banner 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.2s both', opacity: 0 }}
              >
                やった！！🎉
              </p>
              <div
                className="flex gap-3 text-4xl"
                style={{ animation: 'fade-in 0.4s ease 0.5s both', opacity: 0 }}
              >
                {['✨', '⭐', '🌟', '✨', '⭐'].map((s, i) => (
                  <span key={i} style={{ animation: `janken-star-float 1.4s ease ${0.4 + i * 0.1}s both` }}>{s}</span>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ animation: 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                <SadFace size={150} />
              </div>
              <p
                className="text-4xl font-black text-blue-800 drop-shadow-lg"
                style={{ animation: 'janken-banner 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.2s both', opacity: 0 }}
              >
                おしい！！💪
              </p>
              <p
                className="text-xl font-bold text-blue-600"
                style={{ animation: 'fade-in 0.4s ease 0.5s both', opacity: 0 }}
              >
                またがんばろう！
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
