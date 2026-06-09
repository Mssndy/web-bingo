'use client';

import { useState, useEffect, useRef } from 'react';
import {
  pickStartWord,
  buildChoices,
  findNextWord,
  pickCpuGiveUpTarget,
  tailKana,
  headKana,
  type ShiritoriWord,
} from '@/lib/shiritori';
import {
  playCorrect, playWrong, playMiniGameStart,
  playNewBest, playGoalReached, playCardFlip,
} from '@/lib/sounds';
import { speakChar, speakFeedback, cancelSpeech } from '@/lib/speech';
import { saveRankEntry, isPersonalBest } from '@/lib/ranking';

interface Props {
  playerName: string;
  onHome: () => void;
}

type Phase = 'ready' | 'play' | 'gameover';
type Turn = 'player' | 'cpu';
/** ゲームが おわった理由 */
type EndReason = 'cpu-stuck' | 'no-words' | 'quit';

const TEAL = 'linear-gradient(135deg, #38d9a9 0%, #1098ad 100%)';
const CARD_BG = 'linear-gradient(145deg, #ffffff 0%, #e6fcf5 100%)';

/** kana を表示し、末尾の1文字だけ色を付けて強調する */
function KanaWithTail({ kana, size }: { kana: string; size: string }) {
  const head = kana.slice(0, -1);
  const tail = kana.slice(-1);
  return (
    <span className={`font-black tracking-wide ${size}`}>
      <span className="text-gray-700">{head}</span>
      <span style={{ color: '#0ca678' }}>{tail}</span>
    </span>
  );
}

export default function ShiritoriGameScreen({ playerName, onHome }: Props) {
  const [phase, setPhase]   = useState<Phase>('ready');
  const [chain, setChain]   = useState<ShiritoriWord[]>([]);
  const [turn, setTurn]     = useState<Turn>('player');
  const [choices, setChoices] = useState<ShiritoriWord[]>([]);
  const [targetKana, setTargetKana] = useState('');
  const [score, setScore]   = useState(0);
  const [wrongKana, setWrongKana] = useState<string | null>(null);
  const [showHint, setShowHint]   = useState(false);
  const [endReason, setEndReason] = useState<EndReason>('quit');
  const [isBest, setIsBest] = useState(false);

  const usedRef  = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // タイマー内クロージャからも最新スコアを読むためのミラー
  const scoreRef = useRef(0);
  // このゲームで CPU が こうさんする目標数（10〜20）。早く終わりすぎないように。
  const targetRef = useRef(15);

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }
  useEffect(() => () => { clearTimer(); cancelSpeech(); }, []);

  const current = chain[chain.length - 1] ?? null;

  /** プレイヤーに次の3択を出す。続けられなければ no-words で終了。 */
  function offerChoices(fromKana: string) {
    const { options, answer } = buildChoices(fromKana, usedRef.current);
    if (!answer) {
      finish('no-words');
      return;
    }
    setTargetKana(fromKana);
    setChoices(options);
    setShowHint(false);
    setWrongKana(null);
    setTurn('player');
  }

  function finish(reason: EndReason) {
    clearTimer();
    cancelSpeech();
    const finalScore = scoreRef.current;
    setEndReason(reason);
    const best = finalScore > 0 && isPersonalBest(playerName, 'shiritori', finalScore);
    setIsBest(best);
    if (finalScore > 0) saveRankEntry({ playerName, score: finalScore, mode: 'shiritori' });
    if (best) playNewBest(); else playGoalReached();
    setPhase('gameover');
  }

  function handleStart() {
    clearTimer();
    const start = pickStartWord();
    usedRef.current = new Set([start.kana]);
    scoreRef.current = 0;
    targetRef.current = pickCpuGiveUpTarget(); // 10〜20
    setChain([start]);
    setScore(0);
    setPhase('play');
    playMiniGameStart();
    speakChar(start.kana, 'ja-JP');
    offerChoices(tailKana(start));
  }

  function handlePick(word: ShiritoriWord) {
    if (turn !== 'player') return;
    const correct = headKana(word) === targetKana;

    if (!correct) {
      playWrong();
      speakFeedback('wrong');
      setWrongKana(word.kana);
      setShowHint(true); // 正解カードを ひかり で やさしく教える
      setTimeout(() => setWrongKana(null), 500);
      return;
    }

    // 正解 — プレイヤーのことばを つなぐ
    playCorrect();
    speakChar(word.kana, 'ja-JP');
    usedRef.current.add(word.kana);
    scoreRef.current += 1;
    setChain((c) => [...c, word]);
    setScore(scoreRef.current);
    setChoices([]);
    setShowHint(false);
    setTurn('cpu');

    // CPU の番（少し考えてから返す）
    const cpuFrom = tailKana(word);
    clearTimer();
    timerRef.current = setTimeout(() => {
      // 目標数まで つなげたら CPU が こうさん → きみのかち！（長すぎ防止・10〜20で決着）
      if (scoreRef.current >= targetRef.current) {
        finish('cpu-stuck');
        return;
      }
      const cpuWord = findNextWord(cpuFrom, usedRef.current);
      if (!cpuWord) {
        finish('cpu-stuck'); // CPU が続けられない → きみのかち！
        return;
      }
      playCardFlip();
      speakChar(cpuWord.kana, 'ja-JP');
      usedRef.current.add(cpuWord.kana);
      setChain((c) => [...c, cpuWord]);
      // 次は またプレイヤー
      timerRef.current = setTimeout(() => offerChoices(tailKana(cpuWord)), 700);
    }, 1100);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4 py-5 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="w-full max-w-sm px-4 flex items-center justify-between">
        <button
          onClick={() => { clearTimer(); cancelSpeech(); onHome(); }}
          className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
          aria-label="ホームにもどる"
        >
          🏠
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-700">しりとり</h2>
          <p className="text-xs text-gray-400 font-bold">{playerName} 🦒</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Score chip */}
      {phase !== 'ready' && (
        <div
          className="flex items-center gap-2 px-5 py-2 rounded-2xl"
          style={{ background: 'white', border: '2px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <span className="text-xl">🔗</span>
          <p className="text-sm font-black text-gray-400">つないだ ことば</p>
          <p className="text-2xl font-black" style={{ color: '#0ca678' }}>{score}</p>
        </div>
      )}

      {/* ── READY ── */}
      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4 animate-[fade-in_0.25s_ease_both]">
          <div
            className="w-full rounded-3xl px-6 py-6 text-center shadow-lg"
            style={{ background: TEAL }}
          >
            <p className="text-5xl mb-2">🦒➡️🦦</p>
            <p className="text-lg font-black text-white drop-shadow leading-relaxed">
              ことばの さいごの もじから<br />つづく ことばを えらんでね！
            </p>
          </div>

          {/* Example */}
          <div className="flex items-center gap-2 text-base font-black text-gray-500">
            <span className="px-3 py-1.5 rounded-xl bg-white shadow-sm">
              <KanaWithTail kana="きりん" size="text-lg" />
            </span>
            <span className="text-2xl">➡️</span>
            <span className="px-3 py-1.5 rounded-xl bg-white shadow-sm">
              <span className="text-lg font-black" style={{ color: '#0ca678' }}>ん</span>
              <span className="text-lg font-black text-gray-700">…？</span>
            </span>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-5 rounded-3xl text-2xl font-black text-white shadow-xl active:scale-95 transition-all"
            style={{ background: TEAL, animation: 'float-bob-1 3s ease-in-out infinite' }}
          >
            🦒 スタート！
          </button>
          <p className="text-xs text-gray-400 font-bold text-center">
            CPU と かわりばんこ。なんこ つなげられるかな？✨
          </p>
        </div>
      )}

      {/* ── PLAY ── */}
      {phase === 'play' && current && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm px-4">

          {/* Chain history (recent, scrollable) */}
          {chain.length > 1 && (
            <div
              className="w-full flex gap-1.5 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none' }}
            >
              {chain.slice(0, -1).map((w, i) => (
                <div
                  key={`${w.kana}-${i}`}
                  className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl px-2 py-1 bg-white shadow-sm"
                  style={{ border: '1.5px solid rgba(0,0,0,0.05)' }}
                >
                  <span className="text-xl leading-none">{w.emoji}</span>
                  <span className="text-[9px] font-black text-gray-400">{w.kana}</span>
                </div>
              ))}
            </div>
          )}

          {/* Current word */}
          <div
            key={current.kana}
            className="w-full rounded-3xl px-5 py-4 flex items-center gap-4 shadow-lg animate-[bounce-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
            style={{ background: CARD_BG, border: '3px solid rgba(56,217,169,0.4)' }}
          >
            <span className="text-6xl leading-none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>
              {current.emoji}
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-gray-400">
                {chain.length === 1 ? '🌟 おだい' : (chain.length - 1) % 2 === 1 ? '🙋 きみ' : '🤖 CPU'}
              </span>
              <KanaWithTail kana={current.kana} size="text-3xl" />
            </div>
          </div>

          {/* Prompt */}
          <div className="flex items-center gap-2 text-center">
            <span className="text-base font-black text-gray-500">つぎは</span>
            <span
              className="text-3xl font-black px-3 py-1 rounded-2xl text-white shadow"
              style={{ background: TEAL, animation: 'praise-pop 0.4s ease both' }}
            >
              {targetKana || tailKana(current)}
            </span>
            <span className="text-base font-black text-gray-500">から！</span>
          </div>

          {/* Choices or CPU thinking */}
          {turn === 'cpu' ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <span className="text-5xl animate-[wiggle_0.8s_ease-in-out_infinite]">🤖</span>
              <p className="text-base font-black text-gray-400 animate-pulse">CPU が かんがえちゅう…</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 w-full">
              {choices.map((w, i) => {
                const isWrong = wrongKana === w.kana;
                const isHintCorrect = showHint && headKana(w) === targetKana;
                return (
                  <button
                    key={w.kana}
                    onClick={() => handlePick(w)}
                    className="flex flex-col items-center gap-1.5 rounded-3xl py-4 px-1 shadow-lg active:scale-90 transition-all relative overflow-hidden"
                    style={{
                      background: CARD_BG,
                      border: isHintCorrect
                        ? '3px solid #38d9a9'
                        : '3px solid rgba(0,0,0,0.06)',
                      boxShadow: isHintCorrect
                        ? '0 0 0 4px rgba(56,217,169,0.25), 0 4px 12px rgba(0,0,0,0.1)'
                        : undefined,
                      animation: isWrong
                        ? 'janken-battle-shake 0.5s ease-in-out'
                        : `janken-pick-appear 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.06}s both`,
                    }}
                  >
                    <span className="text-4xl leading-none" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))' }}>
                      {w.emoji}
                    </span>
                    <span className="text-xs font-black text-gray-600">{w.kana}</span>
                  </button>
                );
              })}
            </div>
          )}

          {showHint && turn === 'player' && (
            <p className="text-sm font-black text-gray-400 animate-[fade-in_0.3s_ease_both]">
              ヒント… 「{targetKana}」から はじまる カードだよ！💡
            </p>
          )}

          {/* Finish button */}
          {turn === 'player' && (
            <button
              onClick={() => finish('quit')}
              className="mt-1 px-6 py-2.5 rounded-2xl text-sm font-black text-gray-500 active:scale-95 transition-all"
              style={{ background: 'white', border: '2px solid rgba(0,0,0,0.08)' }}
            >
              🏁 ここまでにする
            </button>
          )}
        </div>
      )}

      {/* ── GAME OVER ── */}
      {phase === 'gameover' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-4 animate-[fade-in_0.3s_ease_both]">
          <div
            className="w-full rounded-3xl px-6 py-7 text-center shadow-xl"
            style={{ background: TEAL }}
          >
            <p className="text-6xl mb-2" style={{ animation: 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              {endReason === 'cpu-stuck' ? '🏆' : isBest ? '🌟' : '🎉'}
            </p>
            <p className="text-2xl font-black text-white drop-shadow">
              {endReason === 'cpu-stuck'
                ? 'CPU は つづけられない！\nきみの かち！'
                : isBest
                  ? 'あたらしい きろく！'
                  : 'よく つなげたね！'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-base font-black text-white/80">🔗 つないだ ことば</span>
              <span className="text-4xl font-black text-white drop-shadow">{score}</span>
            </div>
          </div>

          {/* Show the chain the player built */}
          {chain.length > 0 && (
            <div className="w-full flex flex-wrap justify-center gap-1.5">
              {chain.map((w, i) => (
                <div
                  key={`${w.kana}-${i}`}
                  className="flex flex-col items-center rounded-xl px-2 py-1 bg-white shadow-sm"
                  style={{ border: '1.5px solid rgba(0,0,0,0.05)', animationDelay: `${i * 0.03}s` }}
                >
                  <span className="text-2xl leading-none">{w.emoji}</span>
                  <span className="text-[9px] font-black text-gray-400">{w.kana}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleStart}
            className="w-full py-4 rounded-3xl text-xl font-black text-white shadow-lg active:scale-95 transition-all"
            style={{ background: TEAL }}
          >
            もう一度！🦒
          </button>
          <button
            onClick={() => { clearTimer(); cancelSpeech(); onHome(); }}
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
