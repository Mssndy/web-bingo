'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { JankenResult } from '@/lib/janken';
import {
  BOARD, createPlayers, rollDice, clampPosition, getSquare, pickMiniGame,
  drawTrumpCard, trumpCardLabel, trumpCardSuit,
  SQUARE_STYLE, getSquareEventText,
  MINIGAME_WIN_BONUS, MINIGAME_DRAW_BONUS,
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

// フェーズ定義
type Phase =
  | 'roll'            // プレイヤーがサイコロを振る番
  | 'rolling'         // サイコロ回転中
  | 'moving'          // コマ移動中
  | 'event'           // マスイベント表示中
  | 'minigame-intro'  // ミニゲーム開幕アナウンス
  | 'janken'          // じゃんけん画面 (fullscreen)
  | 'trump'           // トランプミニゲーム
  | 'minigame-result' // ミニゲーム結果 → 追加移動
  | 'cpu-turn'        // CPUターン自動進行
  | 'game-over';      // 全員ゴール or 1位確定

// ── トランプカードUI コンポーネント ───────────────────────────────────────────

interface CardProps {
  value: number | null;
  suit: string;
  label: string;
  flipped: boolean;
  isWinner: boolean | null;
  onClick?: () => void;
}

function TrumpCard({ value, suit, label, flipped, isWinner, onClick }: CardProps) {
  const isRed = suit === '♥' || suit === '♦';
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-black text-gray-500">{label}</p>
      <button
        onClick={onClick}
        disabled={!onClick}
        className="relative w-24 h-32 rounded-2xl shadow-xl transition-all active:scale-95"
        style={{
          background: flipped
            ? 'white'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: isWinner === true
            ? '3px solid #ffd93d'
            : isWinner === false
              ? '3px solid rgba(0,0,0,0.15)'
              : '3px solid rgba(255,255,255,0.3)',
          animation: flipped ? 'card-flip-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
          opacity: isWinner === false ? 0.55 : 1,
          transform: isWinner === true ? 'scale(1.08)' : undefined,
        }}
      >
        {flipped && value !== null ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: isRed ? '#e03131' : '#212529' }}>
            <span className="text-4xl font-black leading-none">{trumpCardLabel(value)}</span>
            <span className="text-2xl">{suit}</span>
          </div>
        ) : !flipped ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-16 h-24 rounded-xl border-2 border-white/30 flex items-center justify-center">
              <span className="text-3xl opacity-60">🂠</span>
            </div>
          </div>
        ) : null}
        {onClick && !flipped && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl text-white font-black text-sm"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            タップ！
          </div>
        )}
      </button>
      {flipped && value !== null && (
        <p className="text-xs font-bold text-gray-600">{value}のカード</p>
      )}
    </div>
  );
}

// ── ボードのマスコンポーネント ─────────────────────────────────────────────────

function SquareCell({
  square,
  players,
  isCurrentTarget,
}: {
  square: (typeof BOARD)[number];
  players: SugorokuPlayer[];
  isCurrentTarget: boolean;
}) {
  const style = SQUARE_STYLE[square.type];
  const here = players.filter(p => p.position === square.id);

  return (
    <div
      className="relative rounded-xl flex flex-col items-center justify-center select-none overflow-hidden"
      style={{
        gridRow: square.row + 1,
        gridColumn: square.col + 1,
        background: style.bg,
        border: `2px solid ${style.border}`,
        aspectRatio: '1',
        boxShadow: isCurrentTarget
          ? '0 0 0 3px white, 0 0 12px rgba(255,217,61,0.8)'
          : '0 2px 4px rgba(0,0,0,0.2)',
        animation: isCurrentTarget ? 'active-player-pulse 1s ease-in-out infinite' : undefined,
      }}
    >
      {/* 内側のハイライト */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 55%)' }}
      />

      {/* マス番号 */}
      <span className="text-[9px] font-black text-white/70 absolute top-0.5 left-1 z-10 leading-none">
        {square.id === 0 ? 'S' : square.id === 19 ? 'G' : square.id}
      </span>

      {/* マス絵文字 */}
      {style.emoji && (
        <span className="text-base leading-none relative z-10" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
          {style.emoji}
        </span>
      )}

      {/* プレイヤートークン */}
      {here.length > 0 && (
        <div className="flex flex-wrap justify-center gap-0 relative z-20">
          {here.map(p => (
            <div
              key={p.id}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md border border-white/60"
              style={{
                background: p.color,
                animation: 'token-hop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
              }}
              title={p.name}
            >
              {p.emoji}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── プレイヤーリスト（サイドパネル）───────────────────────────────────────────

function PlayerPanel({
  players,
  currentIdx,
}: {
  players: SugorokuPlayer[];
  currentIdx: number;
}) {
  return (
    <div className="flex gap-1">
      {players.map((p, i) => (
        <div
          key={p.id}
          className="flex-1 rounded-xl px-1 py-1.5 flex flex-col items-center gap-0.5 transition-all"
          style={{
            background: i === currentIdx ? p.color : 'rgba(255,255,255,0.12)',
            border: i === currentIdx ? `2px solid ${p.color}` : '2px solid transparent',
            opacity: p.isFinished ? 0.6 : 1,
          }}
        >
          <span className="text-base leading-none">{p.emoji}</span>
          <span className="text-[9px] font-black text-white leading-tight text-center truncate w-full text-center">
            {p.isFinished && p.rank ? `${p.rank}い` : p.name.slice(0, 3)}
          </span>
          <span className="text-[10px] font-black text-white/90">{p.position}</span>
        </div>
      ))}
    </div>
  );
}

// ── メインコンポーネント ───────────────────────────────────────────────────────

export default function SugorokuScreen({ playerName, onHome }: Props) {
  const [players, setPlayers]     = useState<SugorokuPlayer[]>(() => createPlayers(playerName));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase]         = useState<Phase>('roll');
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [rollingNum, setRollingNum] = useState(1); // サイコロアニメ用
  const [eventText, setEventText] = useState<string | null>(null);
  const [minigame, setMinigame]   = useState<MiniGameType | null>(null);
  const [mgResult, setMgResult]   = useState<'win' | 'lose' | 'draw' | null>(null);
  const [finishedRanks, setFinishedRanks] = useState(0);

  // トランプ用state
  const [playerCard, setPlayerCard] = useState<{ value: number; suit: string } | null>(null);
  const [cpuCard, setCpuCard]       = useState<{ value: number; suit: string } | null>(null);
  const [cardFlipStep, setCardFlipStep] = useState<'wait' | 'player-flip' | 'cpu-flip' | 'result'>('wait');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }
  function clearRollAnim() {
    if (rollAnimRef.current) { clearInterval(rollAnimRef.current); rollAnimRef.current = null; }
  }

  useEffect(() => () => { clearTimer(); clearRollAnim(); }, []);

  // ── 移動処理（1マスずつ）─────────────────────────────────────────────────────
  const moveStep = useCallback((
    currentPlayers: SugorokuPlayer[],
    playerIndex: number,
    stepsLeft: number,
    onDone: (newPlayers: SugorokuPlayer[]) => void,
  ) => {
    if (stepsLeft <= 0) {
      onDone(currentPlayers);
      return;
    }
    const p = currentPlayers[playerIndex];
    const newPos = clampPosition(p.position + 1);
    const updated = currentPlayers.map((pl, i) =>
      i === playerIndex ? { ...pl, position: newPos } : pl
    );
    playTokenStep();
    setPlayers(updated);

    // ゴールに到達した場合は即停止
    if (newPos === 19) {
      onDone(updated);
      return;
    }

    timerRef.current = setTimeout(() => {
      moveStep(updated, playerIndex, stepsLeft - 1, onDone);
    }, 320);
  }, []);

  // ── マスイベント解決 ──────────────────────────────────────────────────────────
  const resolveSquare = useCallback((
    currentPlayers: SugorokuPlayer[],
    playerIndex: number,
    afterEventCallback: (ps: SugorokuPlayer[]) => void,
  ) => {
    const pos = currentPlayers[playerIndex].position;
    const square = getSquare(pos);

    if (square.type === 'goal') {
      const newRank = finishedRanks + 1;
      setFinishedRanks(newRank);
      const updated = currentPlayers.map((pl, i) =>
        i === playerIndex ? { ...pl, isFinished: true, rank: newRank } : pl
      );
      setPlayers(updated);
      playGoalReached();
      setEventText(getSquareEventText('goal'));
      setPhase('event');
      timerRef.current = setTimeout(() => {
        afterEventCallback(updated);
      }, 2500);
      return;
    }

    if (square.type === 'lucky') {
      playLucky();
      setEventText(getSquareEventText('lucky'));
      setPhase('event');
      timerRef.current = setTimeout(() => {
        moveStep(currentPlayers, playerIndex, 3, (ps2) => {
          setEventText(null);
          afterEventCallback(ps2);
        });
      }, 1500);
      return;
    }

    if (square.type === 'bad') {
      playBadSquare();
      setEventText(getSquareEventText('bad'));
      setPhase('event');
      timerRef.current = setTimeout(() => {
        // 戻る
        const p = currentPlayers[playerIndex];
        const newPos = clampPosition(p.position - 3);
        const updated = currentPlayers.map((pl, i) =>
          i === playerIndex ? { ...pl, position: newPos } : pl
        );
        setPlayers(updated);
        setEventText(null);
        timerRef.current = setTimeout(() => {
          afterEventCallback(updated);
        }, 600);
      }, 1500);
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
          // プレイヤーがミニゲーム
          setPhase(mg === 'janken' ? 'janken' : 'trump');
          if (mg === 'trump') {
            setCardFlipStep('wait');
            setPlayerCard(null);
            setCpuCard(null);
            setMgResult(null);
          }
        } else {
          // CPU のミニゲーム → 自動解決
          const result = Math.random() < 0.5 ? 'win' : Math.random() < 0.5 ? 'draw' : 'lose';
          applyMinigameResult(currentPlayers, playerIndex, result, afterEventCallback);
        }
      }, 2000);
      return;
    }

    // 普通のマス
    afterEventCallback(currentPlayers);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishedRanks, moveStep]);

  // ── ミニゲーム結果適用 ────────────────────────────────────────────────────────
  const applyMinigameResult = useCallback((
    currentPlayers: SugorokuPlayer[],
    playerIndex: number,
    result: 'win' | 'lose' | 'draw',
    afterCallback: (ps: SugorokuPlayer[]) => void,
  ) => {
    setMgResult(result);
    const bonus = result === 'win' ? MINIGAME_WIN_BONUS : result === 'draw' ? MINIGAME_DRAW_BONUS : 0;

    const resultText =
      result === 'win'  ? `🎉 かった！+${bonus}マスすすむ！` :
      result === 'draw' ? `🤝 あいこ！+${bonus}マスすすむ！` :
                          '😊 つぎがんばろう！';

    setEventText(resultText);
    setPhase('minigame-result');

    timerRef.current = setTimeout(() => {
      setEventText(null);
      setMgResult(null);
      setMinigame(null);
      if (bonus > 0) {
        moveStep(currentPlayers, playerIndex, bonus, (ps2) => {
          afterCallback(ps2);
        });
      } else {
        afterCallback(currentPlayers);
      }
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveStep]);

  // ── ターン終了 → 次のプレイヤーへ ────────────────────────────────────────────
  const endTurn = useCallback((currentPlayers: SugorokuPlayer[]) => {
    clearTimer();

    // 全員ゴールしたか？
    const allDone = currentPlayers.every(p => p.isFinished);
    // プレイヤーのみゴールしたら「ゲームオーバー」表示
    const humanDone = currentPlayers[0].isFinished;

    if (allDone || humanDone) {
      setPhase('game-over');
      return;
    }

    // 次のプレイヤーを探す（ゴール済みはスキップ）
    let next = (currentIdx + 1) % 4;
    for (let i = 0; i < 4; i++) {
      if (!currentPlayers[next % 4].isFinished) break;
      next = (next + 1) % 4;
    }
    next = next % 4;

    setCurrentIdx(next);

    if (currentPlayers[next].isHuman) {
      setPhase('roll');
    } else {
      setPhase('cpu-turn');
      // CPU自動ターン
      timerRef.current = setTimeout(() => {
        const val = rollDice();
        setDiceValue(val);
        playDiceRoll();
        timerRef.current = setTimeout(() => {
          moveStep(currentPlayers, next, val, (ps2) => {
            resolveSquare(ps2, next, endTurn);
          });
        }, 900);
      }, 1200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, moveStep, resolveSquare]);

  // ── サイコロを振る ────────────────────────────────────────────────────────────
  const handleRoll = useCallback(() => {
    if (phase !== 'roll') return;
    clearTimer();
    clearRollAnim();
    setPhase('rolling');
    playDiceRoll();

    // サイコロ目がランダムに切り替わるアニメーション
    rollAnimRef.current = setInterval(() => {
      setRollingNum(Math.floor(Math.random() * 6) + 1);
    }, 80);

    timerRef.current = setTimeout(() => {
      clearRollAnim();
      const val = rollDice();
      setDiceValue(val);
      setRollingNum(val);
      setPhase('moving');

      timerRef.current = setTimeout(() => {
        moveStep(players, currentIdx, val, (ps) => {
          resolveSquare(ps, currentIdx, endTurn);
        });
      }, 400);
    }, 900);
  }, [phase, players, currentIdx, moveStep, resolveSquare, endTurn]);

  // ── じゃんけん完了コールバック ───────────────────────────────────────────────
  const handleJankenComplete = useCallback((result: JankenResult) => {
    applyMinigameResult(players, currentIdx, result, endTurn);
  }, [applyMinigameResult, players, currentIdx, endTurn]);

  // ── トランプ: プレイヤーがカードをタップ ─────────────────────────────────────
  const handlePlayerCardTap = useCallback(() => {
    if (cardFlipStep !== 'wait') return;
    const card = { value: drawTrumpCard(), suit: trumpCardSuit() };
    setPlayerCard(card);
    playCardFlip();
    setCardFlipStep('player-flip');

    timerRef.current = setTimeout(() => {
      const cpu = { value: drawTrumpCard(), suit: trumpCardSuit() };
      setCpuCard(cpu);
      playCardFlip();
      setCardFlipStep('cpu-flip');

      timerRef.current = setTimeout(() => {
        setCardFlipStep('result');
        if (card.value === cpu.value) {
          // あいこ: もう一度
          playTrumpDraw();
          timerRef.current = setTimeout(() => {
            setCardFlipStep('wait');
            setPlayerCard(null);
            setCpuCard(null);
          }, 1800);
        } else {
          const won = card.value > cpu.value;
          if (won) playTrumpWin(); else playTrumpLose();
          timerRef.current = setTimeout(() => {
            applyMinigameResult(players, currentIdx, won ? 'win' : 'lose', endTurn);
          }, 2200);
        }
      }, 900);
    }, 700);
  }, [cardFlipStep, players, currentIdx, applyMinigameResult, endTurn]);

  // ── じゃんけん画面に切り替え ──────────────────────────────────────────────────
  if (phase === 'janken') {
    return (
      <JankenGameScreen
        playerName={playerName}
        onHome={onHome}
        onSugorokuComplete={handleJankenComplete}
      />
    );
  }

  // ── サイコロ表示用 ────────────────────────────────────────────────────────────
  const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const displayDice = phase === 'rolling' ? rollingNum : (diceValue ?? 1);

  const currentPlayer = players[currentIdx];

  // ── ゲームオーバー画面 ────────────────────────────────────────────────────────
  if (phase === 'game-over') {
    const sorted = [...players].sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return b.position - a.position;
    });
    const human = players[0];
    const humanRank = sorted.findIndex(p => p.id === 0) + 1;

    return (
      <div
        className="flex flex-col items-center gap-4 px-4 py-6 min-h-screen"
        style={{ background: 'linear-gradient(160deg,#0b1840 0%,#1c3380 100%)' }}
      >
        <h1
          className="text-3xl font-black text-white"
          style={{ animation: 'sugoroku-event-in 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          🏁 ゲームしゅうりょう！
        </h1>

        <div className="w-full max-w-sm flex flex-col gap-2">
          {sorted.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow"
              style={{
                background: i === 0 ? p.color : 'rgba(255,255,255,0.1)',
                animation: `rank-drop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.1}s both`,
                opacity: 0,
              }}
            >
              <span className="text-3xl font-black text-white w-10 text-center">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}い`}
              </span>
              <span className="text-xl">{p.emoji}</span>
              <span className="text-lg font-black text-white flex-1">{p.name}</span>
              <span className="text-sm font-bold text-white/80">{p.position}マス</span>
            </div>
          ))}
        </div>

        {humanRank === 1 && (
          <p
            className="text-4xl font-black text-yellow-300"
            style={{ animation: 'bingo-flash 1s ease-in-out infinite' }}
          >
            🎉 やった！1いだ！！
          </p>
        )}

        <button
          onClick={onHome}
          className="mt-4 w-full max-w-sm py-4 rounded-3xl text-xl font-black text-white shadow-xl active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
        >
          🏠 ホームにもどる
        </button>

        <button
          onClick={() => {
            clearTimer();
            clearRollAnim();
            setPlayers(createPlayers(playerName));
            setCurrentIdx(0);
            setPhase('roll');
            setDiceValue(null);
            setEventText(null);
            setMinigame(null);
            setMgResult(null);
            setFinishedRanks(0);
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
    <div
      className="flex flex-col gap-2 px-3 py-3 min-h-screen"
      style={{ background: 'linear-gradient(160deg,#0b1840 0%,#1c3380 100%)' }}
    >
      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <button
          onClick={onHome}
          className="text-xl p-1.5 rounded-xl hover:bg-white/10 active:scale-90 transition-all text-white"
        >
          🏠
        </button>
        <h1 className="flex-1 text-center text-lg font-black text-white">🎲 すごろく</h1>
        <div className="w-9" />
      </div>

      {/* プレイヤーパネル */}
      <PlayerPanel players={players} currentIdx={currentIdx} />

      {/* ボード */}
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
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

      {/* アクションエリア */}
      <div className="flex flex-col items-center gap-2 flex-1 justify-center">

        {/* ===== サイコロを振る ===== */}
        {(phase === 'roll' || phase === 'rolling') && (
          <div className="flex flex-col items-center gap-3 w-full">
            {/* 誰のターン */}
            <div
              className="px-4 py-1.5 rounded-2xl"
              style={{ background: currentPlayer.color + 'cc' }}
            >
              <p className="text-base font-black text-white">
                {currentPlayer.emoji} {currentPlayer.isHuman ? 'あなたの' : currentPlayer.name + 'の'}ターン！
              </p>
            </div>

            {/* サイコロ */}
            <div
              className="text-7xl select-none"
              style={{
                animation: phase === 'rolling' ? 'dice-spin 0.9s ease-out both' : undefined,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
              }}
            >
              {DICE_FACES[displayDice]}
            </div>

            {phase === 'rolling' && (
              <p className="text-xl font-black text-white animate-pulse">ころころ…</p>
            )}

            {phase === 'roll' && (
              <button
                onClick={handleRoll}
                className="w-full max-w-xs py-5 rounded-3xl text-2xl font-black text-white shadow-xl active:scale-95 transition-all"
                style={{
                  background: `linear-gradient(135deg, ${currentPlayer.color}, ${currentPlayer.color}aa)`,
                  boxShadow: `0 6px 20px ${currentPlayer.color}66`,
                }}
              >
                🎲 サイコロをふる！
              </button>
            )}
          </div>
        )}

        {/* ===== 移動中 ===== */}
        {phase === 'moving' && diceValue !== null && (
          <div className="flex flex-col items-center gap-2">
            <div
              className="text-7xl"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}
            >
              {DICE_FACES[diceValue]}
            </div>
            <p className="text-2xl font-black text-white">{diceValue}マス すすむ！</p>
            <div className="flex gap-1">
              {[...Array(diceValue)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: currentPlayer.color,
                    animation: `bounce-in 0.3s ease ${i * 0.1}s both`,
                    opacity: 0,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ===== イベント表示 ===== */}
        {(phase === 'event' || phase === 'minigame-result') && eventText && (
          <div
            className="w-full max-w-xs rounded-3xl px-5 py-4 text-center shadow-xl"
            style={{
              background: phase === 'minigame-result' && mgResult === 'win'
                ? 'linear-gradient(135deg,#ffd93d,#ff922b)'
                : phase === 'minigame-result' && mgResult === 'lose'
                  ? 'rgba(255,255,255,0.15)'
                  : 'linear-gradient(135deg,#667eea,#764ba2)',
              animation: 'sugoroku-event-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <p className="text-xl font-black text-white leading-snug">{eventText}</p>
          </div>
        )}

        {/* ===== ミニゲーム開幕 ===== */}
        {phase === 'minigame-intro' && eventText && (
          <div
            className="flex flex-col items-center gap-2"
            style={{ animation: 'sugoroku-event-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            <p className="text-6xl" style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))' }}>
              {minigame === 'janken' ? '✊' : '🃏'}
            </p>
            <p className="text-2xl font-black text-white">{eventText}</p>
            <p className="text-base text-white/80 font-bold">
              {minigame === 'janken' ? 'じゃんけん！' : 'かーどをひこう！'}
            </p>
          </div>
        )}

        {/* ===== トランプミニゲーム ===== */}
        {phase === 'trump' && (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm animate-[fade-in_0.3s_ease_both]">
            <div
              className="w-full rounded-3xl px-4 py-2 text-center"
              style={{ background: 'linear-gradient(135deg,#ff6b9d,#f03e3e)' }}
            >
              <p className="text-base font-black text-white">🃏 トランプ かーどバトル！</p>
              <p className="text-xs text-white/80">大きいかずが かち！</p>
            </div>

            {cardFlipStep === 'wait' && (
              <p className="text-lg font-black text-white animate-pulse">カードをタップしてひこう！</p>
            )}

            {cardFlipStep === 'result' && playerCard && cpuCard && (
              <div className="text-center">
                {playerCard.value === cpuCard.value ? (
                  <p className="text-2xl font-black text-yellow-300 animate-[bounce-in_0.5s_ease_both]">
                    🤝 あいこ！もういちど！
                  </p>
                ) : playerCard.value > cpuCard.value ? (
                  <p className="text-2xl font-black text-yellow-300 animate-[bounce-in_0.5s_ease_both]">
                    🎉 やった！かった！！
                  </p>
                ) : (
                  <p className="text-xl font-black text-white/80 animate-[bounce-in_0.5s_ease_both]">
                    😊 おしい！またがんばろう！
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-6 items-end justify-center">
              <TrumpCard
                value={playerCard?.value ?? null}
                suit={playerCard?.suit ?? '♠'}
                label={playerName}
                flipped={playerCard !== null}
                isWinner={
                  cardFlipStep === 'result' && playerCard && cpuCard
                    ? playerCard.value > cpuCard.value
                      ? true
                      : playerCard.value < cpuCard.value
                        ? false
                        : null
                    : null
                }
                onClick={cardFlipStep === 'wait' ? handlePlayerCardTap : undefined}
              />

              <div className="text-3xl font-black text-white/60 pb-8">VS</div>

              <TrumpCard
                value={cpuCard?.value ?? null}
                suit={cpuCard?.suit ?? '♠'}
                label="CPU"
                flipped={cpuCard !== null}
                isWinner={
                  cardFlipStep === 'result' && playerCard && cpuCard
                    ? cpuCard.value > playerCard.value
                      ? true
                      : cpuCard.value < playerCard.value
                        ? false
                        : null
                    : null
                }
              />
            </div>
          </div>
        )}

        {/* ===== CPUターン表示 ===== */}
        {phase === 'cpu-turn' && (
          <div className="flex flex-col items-center gap-3">
            <div
              className="px-4 py-2 rounded-2xl"
              style={{ background: currentPlayer.color + 'cc' }}
            >
              <p className="text-base font-black text-white">
                {currentPlayer.emoji} {currentPlayer.name}のターン…
              </p>
            </div>
            {diceValue !== null && (
              <div className="flex items-center gap-2">
                <p className="text-4xl">{DICE_FACES[diceValue]}</p>
                <p className="text-xl font-black text-white">{diceValue}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
