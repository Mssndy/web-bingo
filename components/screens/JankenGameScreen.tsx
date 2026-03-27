'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRandomHand, judgeJanken, getRelationshipText, HAND_LABEL, HAND_OBJECT } from '@/lib/janken';
import type { JankenHand, JankenResult } from '@/lib/janken';
import { playJankenPon, playJankenWin, playJankenLose, playJankenDraw } from '@/lib/sounds';

interface Props {
  playerName: string;
  onHome: () => void;
}

type Phase = 'select' | 'countdown' | 'reveal';

interface Round {
  playerHand: JankenHand;
  cpuHand: JankenHand;
  result: JankenResult;
  key: number;
}

// ── SVG Object Illustrations ─────────────────────────────────────────────────

function RockIcon({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <ellipse cx="50" cy="86" rx="34" ry="7" fill="rgba(0,0,0,0.12)" />
      <path
        d="M20 63 Q15 45 24 30 Q33 14 50 14 Q70 14 80 30 Q90 47 84 63 Q78 78 62 81 Q44 84 28 77 Z"
        fill="#9E9589"
      />
      <path
        d="M22 60 Q17 44 26 30 Q35 14 52 14 Q72 14 82 30 Q90 46 84 60 Q78 75 62 78 Q44 81 28 74 Z"
        fill="#B8B2AB"
      />
      <ellipse cx="40" cy="40" rx="14" ry="9" fill="rgba(255,255,255,0.30)" transform="rotate(-18 40 40)" />
      <path d="M44 63 Q50 58 57 62" stroke="rgba(0,0,0,0.17)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M35 73 Q42 68 50 71" stroke="rgba(0,0,0,0.12)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ScissorsIcon({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Left handle */}
      <circle cx="24" cy="24" r="17" fill="#FF7070" />
      <circle cx="24" cy="24" r="17" stroke="#CC3333" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="9"  fill="white" />
      {/* Right handle */}
      <circle cx="76" cy="24" r="17" fill="#FF7070" />
      <circle cx="76" cy="24" r="17" stroke="#CC3333" strokeWidth="2.5" />
      <circle cx="76" cy="24" r="9"  fill="white" />
      {/* Left blade */}
      <line x1="30" y1="38" x2="52" y2="86" stroke="#9A9A9A" strokeWidth="9"  strokeLinecap="round" />
      <line x1="30" y1="38" x2="52" y2="86" stroke="#C8C8C8" strokeWidth="5"  strokeLinecap="round" />
      {/* Right blade */}
      <line x1="70" y1="38" x2="48" y2="86" stroke="#9A9A9A" strokeWidth="9"  strokeLinecap="round" />
      <line x1="70" y1="38" x2="48" y2="86" stroke="#D8D8D8" strokeWidth="5"  strokeLinecap="round" />
      {/* Pivot */}
      <circle cx="50" cy="60" r="7" fill="#777" />
      <circle cx="50" cy="60" r="3.5" fill="#AAA" />
    </svg>
  );
}

function PaperIcon({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Shadow */}
      <rect x="23" y="18" width="60" height="70" rx="5" fill="rgba(0,0,0,0.09)" />
      {/* Sheet */}
      <rect x="18" y="13" width="60" height="70" rx="5" fill="#FFFDE7" />
      <rect x="18" y="13" width="60" height="70" rx="5" stroke="#DDD080" strokeWidth="1.5" />
      {/* Folded corner */}
      <path d="M62 13 L78 29 L62 29 Z" fill="#EAD970" />
      <path d="M62 13 L78 29" stroke="#C8B840" strokeWidth="1.5" />
      {/* Writing lines */}
      <line x1="26" y1="44" x2="70" y2="44" stroke="#D8C860" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="56" x2="70" y2="56" stroke="#D8C860" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="68" x2="57" y2="68" stroke="#D8C860" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Record<JankenHand, (props: { size?: number }) => React.ReactElement> = {
  guu:   RockIcon,
  choki: ScissorsIcon,
  paa:   PaperIcon,
};

// ── Style config ─────────────────────────────────────────────────────────────

const HAND_BG: Record<JankenHand, string> = {
  guu:   'linear-gradient(135deg, #a8a29e 0%, #6b7280 100%)',
  choki: 'linear-gradient(135deg, #fc8181 0%, #e53e3e 100%)',
  paa:   'linear-gradient(135deg, #fde68a 0%, #d97706 100%)',
};

const HAND_BORDER: Record<JankenHand, string> = {
  guu:   'rgba(107,114,128,0.7)',
  choki: 'rgba(229,62,62,0.7)',
  paa:   'rgba(217,119,6,0.7)',
};

const RESULT_CONFIG: Record<JankenResult, { label: string; emoji: string; bg: string; border: string }> = {
  win:  { label: 'やった！かった！', emoji: '🎉', bg: 'linear-gradient(135deg, #68d391 0%, #38a169 100%)', border: 'rgba(56,161,105,0.9)' },
  lose: { label: 'おしい！まけた！', emoji: '💪', bg: 'linear-gradient(135deg, #fc8181 0%, #e05c2a 100%)', border: 'rgba(224,92,42,0.9)' },
  draw: { label: 'あいこ！',         emoji: '🤝', bg: 'linear-gradient(135deg, #63b3ed 0%, #3182ce 100%)', border: 'rgba(49,130,206,0.9)' },
};

const COUNTDOWN_TEXTS = ['', 'じゃん...', 'けん...', 'ポン！'];

// ── Component ────────────────────────────────────────────────────────────────

export default function JankenGameScreen({ playerName, onHome }: Props) {
  const [phase, setPhase]               = useState<Phase>('select');
  const [countdownStep, setCountdownStep] = useState(0);
  const [round, setRound]               = useState<Round | null>(null);
  const [roundKey, setRoundKey]         = useState(0);
  const [score, setScore]               = useState({ win: 0, lose: 0, draw: 0 });
  const soundPlayedForKey               = useRef(-1);

  const handleSelect = useCallback((hand: JankenHand) => {
    const cpuHand = getRandomHand();
    const result  = judgeJanken(hand, cpuHand);
    const key     = roundKey + 1;
    setRound({ playerHand: hand, cpuHand, result, key });
    setRoundKey(key);
    setScore(s => ({ ...s, [result]: s[result] + 1 }));
    setPhase('countdown');
    setCountdownStep(0);
    playJankenPon();
  }, [roundKey]);

  // Countdown visual sequence (synced to the じゃん・けん・ポン audio timings)
  useEffect(() => {
    if (phase !== 'countdown') return;
    const t1 = setTimeout(() => setCountdownStep(1),   50);
    const t2 = setTimeout(() => setCountdownStep(2),  450);
    const t3 = setTimeout(() => setCountdownStep(3),  850);
    const t4 = setTimeout(() => setPhase('reveal'),  1250);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [phase]);

  // Play result sound once per round on reveal
  useEffect(() => {
    if (phase !== 'reveal' || !round) return;
    if (soundPlayedForKey.current === round.key) return;
    soundPlayedForKey.current = round.key;
    if (round.result === 'win')       playJankenWin();
    else if (round.result === 'lose') playJankenLose();
    else                              playJankenDraw();
  }, [phase, round]);

  const handleAgain = useCallback(() => {
    setPhase('select');
    setRound(null);
    setCountdownStep(0);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

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
          <h2 className="text-xl font-black text-gray-700">じゃんけん モード</h2>
          <p className="text-xs text-gray-400 font-bold">{playerName} ✊✂️📄</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Score bar */}
      <div
        className="flex gap-5 text-center px-6 py-2 rounded-2xl"
        style={{ background: 'white', border: '2px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div>
          <p className="text-2xl font-black text-[var(--color-bingo-green)]">{score.win}</p>
          <p className="text-xs text-gray-400 font-bold">かち</p>
        </div>
        <div className="text-gray-200 text-2xl self-center">|</div>
        <div>
          <p className="text-2xl font-black text-[var(--color-bingo-orange)]">{score.lose}</p>
          <p className="text-xs text-gray-400 font-bold">まけ</p>
        </div>
        <div className="text-gray-200 text-2xl self-center">|</div>
        <div>
          <p className="text-2xl font-black text-[var(--color-bingo-blue)]">{score.draw}</p>
          <p className="text-xs text-gray-400 font-bold">あいこ</p>
        </div>
      </div>

      {/* ── Select phase ── */}
      {phase === 'select' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-4 animate-[fade-in_0.25s_ease_both]">
          {/* CPU mystery card */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs font-bold text-gray-400">CPU</p>
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-md"
              style={{
                background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                border: '3px solid rgba(148,163,184,0.5)',
              }}
            >
              <span className="text-5xl" style={{ filter: 'grayscale(1) opacity(0.5)' }}>？</span>
            </div>
          </div>

          <p className="text-lg font-black text-gray-600">てを えらんでね！</p>

          {/* Hand selection buttons */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {(['guu', 'choki', 'paa'] as JankenHand[]).map((hand, i) => {
              const Icon = ICONS[hand];
              return (
                <button
                  key={hand}
                  onClick={() => handleSelect(hand)}
                  className="flex flex-col items-center gap-2 rounded-3xl py-4 px-2 shadow-lg active:scale-90 transition-all relative overflow-hidden"
                  style={{
                    background: HAND_BG[hand],
                    border: `3px solid ${HAND_BORDER[hand]}`,
                    animation: `float-bob-${(i % 3) + 1} ${3.5 + i * 0.4}s ease-in-out infinite ${i * 0.6}s`,
                  }}
                >
                  <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 55%)' }} />
                  <Icon size={64} />
                  <span className="text-sm font-black text-white drop-shadow relative z-10">
                    {HAND_OBJECT[hand]}
                  </span>
                  <span className="text-[11px] text-white/80 font-bold relative z-10">
                    ({HAND_LABEL[hand]})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Strength relationship hint */}
          <div
            className="w-full rounded-2xl px-4 py-3 text-center"
            style={{ background: 'white', border: '2px solid rgba(0,0,0,0.06)' }}
          >
            <p className="text-xs text-gray-500 font-bold leading-relaxed">
              石 → はさみ　はさみ → 紙　紙 → 石
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">（→ は「かつ」いみ）</p>
          </div>
        </div>
      )}

      {/* ── Countdown phase ── */}
      {phase === 'countdown' && round && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-4 animate-[fade-in_0.2s_ease_both]">
          {/* CPU still hidden */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs font-bold text-gray-400">CPU</p>
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-md"
              style={{
                background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                border: '3px solid rgba(148,163,184,0.5)',
              }}
            >
              <span className="text-5xl" style={{ filter: 'grayscale(1) opacity(0.5)' }}>？</span>
            </div>
          </div>

          {/* Countdown text */}
          {countdownStep > 0 && (
            <div
              key={countdownStep}
              className="text-5xl font-black text-gray-700"
              style={{ animation: 'janken-countdown 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              {COUNTDOWN_TEXTS[countdownStep]}
            </div>
          )}

          {/* Player's chosen hand (dim, waiting) */}
          <div className="flex flex-col items-center gap-1 opacity-60">
            <p className="text-xs font-bold text-gray-400">{playerName}</p>
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-md"
              style={{
                background: HAND_BG[round.playerHand],
                border: `3px solid ${HAND_BORDER[round.playerHand]}`,
              }}
            >
              {(() => { const Icon = ICONS[round.playerHand]; return <Icon size={72} />; })()}
            </div>
            <p className="text-sm font-black text-gray-600">{HAND_OBJECT[round.playerHand]}</p>
          </div>
        </div>
      )}

      {/* ── Reveal phase ── */}
      {phase === 'reveal' && round && (
        <div
          key={`reveal-${round.key}`}
          className="flex flex-col items-center gap-4 w-full max-w-sm px-4"
        >
          {/* Hands side by side */}
          <div className="flex items-center justify-center gap-4 w-full">
            {/* CPU hand */}
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-bold text-gray-400">CPU</p>
              <div
                className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-lg"
                style={{
                  background: HAND_BG[round.cpuHand],
                  border: `3px solid ${HAND_BORDER[round.cpuHand]}`,
                  animation: (() => {
                    const pop = 'janken-object-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both';
                    if (round.result === 'lose') return `${pop}, janken-win 0.7s 0.45s ease-out both`;
                    if (round.result === 'win')  return `${pop}, janken-lose 0.6s 0.45s ease-in-out both`;
                    return `${pop}, janken-draw 1.2s 0.45s ease-in-out infinite`;
                  })(),
                }}
              >
                {(() => { const Icon = ICONS[round.cpuHand]; return <Icon size={72} />; })()}
              </div>
              <p className="text-sm font-black text-gray-600">{HAND_OBJECT[round.cpuHand]}</p>
            </div>

            {/* VS */}
            <div className="text-2xl font-black text-gray-300 pb-6">VS</div>

            {/* Player hand */}
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-bold text-gray-400">{playerName}</p>
              <div
                className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-lg"
                style={{
                  background: HAND_BG[round.playerHand],
                  border: `3px solid ${HAND_BORDER[round.playerHand]}`,
                  animation: (() => {
                    const pop = 'janken-object-in 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.1s both';
                    if (round.result === 'win')  return `${pop}, janken-win 0.7s 0.55s ease-out both`;
                    if (round.result === 'lose') return `${pop}, janken-lose 0.6s 0.55s ease-in-out both`;
                    return `${pop}, janken-draw 1.2s 0.55s ease-in-out infinite`;
                  })(),
                }}
              >
                {(() => { const Icon = ICONS[round.playerHand]; return <Icon size={72} />; })()}
              </div>
              <p className="text-sm font-black text-gray-600">{HAND_OBJECT[round.playerHand]}</p>
            </div>
          </div>

          {/* Relationship explanation */}
          {round.result !== 'draw' && (
            <p
              className="text-base font-black text-gray-600 text-center"
              style={{ animation: 'janken-explanation 0.4s ease 0.6s both' }}
            >
              {getRelationshipText(
                round.result === 'win' ? round.playerHand : round.cpuHand,
                round.result === 'win' ? round.cpuHand    : round.playerHand,
              )}
            </p>
          )}
          {round.result === 'draw' && (
            <p
              className="text-base font-black text-gray-500 text-center"
              style={{ animation: 'janken-explanation 0.4s ease 0.5s both' }}
            >
              おなじ手！もう一度だ！
            </p>
          )}

          {/* Result banner */}
          {(() => {
            const cfg = RESULT_CONFIG[round.result];
            return (
              <div
                className="w-full rounded-3xl px-6 py-3 text-center shadow-lg"
                style={{
                  background: cfg.bg,
                  border: `3px solid ${cfg.border}`,
                  animation: 'janken-banner 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.55s both',
                }}
              >
                <p className="text-2xl font-black text-white drop-shadow">
                  {cfg.emoji} {cfg.label}
                </p>
              </div>
            );
          })()}

          {/* Again button */}
          <button
            onClick={handleAgain}
            className="w-full py-4 rounded-3xl text-xl font-black text-white shadow-lg active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              animation: 'fade-in 0.3s ease 0.9s both',
            }}
          >
            もう一度！✊
          </button>
        </div>
      )}
    </div>
  );
}
