'use client';

import { useState, useEffect, useRef } from 'react';
import { shuffle } from '@/lib/bingo';
import { playCardFlip, playCorrect, playWrong, playMiniGameStart, playNewBest, playGoalReached, playTrumpLose } from '@/lib/sounds';
import { startBgm, stopBgm } from '@/lib/bgm';
import { saveRankEntry, isPersonalBest } from '@/lib/ranking';
import { CPU_MEM_CHANCE, rollChance, randomPick, type CpuLevel } from '@/lib/memory';

interface Props {
  playerName: string;
  onHome: () => void;
}

type Phase = 'ready' | 'play' | 'done';
type Diff = 'easy' | 'normal' | 'hard' | 'expert';
type Theme = 'emoji' | 'trump';
type Mode = 'solo' | 'vs';
type Turn = 'you' | 'cpu';
type VsResult = 'win' | 'lose' | 'draw';

interface Card {
  /** デッキ内の一意キー */
  key: number;
  /** 同じ絵柄/カードなら同値（マッチ判定用） */
  matchId: string;
  emoji?: string;        // えがらモード
  rank?: string;         // トランプモード
  suit?: string;         // トランプモード
  red?: boolean;         // トランプの赤スート
  matched: boolean;
}

const PURPLE = 'linear-gradient(135deg, #5f3dc4 0%, #9c36b5 100%)';
/** トランプの裏面（クラシックなカードバック） */
const TRUMP_BACK = 'repeating-linear-gradient(45deg, #1c3d8f 0 9px, #2b4fb0 9px 18px)';

/** タイマー用の現在時刻（モジュールスコープに置きレンダー純粋性ルールを回避） */
function nowMs() { return Date.now(); }

/** 子供になじみのある絵文字プール（ペアの素材） */
const EMOJI_POOL = [
  '🐶', '🐱', '🐰', '🐻', '🦊', '🐼', '🐸', '🐵',
  '🦁', '🐯', '🦄', '🐷', '🍎', '🍓', '🍌', '🍇',
  '⚽', '🚗', '⭐', '🌈', '🌸', '🎈', '🎁', '🍪',
];

/** トランプのスート（赤/黒） */
const SUITS = [
  { s: '♠', red: false },
  { s: '♥', red: true },
  { s: '♦', red: true },
  { s: '♣', red: false },
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface DiffConf { pairs: number; cols: number; label: string; sub: string; bob: string; }
const DIFFS: Record<Diff, DiffConf> = {
  easy:   { pairs: 6,  cols: 3, label: '☺ やさしい',  sub: '6ペア',  bob: 'float-bob-1 3s ease-in-out infinite' },
  normal: { pairs: 8,  cols: 4, label: '🔥 ふつう',    sub: '8ペア',  bob: 'float-bob-2 3.2s ease-in-out infinite 0.4s' },
  hard:   { pairs: 10, cols: 4, label: '💪 むずかしい', sub: '10ペア', bob: 'float-bob-3 3.4s ease-in-out infinite 0.8s' },
  expert: { pairs: 12, cols: 4, label: '🌋 たいへん',   sub: '12ペア', bob: 'float-bob-1 3.6s ease-in-out infinite 1.2s' },
};
const DIFF_ORDER: Diff[] = ['easy', 'normal', 'hard', 'expert'];

const BGM_KEY = 'bingo_bgm_on';

function buildDeck(diff: Diff, theme: Theme): Card[] {
  const pairs = DIFFS[diff].pairs;
  if (theme === 'trump') {
    // 全52枚から重複なしで pairs 枚ひく
    const deck = SUITS.flatMap(({ s, red }) => RANKS.map((rank) => ({ rank, suit: s, red })));
    const picked = shuffle(deck).slice(0, pairs);
    const cards = picked.flatMap((c, i) => {
      const matchId = `${c.rank}${c.suit}`;
      return [
        { key: i * 2,     matchId, rank: c.rank, suit: c.suit, red: c.red, matched: false },
        { key: i * 2 + 1, matchId, rank: c.rank, suit: c.suit, red: c.red, matched: false },
      ];
    });
    return shuffle(cards);
  }
  const emojis = shuffle([...EMOJI_POOL]).slice(0, pairs);
  const cards = emojis.flatMap((emoji, i) => [
    { key: i * 2,     matchId: emoji, emoji, matched: false },
    { key: i * 2 + 1, matchId: emoji, emoji, matched: false },
  ]);
  return shuffle(cards);
}

/** トランプの表面（四すみのランク＋中央の大きなスート） */
function TrumpFace({ rank, suit, red }: { rank: string; suit: string; red: boolean }) {
  const color = red ? '#e03131' : '#212529';
  return (
    <div className="absolute inset-0" style={{ color }}>
      <span className="absolute top-1 left-1.5 text-xs font-black leading-none">{rank}</span>
      <span className="absolute top-[1.05rem] left-1.5 text-[10px] leading-none">{suit}</span>
      <span className="absolute inset-0 flex items-center justify-center text-3xl font-black leading-none">{suit}</span>
      <span className="absolute bottom-1 right-1.5 text-xs font-black leading-none rotate-180">{rank}</span>
      <span className="absolute bottom-[1.05rem] right-1.5 text-[10px] leading-none rotate-180">{suit}</span>
    </div>
  );
}

/** ready画面の トグルボタン（選択中は むらさき） */
function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl py-3 text-base font-black shadow-md active:scale-95 transition-all"
      style={{
        background: on ? PURPLE : 'white',
        color: on ? 'white' : '#868e96',
        border: on ? '3px solid #9c36b5' : '3px solid rgba(0,0,0,0.08)',
      }}
    >
      {children}
    </button>
  );
}

export default function MemoryGameScreen({ playerName, onHome }: Props) {
  const [phase, setPhase]   = useState<Phase>('ready');
  const [diff, setDiff]     = useState<Diff>('easy');
  const [theme, setTheme]   = useState<Theme>('emoji');
  const [mode, setMode]     = useState<Mode>('solo');
  const [cpuLevel, setCpuLevel] = useState<CpuLevel>('weak');
  const [cards, setCards]   = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]); // cards 配列上の index（最大2）
  const [moves, setMoves]   = useState(0);
  const [locked, setLocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [points, setPoints] = useState(0);
  const [isBest, setIsBest] = useState(false);
  // 対戦用
  const [turn, setTurn]     = useState<Turn>('you');
  const [youPairs, setYouPairs] = useState(0);
  const [cpuPairs, setCpuPairs] = useState(0);
  const [vsResult, setVsResult] = useState<VsResult>('draw');
  const [bgmOn, setBgmOn]   = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(BGM_KEY) !== '0';
  });

  const startRef = useRef(0);
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // タイマー内クロージャから最新値を読むためのミラー
  const cardsRef = useRef<Card[]>([]);
  const movesRef = useRef(0);
  const youPairsRef = useRef(0);
  const cpuPairsRef = useRef(0);
  // CPU の記憶（cards index → matchId）と このゲームの記憶力
  const cpuMem = useRef<Map<number, string>>(new Map());
  const memChanceRef = useRef(CPU_MEM_CHANCE.weak);
  const cpuPlan = useRef<{ first: number; second: number | null } | null>(null);

  function clearTimers() {
    if (tickRef.current)  { clearInterval(tickRef.current); tickRef.current = null; }
    if (flipTimer.current) { clearTimeout(flipTimer.current); flipTimer.current = null; }
  }
  // アンマウント時にタイマーと BGM を必ず止める
  useEffect(() => () => { clearTimers(); stopBgm(); }, []);

  function goHome() {
    clearTimers();
    stopBgm();
    onHome();
  }

  function toggleBgm() {
    const next = !bgmOn;
    setBgmOn(next);
    localStorage.setItem(BGM_KEY, next ? '1' : '0');
    if (next && phase === 'play') startBgm();
    else stopBgm();
  }

  function setDeck(deck: Card[]) {
    cardsRef.current = deck;
    setCards(deck);
  }

  function handleStart(d: Diff) {
    clearTimers();
    setDiff(d);
    setDeck(buildDeck(d, theme));
    setFlipped([]);
    setMoves(0); movesRef.current = 0;
    setLocked(false);
    setElapsed(0);
    // 対戦リセット
    cpuMem.current = new Map();
    memChanceRef.current = CPU_MEM_CHANCE[cpuLevel];
    cpuPlan.current = null;
    youPairsRef.current = 0; cpuPairsRef.current = 0;
    setYouPairs(0); setCpuPairs(0);
    setTurn('you'); // 子供が さきばん（勝ちやすい）
    setPhase('play');
    playMiniGameStart();
    if (bgmOn) startBgm();
    if (mode === 'solo') {
      startRef.current = nowMs();
      tickRef.current = setInterval(() => {
        setElapsed(Math.floor((nowMs() - startRef.current) / 1000));
      }, 250);
    }
  }

  // ── ひとり: クリアでスコア計算 ───────────────────────────────────────────────
  function finishSolo(finalMoves: number) {
    clearTimers();
    stopBgm();
    const pairs = DIFFS[diff].pairs;
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

  // ── 対戦: 全ペア決着で勝敗判定 ──────────────────────────────────────────────
  function finishVs() {
    clearTimers();
    stopBgm();
    const you = youPairsRef.current;
    const cpu = cpuPairsRef.current;
    const result: VsResult = you > cpu ? 'win' : you < cpu ? 'lose' : 'draw';
    setVsResult(result);
    if (result === 'win') playNewBest();
    else if (result === 'draw') playGoalReached();
    else playTrumpLose(); // 負けでも こわくない やさしい音
    setPhase('done');
  }

  // ── CPU の記憶ヘルパー ──────────────────────────────────────────────────────
  function cpuRemember(idx: number) {
    if (rollChance(memChanceRef.current)) cpuMem.current.set(idx, cardsRef.current[idx].matchId);
  }
  function availIdx(exclude: number[] = []): number[] {
    return cardsRef.current
      .map((_, i) => i)
      .filter((i) => !cardsRef.current[i].matched && !exclude.includes(i));
  }
  /** 記憶から「同じ絵を2枚知っている」組を探す */
  function cpuKnownPair(): [number, number] | null {
    const byId = new Map<string, number[]>();
    cpuMem.current.forEach((mid, idx) => {
      if (cardsRef.current[idx].matched) return;
      const a = byId.get(mid) ?? [];
      a.push(idx);
      byId.set(mid, a);
    });
    for (const arr of byId.values()) if (arr.length >= 2) return [arr[0], arr[1]];
    return null;
  }

  // ── CPU の手番（thinkして2枚めくる） ────────────────────────────────────────
  function startCpuTurn() {
    setTurn('cpu');
    setLocked(true);
    flipTimer.current = setTimeout(cpuPickFirst, 750);
  }

  function cpuPickFirst() {
    const pair = cpuKnownPair();
    let first: number;
    let second: number | null = null;
    if (pair) { first = pair[0]; second = pair[1]; }
    else { first = randomPick(availIdx()); }
    cpuPlan.current = { first, second };
    playCardFlip();
    setFlipped([first]);
    cpuRemember(first);
    flipTimer.current = setTimeout(cpuPickSecond, 800);
  }

  function cpuPickSecond() {
    const plan = cpuPlan.current;
    if (!plan) return;
    const { first } = plan;
    let second = plan.second;
    if (second == null) {
      const mid = cardsRef.current[first].matchId;
      // 記憶の中に そろう相手がいれば それを めくる
      let partner: number | null = null;
      cpuMem.current.forEach((m, idx) => {
        if (partner == null && idx !== first && m === mid && !cardsRef.current[idx].matched) partner = idx;
      });
      second = partner != null ? partner : randomPick(availIdx([first]));
    }
    cpuPlan.current = { first, second };
    playCardFlip();
    setFlipped([first, second]);
    cpuRemember(second);
    flipTimer.current = setTimeout(cpuResolve, 950);
  }

  function cpuResolve() {
    const plan = cpuPlan.current;
    if (!plan || plan.second == null) return;
    const { first, second } = plan;
    const cur = cardsRef.current;
    if (cur[first].matchId === cur[second].matchId) {
      // そろった → CPU 得点、もう一度 CPU の番
      playCorrect();
      const nd = cur.map((c, i) => (i === first || i === second ? { ...c, matched: true } : c));
      setDeck(nd);
      const np = cpuPairsRef.current + 1; cpuPairsRef.current = np; setCpuPairs(np);
      setFlipped([]);
      if (nd.every((c) => c.matched)) { finishVs(); return; }
      flipTimer.current = setTimeout(cpuPickFirst, 650);
    } else {
      // はずれ → やさしく戻して きみの番へ
      playWrong();
      flipTimer.current = setTimeout(() => {
        setFlipped([]);
        setTurn('you');
        setLocked(false);
      }, 650);
    }
  }

  // ── プレイヤーの めくり ─────────────────────────────────────────────────────
  function handleFlip(idx: number) {
    if (locked || phase !== 'play') return;
    if (mode === 'vs' && turn !== 'you') return;
    const card = cardsRef.current[idx];
    if (card.matched || flipped.includes(idx) || flipped.length === 2) return;

    playCardFlip();
    if (mode === 'vs') cpuRemember(idx); // CPU は きみの めくりも 見ている
    const next = [...flipped, idx];
    setFlipped(next);

    if (next.length === 2) {
      const newMoves = movesRef.current + 1; movesRef.current = newMoves; setMoves(newMoves);
      const [a, b] = next;
      if (cardsRef.current[a].matchId === cardsRef.current[b].matchId) {
        // マッチ！
        setLocked(true);
        flipTimer.current = setTimeout(() => {
          playCorrect();
          const nd = cardsRef.current.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c));
          setDeck(nd);
          setFlipped([]);
          setLocked(false);
          if (mode === 'vs') { const np = youPairsRef.current + 1; youPairsRef.current = np; setYouPairs(np); }
          if (nd.every((c) => c.matched)) {
            if (mode === 'vs') finishVs(); else finishSolo(newMoves);
            return;
          }
          // そろったら 同じ人(きみ)の番が つづく
        }, 480);
      } else {
        // はずれ — やさしく裏に戻す
        setLocked(true);
        flipTimer.current = setTimeout(() => {
          playWrong();
          setFlipped([]);
          if (mode === 'vs') startCpuTurn();
          else setLocked(false);
        }, 850);
      }
    }
  }

  const conf = DIFFS[diff];
  const pairs = conf.pairs;
  const matchedPairs = cards.filter((c) => c.matched).length / 2;

  return (
    <div className="flex flex-col items-center gap-4 py-5 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="w-full max-w-sm px-4 flex items-center justify-between">
        <button
          onClick={goHome}
          className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
          aria-label="ホームにもどる"
        >
          🏠
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-700">しんけいすいじゃく</h2>
          <p className="text-xs text-gray-400 font-bold">{playerName} 🧠</p>
        </div>
        <button
          onClick={toggleBgm}
          className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
          aria-label={bgmOn ? 'BGMをけす' : 'BGMをつける'}
        >
          {bgmOn ? '🎵' : '🔇'}
        </button>
      </div>

      {/* ── READY ── */}
      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-4 animate-[fade-in_0.25s_ease_both]">
          <div className="w-full rounded-3xl px-6 py-6 text-center shadow-lg" style={{ background: PURPLE }}>
            <p className="text-5xl mb-2">{mode === 'vs' ? '🙋🆚🤖' : theme === 'trump' ? '🃏🃏' : '🐶🐶'}</p>
            <p className="text-lg font-black text-white drop-shadow leading-relaxed">
              {mode === 'vs'
                ? <>CPU と かわりばんこ！<br />おおく そろえたら かち！</>
                : <>カードを2まい めくって<br />{theme === 'trump' ? 'おなじ カードを' : 'おなじ絵を'} そろえてね！</>}
            </p>
          </div>

          {/* あそびかた えらび */}
          <div className="w-full">
            <p className="text-sm font-black text-gray-400 text-center mb-2">あそびかた 🎮</p>
            <div className="grid grid-cols-2 gap-3">
              <Choice on={mode === 'solo'} onClick={() => setMode('solo')}>🙋 ひとりで</Choice>
              <Choice on={mode === 'vs'} onClick={() => setMode('vs')}>🤖 たいせん</Choice>
            </div>
          </div>

          {/* 対戦のときだけ CPU の つよさ */}
          {mode === 'vs' && (
            <div className="w-full animate-[fade-in_0.25s_ease_both]">
              <p className="text-sm font-black text-gray-400 text-center mb-2">コンピュータの つよさ 🤖</p>
              <div className="grid grid-cols-2 gap-3">
                <Choice on={cpuLevel === 'weak'} onClick={() => setCpuLevel('weak')}>😊 よわい</Choice>
                <Choice on={cpuLevel === 'normal'} onClick={() => setCpuLevel('normal')}>🔥 つよい</Choice>
              </div>
            </div>
          )}

          {/* カードの えがら えらび */}
          <div className="w-full">
            <p className="text-sm font-black text-gray-400 text-center mb-2">カードの えがら 🎴</p>
            <div className="grid grid-cols-2 gap-3">
              <Choice on={theme === 'emoji'} onClick={() => setTheme('emoji')}>🐶 えがら</Choice>
              <Choice on={theme === 'trump'} onClick={() => setTheme('trump')}>🃏 トランプ</Choice>
            </div>
          </div>

          {/* むずかしさ えらび（＝スタート） */}
          <p className="text-sm font-black text-gray-400">どれで あそぶ？</p>
          <div className="grid grid-cols-2 gap-3 w-full">
            {DIFF_ORDER.map((d) => {
              const c = DIFFS[d];
              return (
                <button
                  key={d}
                  onClick={() => handleStart(d)}
                  className="flex flex-col items-center gap-1 rounded-3xl py-5 text-white shadow-xl active:scale-95 transition-all"
                  style={{ background: PURPLE, animation: c.bob }}
                >
                  <span className="text-xl font-black">{c.label}</span>
                  <span className="text-xs font-bold text-white/80">{c.sub}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 font-bold text-center">
            {mode === 'vs'
              ? 'きみが さきばん！よく おぼえて たくさん そろえよう✨'
              : 'すくない めくりで そろえると たかいてん！✨'}
          </p>
        </div>
      )}

      {/* ── PLAY ── */}
      {phase === 'play' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm px-4">
          {/* Stats */}
          {mode === 'solo' ? (
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
          ) : (
            <div className="w-full flex flex-col items-center gap-2">
              <div className="w-full grid grid-cols-2 gap-3">
                {([['you', '🙋 きみ', youPairs], ['cpu', '🤖 CPU', cpuPairs]] as [Turn, string, number][]).map(
                  ([who, label, n]) => {
                    const active = turn === who;
                    return (
                      <div
                        key={who}
                        className="rounded-2xl py-2 text-center transition-all"
                        style={{
                          background: active ? PURPLE : 'white',
                          border: active ? '3px solid #9c36b5' : '3px solid rgba(0,0,0,0.06)',
                          boxShadow: active ? '0 4px 12px rgba(156,54,181,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
                          transform: active ? 'scale(1.03)' : 'none',
                        }}
                      >
                        <p className="text-xs font-black" style={{ color: active ? 'rgba(255,255,255,0.85)' : '#adb5bd' }}>{label}</p>
                        <p className="text-3xl font-black leading-none" style={{ color: active ? 'white' : '#868e96' }}>{n}</p>
                      </div>
                    );
                  },
                )}
              </div>
              <p className="text-sm font-black" style={{ color: turn === 'you' ? '#0ca678' : '#9c36b5' }}>
                {turn === 'you' ? '🙋 きみの ばん！めくってね' : '🤖 CPU が かんがえちゅう…'}
              </p>
            </div>
          )}

          {/* Board */}
          <div
            className="grid gap-2.5 w-full"
            style={{ gridTemplateColumns: `repeat(${conf.cols}, minmax(0, 1fr))` }}
          >
            {cards.map((card, idx) => {
              const isUp = card.matched || flipped.includes(idx);
              const isTrump = theme === 'trump';
              return (
                <button
                  key={card.key}
                  onClick={() => handleFlip(idx)}
                  disabled={isUp || locked}
                  className="aspect-square rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-all relative"
                  style={{
                    background: isUp
                      ? (card.matched ? 'linear-gradient(145deg, #ffffff 0%, #f3e8ff 100%)' : 'white')
                      : (isTrump ? TRUMP_BACK : PURPLE),
                    border: card.matched
                      ? '3px solid #9c36b5'
                      : (isUp ? '3px solid rgba(0,0,0,0.06)' : '3px solid rgba(255,255,255,0.35)'),
                    opacity: card.matched ? 0.72 : 1,
                    animation: isUp ? 'card-flip-in 0.3s ease both' : undefined,
                  }}
                >
                  {isUp ? (
                    isTrump
                      ? <TrumpFace rank={card.rank!} suit={card.suit!} red={!!card.red} />
                      : <span className="text-3xl leading-none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}>{card.emoji}</span>
                  ) : (
                    <span className="text-2xl leading-none" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {isTrump ? '✦' : '❓'}
                    </span>
                  )}
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
            {mode === 'vs' ? (
              <>
                <p className="text-6xl mb-2" style={{ animation: 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                  {vsResult === 'win' ? '🏆' : vsResult === 'draw' ? '🤝' : '🙂'}
                </p>
                <p className="text-2xl font-black text-white drop-shadow whitespace-pre-line">
                  {vsResult === 'win' ? 'きみの かち！\nすごい！'
                    : vsResult === 'draw' ? 'ひきわけ！\nいい しょうぶ！'
                    : 'おしい！\nまた あそぼう！'}
                </p>
                <div className="mt-4 flex items-center justify-center gap-4">
                  <div>
                    <p className="text-xs font-black text-white/70">🙋 きみ</p>
                    <p className="text-4xl font-black text-white drop-shadow">{youPairs}</p>
                  </div>
                  <span className="text-2xl font-black text-white/60">-</span>
                  <div>
                    <p className="text-xs font-black text-white/70">🤖 CPU</p>
                    <p className="text-4xl font-black text-white drop-shadow">{cpuPairs}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
          <button
            onClick={() => handleStart(diff)}
            className="w-full py-4 rounded-3xl text-xl font-black text-white shadow-lg active:scale-95 transition-all"
            style={{ background: PURPLE }}
          >
            もう一度！🃏
          </button>
          <button
            onClick={goHome}
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
