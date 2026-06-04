'use client';

import { useState, useEffect, useRef } from 'react';
import { playTick, playRhythmHit, playMiniGameStart, playNewBest, playGoalReached } from '@/lib/sounds';
import { saveRankEntry, isPersonalBest } from '@/lib/ranking';

interface Props {
  playerName: string;
  onHome: () => void;
}

type Phase = 'ready' | 'play' | 'done';
type JudgeType = 'perfect' | 'good' | 'miss';

const INTERVAL = 640;   // 1拍の長さ(ms) ≒ 94BPM
const LEAD     = 4;     // カウントイン拍数（採点しない）
const BEATS    = 24;    // 採点する拍数
const TOTAL    = LEAD + BEATS;
const PERFECT  = 115;   // ±ms
const GOOD     = 215;   // ±ms

const PINK = 'linear-gradient(135deg, #f06595 0%, #845ef7 100%)';

const JUDGE_CFG: Record<JudgeType, { label: string; color: string }> = {
  perfect: { label: 'パーフェクト！', color: '#f06595' },
  good:    { label: 'グッド！',       color: '#845ef7' },
  miss:    { label: 'おしい！',       color: '#adb5bd' },
};

/** タイマー用の現在時刻（モジュールスコープに置きレンダー純粋性ルールを回避） */
function nowMs() { return Date.now(); }

export default function RhythmGameScreen({ playerName, onHome }: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [elapsedState, setElapsedState] = useState(0); // rAF 駆動の経過ms（描画用）
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [counts, setCounts] = useState({ perfect: 0, good: 0, miss: 0 });
  const [lastJudge, setLastJudge] = useState<{ type: JudgeType; id: number } | null>(null);
  const [isBest, setIsBest] = useState(false);

  const startRef    = useRef(0);
  const rafRef      = useRef<number | null>(null);
  const judgedRef   = useRef<Set<number>>(new Set());
  const lastTickRef = useRef(-1);
  const comboRef    = useRef(0);
  const maxComboRef = useRef(0);
  const scoreRef    = useRef(0);
  const statsRef    = useRef({ perfect: 0, good: 0, miss: 0 });

  function stopRaf() {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }
  useEffect(() => () => stopRaf(), []);

  function handleStart() {
    stopRaf();
    judgedRef.current = new Set();
    lastTickRef.current = -1;
    comboRef.current = 0;
    maxComboRef.current = 0;
    scoreRef.current = 0;
    statsRef.current = { perfect: 0, good: 0, miss: 0 };
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setElapsedState(0);
    setCounts({ perfect: 0, good: 0, miss: 0 });
    setLastJudge(null);
    setPhase('play');
    playMiniGameStart();
    startRef.current = nowMs();
    rafRef.current = requestAnimationFrame(frameLoop);
  }

  function frameLoop() {
    const elapsed = nowMs() - startRef.current;
    const beat = Math.floor(elapsed / INTERVAL);

    // メトロノーム
    if (beat > lastTickRef.current && beat < TOTAL) {
      lastTickRef.current = beat;
      playTick();
    }

    // 見逃し判定（採点拍が GOOD 窓を過ぎたら miss）
    for (let i = LEAD; i < TOTAL; i++) {
      if (!judgedRef.current.has(i) && elapsed > i * INTERVAL + GOOD) {
        judgedRef.current.add(i);
        comboRef.current = 0;
        statsRef.current.miss += 1;
        setCombo(0);
        setCounts({ ...statsRef.current });
        setLastJudge({ type: 'miss', id: i });
      }
    }

    // 終了
    if (elapsed > (TOTAL - 1) * INTERVAL + GOOD + 250) {
      finish();
      return;
    }

    setElapsedState(elapsed);
    rafRef.current = requestAnimationFrame(frameLoop);
  }

  function finish() {
    stopRaf();
    const final = scoreRef.current;
    const best = final > 0 && isPersonalBest(playerName, 'rhythm', final);
    setIsBest(best);
    if (final > 0) saveRankEntry({ playerName, score: final, mode: 'rhythm' });
    if (best) playNewBest(); else playGoalReached();
    setPhase('done');
  }

  function handleTap() {
    if (phase !== 'play') return;
    const elapsed = nowMs() - startRef.current;
    const idx = Math.round(elapsed / INTERVAL);
    if (idx < LEAD || idx >= TOTAL) return;
    if (judgedRef.current.has(idx)) return;
    const delta = Math.abs(elapsed - idx * INTERVAL);
    if (delta > GOOD) return; // 拍から遠いタップは無視（責めない）

    judgedRef.current.add(idx);
    const perfect = delta <= PERFECT;
    playRhythmHit(perfect);
    comboRef.current += 1;
    maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
    scoreRef.current += (perfect ? 100 : 60) + comboRef.current * 5;
    if (perfect) statsRef.current.perfect += 1; else statsRef.current.good += 1;

    setScore(scoreRef.current);
    setCombo(comboRef.current);
    setMaxCombo(maxComboRef.current);
    setCounts({ ...statsRef.current });
    setLastJudge({ type: perfect ? 'perfect' : 'good', id: idx });
  }

  // ── 描画用の値（play 中のみ）─────────────────────────────────────────────
  const elapsed = phase === 'play' ? elapsedState : 0;
  const beatFloat = elapsed / INTERVAL;
  const phaseInBeat = beatFloat - Math.floor(beatFloat); // 0→1
  const currentBeat = Math.floor(beatFloat);
  // 近づくリング: phase 0(遠い)→1(ターゲット一致)
  const ringScale = 1 + (1 - phaseInBeat) * 1.5;
  const onBeatGlow = phaseInBeat < 0.12 || phaseInBeat > 0.88;
  const counting = currentBeat < LEAD;
  const countNum = LEAD - currentBeat;
  const progress = Math.min(1, Math.max(0, (currentBeat - LEAD + 1) / BEATS));

  return (
    <div className="flex flex-col items-center gap-4 py-5 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="w-full max-w-sm px-4 flex items-center justify-between">
        <button
          onClick={() => { stopRaf(); onHome(); }}
          className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
          aria-label="ホームにもどる"
        >
          🏠
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-700">リズムタップ</h2>
          <p className="text-xs text-gray-400 font-bold">{playerName} 🎵</p>
        </div>
        <div className="w-10" />
      </div>

      {/* ── READY ── */}
      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4 animate-[fade-in_0.25s_ease_both]">
          <div className="w-full rounded-3xl px-6 py-6 text-center shadow-lg" style={{ background: PINK }}>
            <p className="text-5xl mb-2">🎵👆</p>
            <p className="text-lg font-black text-white drop-shadow leading-relaxed">
              わが ぴったり かさなった<br />しゅんかんに タッチ！
            </p>
          </div>
          <button
            onClick={handleStart}
            className="w-full py-5 rounded-3xl text-2xl font-black text-white shadow-xl active:scale-95 transition-all"
            style={{ background: PINK, animation: 'float-bob-1 3s ease-in-out infinite' }}
          >
            🎵 スタート！
          </button>
          <p className="text-xs text-gray-400 font-bold text-center">
            コッ・コッ・コッ…の リズムに のってね。れんぞくで コンボ✨
          </p>
        </div>
      )}

      {/* ── PLAY ── */}
      {phase === 'play' && (
        <div className="flex flex-col items-center gap-3 w-full max-w-sm px-4 select-none">
          {/* Score + combo */}
          <div className="w-full flex items-center justify-between">
            <div className="px-4 py-1.5 rounded-xl text-white text-center" style={{ background: PINK }}>
              <p className="text-2xl font-black leading-none">{score}</p>
              <p className="text-[9px] font-bold">てん</p>
            </div>
            <div className="text-center" style={{ opacity: combo >= 2 ? 1 : 0.3 }}>
              <p className="text-3xl font-black leading-none" style={{ color: '#f06595', animation: combo >= 2 ? 'praise-pop 0.3s ease both' : undefined }} key={combo}>
                {combo}
              </p>
              <p className="text-[10px] font-black text-gray-400">コンボ</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
            <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${progress * 100}%`, background: PINK }} />
          </div>

          {/* Tap zone */}
          <button
            onClick={handleTap}
            className="relative w-full flex items-center justify-center active:scale-[0.98] transition-transform"
            style={{ height: 320 }}
            aria-label="タップ"
          >
            {/* Target ring (fixed) */}
            <div
              className="absolute rounded-full"
              style={{
                width: 150, height: 150,
                border: '5px dashed rgba(132,94,247,0.5)',
                boxShadow: onBeatGlow ? '0 0 24px rgba(240,101,149,0.6)' : undefined,
                transition: 'box-shadow 0.08s ease',
              }}
            />
            {/* Center target */}
            <div
              className="absolute rounded-full flex items-center justify-center"
              style={{
                width: 150, height: 150,
                background: onBeatGlow ? PINK : 'rgba(132,94,247,0.12)',
                transform: `scale(${onBeatGlow ? 1.04 : 1})`,
                transition: 'transform 0.08s ease, background 0.08s ease',
              }}
            >
              <span className="text-2xl font-black" style={{ color: onBeatGlow ? 'white' : '#845ef7' }}>
                {counting ? countNum : 'TAP'}
              </span>
            </div>
            {/* Approaching ring (shrinks onto target) */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 150, height: 150,
                border: '6px solid #f06595',
                transform: `scale(${ringScale})`,
                opacity: Math.min(1, (2.5 - ringScale) * 1.2),
              }}
            />
            {/* Judge popup */}
            {lastJudge && (
              <div
                key={`${lastJudge.type}-${lastJudge.id}`}
                className="absolute text-2xl font-black pointer-events-none"
                style={{ top: 40, color: JUDGE_CFG[lastJudge.type].color, animation: 'praise-pop 0.4s ease both' }}
              >
                {JUDGE_CFG[lastJudge.type].label}
              </div>
            )}
          </button>

          <p className="text-xs text-gray-400 font-bold text-center">
            {counting ? 'もうすぐ スタート…！' : 'ピンクの わが まん中に きたら タッチ！'}
          </p>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-4 animate-[fade-in_0.3s_ease_both]">
          <div className="w-full rounded-3xl px-6 py-7 text-center shadow-xl" style={{ background: PINK }}>
            <p className="text-6xl mb-2" style={{ animation: 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              {isBest ? '🌟' : '🎉'}
            </p>
            <p className="text-2xl font-black text-white drop-shadow">
              {isBest ? 'あたらしい きろく！' : 'ナイス リズム！'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-base font-black text-white/80">⭐ スコア</span>
              <span className="text-4xl font-black text-white drop-shadow">{score}</span>
            </div>
            <p className="text-sm font-bold text-white/80 mt-2">
              さいだいコンボ {maxCombo}
            </p>
          </div>

          {/* Judge breakdown */}
          <div className="w-full flex justify-center gap-3">
            {([['perfect', counts.perfect], ['good', counts.good], ['miss', counts.miss]] as [JudgeType, number][]).map(
              ([t, n]) => (
                <div key={t} className="flex flex-col items-center px-4 py-2 rounded-2xl bg-white shadow-sm" style={{ border: '2px solid rgba(0,0,0,0.05)' }}>
                  <span className="text-xl font-black" style={{ color: JUDGE_CFG[t].color }}>{n}</span>
                  <span className="text-[10px] font-black text-gray-400">{JUDGE_CFG[t].label.replace('！', '')}</span>
                </div>
              ),
            )}
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 rounded-3xl text-xl font-black text-white shadow-lg active:scale-95 transition-all"
            style={{ background: PINK }}
          >
            もう一度！🎵
          </button>
          <button
            onClick={() => { stopRaf(); onHome(); }}
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
