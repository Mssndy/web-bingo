'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { JankenResult } from '@/lib/janken';
import {
  BOARD, BOARD_SIZE, createPlayers, rollDice, clampPosition, getSquare, pickMiniGame,
  drawTrumpCard, trumpCardLabel, trumpCardSuit,
  SQUARE_STYLE, getSquareEventText,
  MINIGAME_WIN_BONUS, MINIGAME_DRAW_BONUS, LUCKY_BONUS, BAD_PENALTY,
} from '@/lib/sugoroku';
import type { SugorokuPlayer, MiniGameType } from '@/lib/sugoroku';
import JankenGameScreen from '@/components/screens/JankenGameScreen';
import {
  playDiceRoll, playTokenStep, playLucky, playBadSquare,
  playMiniGameStart, playCardFlip, playTrumpWin, playTrumpLose, playTrumpDraw,
  playGoalReached,
} from '@/lib/sounds';

interface Props {
  playerName: string;
  onHome: () => void;
}

type Phase =
  | 'roll' | 'rolling' | 'moving' | 'event'
  | 'minigame-intro' | 'janken' | 'trump' | 'minigame-result'
  | 'cpu-turn' | 'game-over';

// ── トランプカード ─────────────────────────────────────────────────────────────

function TrumpCard({
  value, suit, label, flipped, isWinner, onClick,
}: {
  value: number | null; suit: string; label: string;
  flipped: boolean; isWinner: boolean | null; onClick?: () => void;
}) {
  const isRed = suit === '♥' || suit === '♦';
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-black text-gray-400">{label}</p>
      <button
        onClick={onClick}
        disabled={!onClick}
        className="relative w-24 h-32 rounded-2xl shadow-xl transition-all active:scale-95"
        style={{
          background: flipped ? 'white' : 'linear-gradient(135deg,#667eea,#764ba2)',
          border: isWinner === true ? '3px solid #ffd93d' : isWinner === false ? '3px solid rgba(0,0,0,0.12)' : '3px solid rgba(255,255,255,0.25)',
          animation: flipped ? 'card-flip-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
          opacity: isWinner === false ? 0.5 : 1,
          transform: isWinner === true ? 'scale(1.08)' : undefined,
        }}
      >
        {flipped && value !== null ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: isRed ? '#e03131' : '#212529' }}>
            <span className="text-4xl font-black leading-none">{trumpCardLabel(value)}</span>
            <span className="text-2xl">{suit}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="w-16 h-24 rounded-xl border-2 border-white/30 flex items-center justify-center">
              <span className="text-3xl opacity-50">🂠</span>
            </div>
          </div>
        )}
        {onClick && !flipped && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl text-white font-black text-sm" style={{ background: 'rgba(255,255,255,0.08)' }}>
            タップ！
          </div>
        )}
      </button>
      {flipped && value !== null && <p className="text-xs font-bold text-gray-500">{value}のカード</p>}
    </div>
  );
}

// ── ボードマスコンポーネント ───────────────────────────────────────────────────
// セルサイズは親のグリッドに任せる。em ベースでフォントを指定するので
// どんなサイズになっても相対的にきれいに見える。

function SquareCell({
  square, players, isCurrentTarget,
}: {
  square: (typeof BOARD)[number];
  players: SugorokuPlayer[];
  isCurrentTarget: boolean;
}) {
  const style   = SQUARE_STYLE[square.type];
  const isNormal = square.type === 'normal';
  const humanHere = players.find(p => p.isHuman && p.position === square.id);
  const cpusHere  = players.filter(p => !p.isHuman && p.position === square.id);

  return (
    <div
      id={`sq-${square.id}`}
      className="relative flex items-center justify-center overflow-hidden select-none"
      style={{
        gridRow: square.row,
        gridColumn: square.col,
        aspectRatio: '1',
        background: style.bg,
        borderRadius: '4px',
        border: isCurrentTarget
          ? '2px solid #ffd93d'
          : isNormal
            ? '1px solid #2d3f55'
            : `1px solid ${style.border}90`,
        boxShadow: isCurrentTarget ? '0 0 12px rgba(255,217,61,1)' : undefined,
      }}
    >
      {/* 内側グラデーション */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.12) 0%,transparent 60%)' }} />

      {/* 道路センターライン（普通マスのみ） */}
      {isNormal && (
        <div
          className="absolute"
          style={
            square.dir !== '↑'
              ? { top: '50%', left: '5%', right: '5%', height: '1px', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', borderRadius: '1px' }
              : { left: '50%', top: '5%', bottom: '5%', width: '1px', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.15)', borderRadius: '1px' }
          }
        />
      )}

      {/* 普通マス: 数字を中央に大きく */}
      {isNormal && (
        <span
          className="relative z-10 font-black leading-none"
          style={{
            fontSize: 'clamp(11px, 3vw, 18px)',
            color: 'rgba(255,255,255,0.85)',
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          }}
        >
          {square.id}
        </span>
      )}

      {/* 特殊マス: 小さい番号（左上）+ 絵文字（中央大） */}
      {!isNormal && (
        <>
          <span
            className="absolute font-black z-10 leading-none"
            style={{ top: '2px', left: '2px', fontSize: 'clamp(7px, 1.8vw, 10px)', color: 'rgba(255,255,255,0.85)' }}
          >
            {square.id === 0 ? 'S' : square.id === BOARD_SIZE - 1 ? 'G' : square.id}
          </span>
          {style.emoji && (
          <span
            className="relative z-10 leading-none"
            style={{
              fontSize: 'clamp(14px, 3.6vw, 22px)',
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
            }}
          >
            {style.emoji}
          </span>
          )}
        </>
      )}

      {/* CPU トークン（小さい丸、左上） */}
      {cpusHere.length > 0 && (
        <div className="absolute top-0.5 left-0.5 flex flex-wrap gap-px z-20" style={{ maxWidth: '55%' }}>
          {cpusHere.map(p => (
            <div
              key={p.id}
              className="rounded-full flex items-center justify-center border border-white/70"
              style={{
                width: 'clamp(8px, 2vw, 13px)',
                height: 'clamp(8px, 2vw, 13px)',
                background: p.color,
                fontSize: 'clamp(5px, 1.2vw, 8px)',
                lineHeight: 1,
                animation: 'token-hop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
              }}
              title={p.name}
            >
              {p.emoji}
            </div>
          ))}
        </div>
      )}

      {/* 人間トークン（大きく・右下） */}
      {humanHere && (
        <div
          className="absolute rounded-full flex items-center justify-center border-2 border-white z-30 shadow-lg"
          style={{
            width: 'clamp(16px, 4.2vw, 26px)',
            height: 'clamp(16px, 4.2vw, 26px)',
            right: '1px', bottom: '1px',
            background: humanHere.color,
            fontSize: 'clamp(9px, 2.4vw, 15px)',
            lineHeight: 1,
            boxShadow: '0 0 8px rgba(255,217,61,0.9), 0 2px 4px rgba(0,0,0,0.5)',
            animation: 'token-hop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
          title={humanHere.name}
        >
          {humanHere.emoji}
        </div>
      )}
    </div>
  );
}

// ── プレイヤーパネル ───────────────────────────────────────────────────────────

function PlayerPanel({ players, currentIdx }: { players: SugorokuPlayer[]; currentIdx: number }) {
  return (
    <div className="flex gap-1">
      {players.map((p, i) => (
        <div
          key={p.id}
          className="flex-1 rounded-xl px-1 py-1 flex flex-col items-center gap-0.5 transition-all"
          style={{
            background: i === currentIdx ? p.color + 'cc' : 'rgba(255,255,255,0.1)',
            border: i === currentIdx ? `2px solid ${p.color}` : '2px solid transparent',
            opacity: p.isFinished ? 0.55 : 1,
          }}
        >
          <span className="leading-none" style={{ fontSize: p.isHuman ? '18px' : '13px' }}>{p.emoji}</span>
          <span className="font-black text-white leading-tight text-center truncate w-full" style={{ fontSize: '9px' }}>
            {p.isFinished && p.rank ? `${p.rank}い` : p.name.slice(0, 3)}
          </span>
          <span className="font-bold text-white/80" style={{ fontSize: '9px' }}>{p.position}</span>
        </div>
      ))}
    </div>
  );
}

// ── メインコンポーネント ───────────────────────────────────────────────────────

export default function SugorokuScreen({ playerName, onHome }: Props) {
  const [players, setPlayers]       = useState<SugorokuPlayer[]>(() => createPlayers(playerName));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase]           = useState<Phase>('roll');
  const [diceValue, setDiceValue]   = useState<number | null>(null);
  const [rollingNum, setRollingNum] = useState(1);
  const [eventText, setEventText]   = useState<string | null>(null);
  const [minigame, setMinigame]     = useState<MiniGameType | null>(null);
  const [mgResult, setMgResult]     = useState<'win' | 'lose' | 'draw' | null>(null);

  // finishedRanks はコールバック内で常に最新値が必要なので ref で管理
  const finishedRanksRef = useRef(0);

  const [playerCard, setPlayerCard] = useState<{ value: number; suit: string } | null>(null);
  const [cpuCard, setCpuCard]       = useState<{ value: number; suit: string } | null>(null);
  const [cardFlipStep, setCardFlipStep] = useState<'wait' | 'player-flip' | 'cpu-flip' | 'result'>('wait');

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardRef    = useRef<HTMLDivElement>(null);

  // currentIdx の最新値を ref でも持つ（表示用の state と分離）
  const currentIdxRef = useRef(currentIdx);
  currentIdxRef.current = currentIdx;

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }
  function clearRollAnim() {
    if (rollAnimRef.current) { clearInterval(rollAnimRef.current); rollAnimRef.current = null; }
  }

  useEffect(() => () => { clearTimer(); clearRollAnim(); }, []);

  // ボードを下端（スタート付近）から表示開始
  useEffect(() => {
    if (boardRef.current) boardRef.current.scrollTop = boardRef.current.scrollHeight;
  }, []);

  // 現在のプレイヤーのコマが見えるようにスクロール
  useEffect(() => {
    const pos = players[currentIdx]?.position ?? 0;
    const el  = document.getElementById(`sq-${pos}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [players, currentIdx]);

  // ── 移動処理（1マスずつ）─────────────────────────────────────────────────────
  const moveStep = useCallback((
    currentPlayers: SugorokuPlayer[],
    playerIndex: number,
    stepsLeft: number,
    onDone: (ps: SugorokuPlayer[]) => void,
  ) => {
    if (stepsLeft <= 0) { onDone(currentPlayers); return; }
    const p      = currentPlayers[playerIndex];
    const newPos = clampPosition(p.position + 1);
    const updated = currentPlayers.map((pl, i) => i === playerIndex ? { ...pl, position: newPos } : pl);
    playTokenStep();
    setPlayers(updated);
    if (newPos >= BOARD_SIZE - 1) { onDone(updated); return; }
    timerRef.current = setTimeout(() => moveStep(updated, playerIndex, stepsLeft - 1, onDone), 280);
  }, []);

  // ── ターン終了 → 次のプレイヤーへ ─────────────────────────────────────────────
  // ★ バグ修正: currentIdx を state から読まず、引数 fromIdx で受け取る
  //    これにより useCallback の stale closure 問題を回避する
  const endTurn = useCallback((currentPlayers: SugorokuPlayer[], fromIdx: number) => {
    clearTimer();

    // 1位がゴールしたらゲーム終了
    if (currentPlayers.some(p => p.isFinished)) {
      setPhase('game-over');
      return;
    }

    // 次のプレイヤーを探す（ゴール済みはスキップ）
    let next = (fromIdx + 1) % 4;
    for (let i = 0; i < 4; i++) {
      if (!currentPlayers[next].isFinished) break;
      next = (next + 1) % 4;
    }

    setCurrentIdx(next);

    if (currentPlayers[next].isHuman) {
      setPhase('roll');
    } else {
      setPhase('cpu-turn');
      timerRef.current = setTimeout(() => {
        const val = rollDice();
        setDiceValue(val);
        playDiceRoll();
        timerRef.current = setTimeout(() => {
          moveStep(currentPlayers, next, val, (ps2) =>
            resolveSquare(ps2, next, (ps3) => endTurn(ps3, next))
          );
        }, 900);
      }, 1200);
    }
  // resolveSquare は下で定義するため循環するが、useCallback の依存には含めず
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveStep]);

  // ── マスイベント解決 ──────────────────────────────────────────────────────────
  const resolveSquare = useCallback((
    currentPlayers: SugorokuPlayer[],
    playerIndex: number,
    afterEventCallback: (ps: SugorokuPlayer[]) => void,
  ) => {
    const pos    = currentPlayers[playerIndex].position;
    const square = getSquare(pos);

    if (square.type === 'goal') {
      finishedRanksRef.current += 1;
      const rank    = finishedRanksRef.current;
      const updated = currentPlayers.map((pl, i) => i === playerIndex ? { ...pl, isFinished: true, rank } : pl);
      setPlayers(updated);
      playGoalReached();
      setEventText(getSquareEventText('goal'));
      setPhase('event');
      timerRef.current = setTimeout(() => afterEventCallback(updated), 2500);
      return;
    }

    if (square.type === 'lucky') {
      playLucky();
      setEventText(getSquareEventText('lucky'));
      setPhase('event');
      timerRef.current = setTimeout(() => {
        moveStep(currentPlayers, playerIndex, LUCKY_BONUS, (ps2) => {
          setEventText(null);
          afterEventCallback(ps2);
        });
      }, 1400);
      return;
    }

    if (square.type === 'bad') {
      playBadSquare();
      setEventText(getSquareEventText('bad'));
      setPhase('event');
      timerRef.current = setTimeout(() => {
        const p       = currentPlayers[playerIndex];
        const newPos  = clampPosition(p.position - BAD_PENALTY);
        const updated = currentPlayers.map((pl, i) => i === playerIndex ? { ...pl, position: newPos } : pl);
        setPlayers(updated);
        setEventText(null);
        timerRef.current = setTimeout(() => afterEventCallback(updated), 600);
      }, 1400);
      return;
    }

    if (square.type === 'minigame') {
      const mg = pickMiniGame();
      setMinigame(mg);
      playMiniGameStart();
      setEventText(getSquareEventText('minigame'));
      setPhase('minigame-intro');
      timerRef.current = setTimeout(() => {
        setEventText(null);
        if (currentPlayers[playerIndex].isHuman) {
          setPhase(mg === 'janken' ? 'janken' : 'trump');
          if (mg === 'trump') { setCardFlipStep('wait'); setPlayerCard(null); setCpuCard(null); setMgResult(null); }
        } else {
          const r = Math.random() < 0.5 ? 'win' : Math.random() < 0.5 ? 'draw' : 'lose';
          applyMinigameResult(currentPlayers, playerIndex, r, afterEventCallback);
        }
      }, 2000);
      return;
    }

    afterEventCallback(currentPlayers);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveStep]);

  // ── ミニゲーム結果適用 ────────────────────────────────────────────────────────
  const applyMinigameResult = useCallback((
    currentPlayers: SugorokuPlayer[],
    playerIndex: number,
    result: 'win' | 'lose' | 'draw',
    afterCallback: (ps: SugorokuPlayer[]) => void,
  ) => {
    setMgResult(result);
    const bonus = result === 'win' ? MINIGAME_WIN_BONUS : result === 'draw' ? MINIGAME_DRAW_BONUS : 0;
    setEventText(
      result === 'win'  ? `🎉 かった！+${bonus}マスすすむ！` :
      result === 'draw' ? `🤝 あいこ！+${bonus}マスすすむ！` :
                          '😊 つぎがんばろう！'
    );
    setPhase('minigame-result');
    timerRef.current = setTimeout(() => {
      setEventText(null); setMgResult(null); setMinigame(null);
      if (bonus > 0) {
        moveStep(currentPlayers, playerIndex, bonus, afterCallback);
      } else {
        afterCallback(currentPlayers);
      }
    }, 2000);
  }, [moveStep]);

  // ── サイコロを振る ────────────────────────────────────────────────────────────
  const handleRoll = useCallback(() => {
    if (phase !== 'roll') return;
    const idx = currentIdxRef.current;
    clearTimer(); clearRollAnim();
    setPhase('rolling');
    playDiceRoll();
    rollAnimRef.current = setInterval(() => setRollingNum(Math.floor(Math.random() * 6) + 1), 80);
    timerRef.current = setTimeout(() => {
      clearRollAnim();
      const val = rollDice();
      setDiceValue(val); setRollingNum(val); setPhase('moving');
      timerRef.current = setTimeout(() => {
        // players の最新値が必要なので setPlayers の functional update を使わず
        // 直接 ref から取ることもできるが、ここは handleRoll 呼び出し時点の players を closure で使う
        setPlayers(prev => {
          moveStep(prev, idx, val, (ps) =>
            resolveSquare(ps, idx, (ps2) => endTurn(ps2, idx))
          );
          return prev; // setPlayers 自体は変更しない（moveStep 内で set される）
        });
      }, 400);
    }, 900);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, moveStep, resolveSquare, endTurn]);

  // ── じゃんけん完了 ────────────────────────────────────────────────────────────
  const handleJankenComplete = useCallback((result: JankenResult) => {
    const idx = currentIdxRef.current;
    setPlayers(prev => {
      applyMinigameResult(prev, idx, result, (ps) => endTurn(ps, idx));
      return prev;
    });
  }, [applyMinigameResult, endTurn]);

  // ── トランプ: カードをタップ ──────────────────────────────────────────────────
  const handlePlayerCardTap = useCallback(() => {
    if (cardFlipStep !== 'wait') return;
    const idx  = currentIdxRef.current;
    const card = { value: drawTrumpCard(), suit: trumpCardSuit() };
    setPlayerCard(card); playCardFlip(); setCardFlipStep('player-flip');
    timerRef.current = setTimeout(() => {
      const cpu = { value: drawTrumpCard(), suit: trumpCardSuit() };
      setCpuCard(cpu); playCardFlip(); setCardFlipStep('cpu-flip');
      timerRef.current = setTimeout(() => {
        setCardFlipStep('result');
        if (card.value === cpu.value) {
          playTrumpDraw();
          timerRef.current = setTimeout(() => { setCardFlipStep('wait'); setPlayerCard(null); setCpuCard(null); }, 1800);
        } else {
          const won = card.value > cpu.value;
          if (won) playTrumpWin(); else playTrumpLose();
          timerRef.current = setTimeout(() => {
            setPlayers(prev => {
              applyMinigameResult(prev, idx, won ? 'win' : 'lose', (ps) => endTurn(ps, idx));
              return prev;
            });
          }, 2200);
        }
      }, 900);
    }, 700);
  }, [cardFlipStep, applyMinigameResult, endTurn]);

  // ── じゃんけん画面 ────────────────────────────────────────────────────────────
  if (phase === 'janken') {
    return <JankenGameScreen playerName={playerName} onHome={onHome} onSugorokuComplete={handleJankenComplete} />;
  }

  const DICE_FACES    = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const displayDice   = phase === 'rolling' ? rollingNum : (diceValue ?? 1);
  const currentPlayer = players[currentIdx];

  // ── ゲームオーバー画面 ────────────────────────────────────────────────────────
  if (phase === 'game-over') {
    const sorted = [...players].sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return b.position - a.position;
    });
    const humanRank = sorted.findIndex(p => p.id === 0) + 1;

    return (
      <div className="flex flex-col items-center gap-4 px-4 py-6 min-h-screen" style={{ background: 'linear-gradient(160deg,#0b1840 0%,#1c3380 100%)' }}>
        <h1 className="text-3xl font-black text-white" style={{ animation: 'sugoroku-event-in 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          🏁 ゲームしゅうりょう！
        </h1>
        <div className="w-full max-w-sm flex flex-col gap-2">
          {sorted.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow"
              style={{ background: i === 0 ? p.color : 'rgba(255,255,255,0.1)', animation: `rank-drop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.1}s both`, opacity: 0 }}
            >
              <span className="text-3xl font-black text-white w-10 text-center">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}い`}
              </span>
              <span className="text-xl">{p.emoji}</span>
              <span className="text-lg font-black text-white flex-1">{p.name}</span>
              <span className="text-sm font-bold text-white/70">{p.position}マス</span>
            </div>
          ))}
        </div>
        {humanRank === 1 && (
          <p className="text-4xl font-black text-yellow-300" style={{ animation: 'bingo-flash 1s ease-in-out infinite' }}>
            🎉 やった！1いだ！！
          </p>
        )}
        <button
          onClick={onHome}
          className="mt-2 w-full max-w-sm py-4 rounded-3xl text-xl font-black text-white shadow-xl active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
        >
          🏠 ホームにもどる
        </button>
        <button
          onClick={() => {
            clearTimer(); clearRollAnim();
            finishedRanksRef.current = 0;
            setPlayers(createPlayers(playerName)); setCurrentIdx(0); setPhase('roll');
            setDiceValue(null); setEventText(null); setMinigame(null); setMgResult(null);
            setTimeout(() => { if (boardRef.current) boardRef.current.scrollTop = boardRef.current.scrollHeight; }, 50);
          }}
          className="w-full max-w-sm py-3 rounded-3xl text-lg font-black text-white/80 active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)' }}
        >
          もう一度あそぶ！
        </button>
      </div>
    );
  }

  // ── メインゲーム画面 ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[100dvh]" style={{ background: 'linear-gradient(160deg,#0b1840 0%,#1c3380 100%)' }}>

      {/* ヘッダー */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1 shrink-0">
        <button onClick={onHome} className="text-xl p-1.5 rounded-xl hover:bg-white/10 active:scale-90 transition-all text-white">🏠</button>
        <h1 className="flex-1 text-center text-lg font-black text-white">🎲 すごろく</h1>
        <div className="w-9" />
      </div>

      {/* プレイヤーパネル */}
      <div className="px-3 pb-1 shrink-0">
        <PlayerPanel players={players} currentIdx={currentIdx} />
      </div>

      {/* ボード（スクロール可能・草地背景）*/}
      <div
        ref={boardRef}
        className="flex-1 overflow-y-auto min-h-0 px-2 py-2"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div
          className="rounded-2xl p-2"
          style={{ background: 'linear-gradient(135deg,#14532d 0%,#166534 100%)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)' }}
        >
          {/* 凡例 */}
          <div className="flex gap-1.5 mb-2 flex-wrap justify-center">
            {([
              { type: 'lucky',    label: 'ラッキー +5' },
              { type: 'bad',      label: 'バッド -5' },
              { type: 'minigame', label: 'ゲーム' },
            ] as const).map(({ type, label }) => (
              <div key={type} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white" style={{ background: SQUARE_STYLE[type].bg, fontSize: '10px', fontWeight: 900 }}>
                <span>{SQUARE_STYLE[type].emoji}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* 10×10グリッド */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gridTemplateRows:    'repeat(10, 1fr)',
              gap: '2px',
              width: '100%',
            }}
          >
            {BOARD.map(square => (
              <SquareCell
                key={square.id}
                square={square}
                players={players}
                isCurrentTarget={
                  (phase === 'moving' || phase === 'event') &&
                  players[currentIdx].position === square.id
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* アクションエリア（固定フッター） */}
      <div
        className="shrink-0 px-3 pt-2 pb-3"
        style={{ background: 'rgba(11,24,64,0.96)', borderTop: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
      >
        {/* ===== サイコロを振る ===== */}
        {(phase === 'roll' || phase === 'rolling') && (
          <div className="flex items-center gap-3">
            <div
              className="text-8xl select-none shrink-0"
              style={{ animation: phase === 'rolling' ? 'dice-spin 0.9s ease-out both' : undefined, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
            >
              {DICE_FACES[displayDice]}
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-white/70 mb-1">
                {currentPlayer.emoji} {currentPlayer.isHuman ? 'あなたの' : currentPlayer.name + 'の'}ターン！
              </p>
              {phase === 'roll' ? (
                <button
                  onClick={handleRoll}
                  className="w-full py-3 rounded-2xl text-lg font-black text-white shadow-lg active:scale-95 transition-all"
                  style={{ background: `linear-gradient(135deg,${currentPlayer.color},${currentPlayer.color}99)`, boxShadow: `0 4px 16px ${currentPlayer.color}55` }}
                >
                  🎲 サイコロをふる！
                </button>
              ) : (
                <p className="text-base font-black text-white animate-pulse">ころころ…</p>
              )}
            </div>
          </div>
        )}

        {/* ===== 移動中 ===== */}
        {phase === 'moving' && diceValue !== null && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-8xl">{DICE_FACES[diceValue]}</span>
            <div>
              <p className="text-xl font-black text-white">{diceValue}マス すすむ！</p>
              <div className="flex gap-1 mt-1">
                {[...Array(diceValue)].map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: currentPlayer.color, animation: `bounce-in 0.3s ease ${i * 0.08}s both`, opacity: 0 }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== イベント / ミニゲーム結果 ===== */}
        {(phase === 'event' || phase === 'minigame-result') && eventText && (
          <div
            className="w-full rounded-2xl px-4 py-3 text-center"
            style={{
              background: phase === 'minigame-result' && mgResult === 'win' ? 'linear-gradient(135deg,#ffd93d,#ff922b)' :
                          phase === 'minigame-result' && mgResult === 'lose' ? 'rgba(255,255,255,0.12)' :
                          'linear-gradient(135deg,#667eea,#764ba2)',
              animation: 'sugoroku-event-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <p className="text-xl font-black text-white">{eventText}</p>
          </div>
        )}

        {/* ===== ミニゲーム開幕 ===== */}
        {phase === 'minigame-intro' && eventText && (
          <div className="flex items-center justify-center gap-3" style={{ animation: 'sugoroku-event-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <span className="text-5xl" style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))' }}>
              {minigame === 'janken' ? '✊' : '🃏'}
            </span>
            <div>
              <p className="text-xl font-black text-white">{eventText}</p>
              <p className="text-sm text-white/70 font-bold">{minigame === 'janken' ? 'じゃんけん！' : 'かーどをひこう！'}</p>
            </div>
          </div>
        )}

        {/* ===== トランプ ===== */}
        {phase === 'trump' && (
          <div className="animate-[fade-in_0.3s_ease_both]">
            <div className="rounded-2xl px-3 py-1.5 text-center mb-2" style={{ background: 'linear-gradient(135deg,#ff6b9d,#f03e3e)' }}>
              <p className="text-sm font-black text-white">🃏 トランプ かーどバトル！大きいかずが かち！</p>
            </div>
            {cardFlipStep === 'wait' && <p className="text-base font-black text-white text-center animate-pulse mb-2">カードをタップしてひこう！</p>}
            {cardFlipStep === 'result' && playerCard && cpuCard && (
              <p className="text-lg font-black text-center mb-2" style={{ color: playerCard.value !== cpuCard.value && playerCard.value > cpuCard.value ? '#ffd93d' : 'rgba(255,255,255,0.8)' }}>
                {playerCard.value === cpuCard.value ? '🤝 あいこ！もういちど！' : playerCard.value > cpuCard.value ? '🎉 やった！かった！！' : '😊 おしい！またがんばろう！'}
              </p>
            )}
            <div className="flex gap-4 items-end justify-center">
              <TrumpCard
                value={playerCard?.value ?? null} suit={playerCard?.suit ?? '♠'} label={playerName}
                flipped={playerCard !== null}
                isWinner={cardFlipStep === 'result' && playerCard && cpuCard ? playerCard.value > cpuCard.value ? true : playerCard.value < cpuCard.value ? false : null : null}
                onClick={cardFlipStep === 'wait' ? handlePlayerCardTap : undefined}
              />
              <div className="text-2xl font-black text-white/50 pb-8">VS</div>
              <TrumpCard
                value={cpuCard?.value ?? null} suit={cpuCard?.suit ?? '♠'} label="CPU"
                flipped={cpuCard !== null}
                isWinner={cardFlipStep === 'result' && playerCard && cpuCard ? cpuCard.value > playerCard.value ? true : cpuCard.value < playerCard.value ? false : null : null}
              />
            </div>
          </div>
        )}

        {/* ===== CPUターン ===== */}
        {phase === 'cpu-turn' && (
          <div className="flex items-center justify-center gap-3">
            <div className="px-3 py-2 rounded-xl" style={{ background: currentPlayer.color + 'cc' }}>
              <p className="text-base font-black text-white">{currentPlayer.emoji} {currentPlayer.name}のターン…</p>
            </div>
            {diceValue !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-7xl">{DICE_FACES[diceValue]}</span>
                <span className="text-xl font-black text-white">{diceValue}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
