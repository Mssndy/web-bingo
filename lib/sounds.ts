/**
 * Web Audio API サウンドエフェクト — 外部ファイル不要。
 * すべてユーザー操作起点で鳴らすため AudioContext の停止問題なし。
 */

type OscType = OscillatorType;

function makeCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try { return new AudioContext(); } catch { return null; }
}

// ── 内部ユーティリティ ────────────────────────────────────────────────────────

/** 単音トーン（音量はアタック即 → 指数減衰） */
function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscType = 'sine',
  vol = 0.28,
) {
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** 周波数スイープ（ヒュイン・ボイン系） */
function sweep(
  ac: AudioContext,
  freqFrom: number,
  freqTo: number,
  start: number,
  duration: number,
  type: OscType = 'sine',
  vol = 0.25,
) {
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, start);
  osc.frequency.exponentialRampToValueAtTime(freqTo, start + duration);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** キックドラム（低い打撃音） */
function kick(ac: AudioContext, start: number, vol = 0.52) {
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(170, start);
  osc.frequency.exponentialRampToValueAtTime(48, start + 0.14);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26);
  osc.start(start);
  osc.stop(start + 0.28);
}

/** スナップ / ハイハット（ホワイトノイズ短め） */
function snap(ac: AudioContext, start: number, duration = 0.06, vol = 0.18) {
  const bufSize = Math.ceil(ac.sampleRate * (duration + 0.01));
  const buf  = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src    = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain   = ac.createGain();
  src.buffer = buf;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  filter.type            = 'highpass';
  filter.frequency.value = 5000;
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  src.start(start);
  src.stop(start + duration + 0.01);
}

// ── 公開サウンド ──────────────────────────────────────────────────────────────

/** 正解音: スナップ + ポップなアルペジオ + きらきらエンディング */
export function playCorrect(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  snap(ac, t, 0.05, 0.18);
  tone(ac, 523,  t + 0.01, 0.09, 'triangle', 0.26);  // C5
  tone(ac, 659,  t + 0.08, 0.09, 'triangle', 0.26);  // E5
  tone(ac, 784,  t + 0.15, 0.09, 'triangle', 0.26);  // G5
  tone(ac, 1047, t + 0.22, 0.32, 'triangle', 0.28);  // C6
  tone(ac, 1319, t + 0.22, 0.26, 'sine',     0.14);  // E6 ハーモニー
  tone(ac, 1568, t + 0.30, 0.18, 'sine',     0.10);  // G6 きらきら
  tone(ac, 2093, t + 0.37, 0.13, 'sine',     0.07);  // C7 超高音
}

/** ベスト更新音: キック + 6音アルペジオ + きらきらカスケード */
export function playNewBest(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  kick(ac, t, 0.46);
  snap(ac, t, 0.06, 0.22);
  tone(ac, 523,  t + 0.02, 0.09, 'triangle', 0.24);
  tone(ac, 659,  t + 0.09, 0.09, 'triangle', 0.24);
  tone(ac, 784,  t + 0.16, 0.09, 'triangle', 0.24);
  tone(ac, 1047, t + 0.23, 0.11, 'triangle', 0.26);
  tone(ac, 1319, t + 0.32, 0.11, 'triangle', 0.26);
  tone(ac, 1568, t + 0.41, 0.32, 'triangle', 0.28);  // G6 フィナーレ
  tone(ac, 1047, t + 0.41, 0.28, 'sine',     0.14);  // 和音
  tone(ac, 2093, t + 0.50, 0.18, 'sine',     0.10);
  tone(ac, 2637, t + 0.55, 0.14, 'sine',     0.07);  // E7
}

/** 不正解音: コミカルな「ぼよん」（上がって→下がる） */
export function playWrong(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // 上にバウンスしてから落ちる → ぼよん！
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(240, t);
  osc.frequency.linearRampToValueAtTime(420, t + 0.07);
  osc.frequency.exponentialRampToValueAtTime(155, t + 0.36);
  gain.gain.setValueAtTime(0.30, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.40);
  osc.start(t);
  osc.stop(t + 0.42);
  // 小さなエコー感
  tone(ac, 210, t + 0.24, 0.14, 'sine', 0.10);
}

/** ビンゴ音: キック + スナップ + 5音ファンファーレ + 和音 */
export function playBingo(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  kick(ac, t, 0.55);
  snap(ac, t, 0.09, 0.24);
  tone(ac, 523,  t + 0.04, 0.09, 'triangle', 0.22);  // C5
  tone(ac, 659,  t + 0.11, 0.09, 'triangle', 0.22);  // E5
  tone(ac, 784,  t + 0.18, 0.09, 'triangle', 0.22);  // G5
  tone(ac, 1047, t + 0.25, 0.48, 'triangle', 0.25);  // C6
  tone(ac, 1319, t + 0.25, 0.42, 'sine',     0.14);  // E6
  tone(ac, 784,  t + 0.25, 0.42, 'sine',     0.11);  // G5 低音
  snap(ac, t + 0.25, 0.10, 0.15);                    // スネアアクセント
  tone(ac, 2093, t + 0.40, 0.20, 'sine',     0.08);  // C7 きらきら
}

/** 抽選音: ポップなダブルトーン */
export function playDraw(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  snap(ac, t, 0.03, 0.10);
  tone(ac, 660, t,        0.08, 'triangle', 0.22);
  tone(ac, 880, t + 0.07, 0.08, 'triangle', 0.18);
}

/** じゃんけん: 「じゃん」第1拍 */
export function playJankenJan(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  snap(ac, t, 0.04, 0.13);
  tone(ac, 392, t, 0.09, 'triangle', 0.26);
}

/** じゃんけん: 「けん」第2拍 */
export function playJankenKen(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  snap(ac, t, 0.04, 0.13);
  tone(ac, 440, t, 0.09, 'triangle', 0.26);
}

/** じゃんけん: 「ぽん！」最終拍（一番大きい） */
export function playJankenPonFinal(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  kick(ac, t, 0.50);
  snap(ac, t, 0.08, 0.22);
  tone(ac, 523, t,        0.28, 'triangle', 0.34);
  tone(ac, 659, t + 0.09, 0.18, 'sine',     0.16);
}

/** じゃんけんカウントダウン: じゃん・けん・ぽん！（3拍・まとめ版） */
export function playJankenPon(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // じゃん
  snap(ac, t, 0.05, 0.14);
  tone(ac, 392, t,       0.09, 'triangle', 0.26);  // G4
  // けん
  snap(ac, t + 0.40, 0.05, 0.14);
  tone(ac, 392, t + 0.40, 0.09, 'triangle', 0.26);
  // ぽん！（強め + キック）
  kick(ac, t + 0.80, 0.46);
  snap(ac, t + 0.80, 0.08, 0.22);
  tone(ac, 523, t + 0.80, 0.24, 'triangle', 0.32);  // C5 上げる
  tone(ac, 659, t + 0.88, 0.16, 'sine',     0.14);  // E5 残響
}

/** じゃんけん勝ち音: キック + 明るいアルペジオ */
export function playJankenWin(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  kick(ac, t, 0.44);
  snap(ac, t, 0.06, 0.20);
  tone(ac, 523,  t + 0.02, 0.09, 'triangle', 0.24);
  tone(ac, 659,  t + 0.09, 0.09, 'triangle', 0.24);
  tone(ac, 784,  t + 0.16, 0.09, 'triangle', 0.24);
  tone(ac, 1047, t + 0.23, 0.40, 'triangle', 0.28);
  tone(ac, 1319, t + 0.23, 0.34, 'sine',     0.14);
  tone(ac, 1568, t + 0.34, 0.18, 'sine',     0.09);
}

/** じゃんけん負け音: 穏やかな2段落下（怖くない） */
export function playJankenLose(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  sweep(ac, 440, 220, t,        0.16, 'triangle', 0.24);
  sweep(ac, 350, 175, t + 0.20, 0.20, 'sine',     0.16);
}

/** あいこ音: 同音2連ポップ */
export function playJankenDraw(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  snap(ac, t, 0.04, 0.10);
  tone(ac, 494, t,        0.08, 'triangle', 0.22);  // B4
  tone(ac, 494, t + 0.16, 0.08, 'triangle', 0.16);
}

/** たまなげ: カートゥーン「ヒュッ！」投球音 */
export function playToss(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  sweep(ac, 280, 1100, t,        0.10, 'sawtooth', 0.20);
  sweep(ac, 900, 220,  t + 0.10, 0.16, 'sine',     0.14);
  snap(ac, t, 0.04, 0.12);
}

/** たまなげ: 着地の「ポスッ」＋バウンス小音 */
export function playLand(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  kick(ac, t, 0.36);
  // バウンス感
  tone(ac, 270, t + 0.09, 0.07, 'sine', 0.16);
  tone(ac, 340, t + 0.14, 0.05, 'sine', 0.10);
}

/** ゲージ停止: カチッ！＋ティン */
export function playGaugeStop(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  snap(ac, t, 0.04, 0.20);
  tone(ac, 1400, t + 0.01, 0.10, 'sine', 0.14);
  tone(ac, 700,  t + 0.01, 0.08, 'sine', 0.08);
}

// ── すごろく ──────────────────────────────────────────────────────────────────

/** サイコロを振る: カラカラ→ストップ */
export function playDiceRoll(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // カラカラ感：ノイズバーストを複数
  for (let i = 0; i < 5; i++) {
    snap(ac, t + i * 0.07, 0.04, 0.14 - i * 0.02);
    tone(ac, 320 + i * 40, t + i * 0.07, 0.04, 'square', 0.07);
  }
  // 止まる「コトン」
  kick(ac, t + 0.40, 0.28);
  tone(ac, 440, t + 0.40, 0.09, 'triangle', 0.18);
}

/** コマがマスに止まる: ポコッ */
export function playTokenStep(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 520, t, 0.06, 'triangle', 0.16);
  tone(ac, 260, t, 0.05, 'sine',     0.10);
}

/** ラッキーマス: きらきら上昇 */
export function playLucky(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  snap(ac, t, 0.05, 0.18);
  tone(ac, 523,  t + 0.00, 0.09, 'triangle', 0.24);
  tone(ac, 659,  t + 0.07, 0.09, 'triangle', 0.24);
  tone(ac, 784,  t + 0.14, 0.09, 'triangle', 0.24);
  tone(ac, 1047, t + 0.21, 0.36, 'triangle', 0.28);
  tone(ac, 1319, t + 0.21, 0.30, 'sine',     0.14);
  tone(ac, 2093, t + 0.32, 0.18, 'sine',     0.09);
}

/** バッドマス: ずずんと落下 */
export function playBadSquare(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  sweep(ac, 350, 160, t,        0.20, 'triangle', 0.24);
  sweep(ac, 280, 120, t + 0.22, 0.24, 'sine',     0.16);
  tone(ac, 110, t + 0.40, 0.18, 'sine', 0.12);
}

/** ミニゲーム開始ファンファーレ */
export function playMiniGameStart(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  kick(ac, t, 0.50);
  snap(ac, t, 0.07, 0.20);
  tone(ac, 392,  t + 0.00, 0.09, 'triangle', 0.26);
  tone(ac, 523,  t + 0.08, 0.09, 'triangle', 0.26);
  tone(ac, 659,  t + 0.16, 0.09, 'triangle', 0.26);
  tone(ac, 784,  t + 0.24, 0.42, 'triangle', 0.30);
  tone(ac, 988,  t + 0.24, 0.36, 'sine',     0.14);
}

/** トランプ カードをひく */
export function playCardFlip(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  sweep(ac, 800, 1400, t, 0.08, 'sawtooth', 0.14);
  snap(ac, t + 0.06, 0.04, 0.12);
  tone(ac, 660, t + 0.08, 0.12, 'triangle', 0.16);
}

/** トランプ 勝ち */
export function playTrumpWin(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  kick(ac, t, 0.40);
  snap(ac, t, 0.05, 0.18);
  tone(ac, 523,  t + 0.02, 0.09, 'triangle', 0.22);
  tone(ac, 659,  t + 0.09, 0.09, 'triangle', 0.22);
  tone(ac, 784,  t + 0.16, 0.36, 'triangle', 0.26);
  tone(ac, 1047, t + 0.16, 0.30, 'sine',     0.13);
}

/** トランプ 負け（穏やか） */
export function playTrumpLose(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  sweep(ac, 440, 330, t,        0.18, 'triangle', 0.22);
  sweep(ac, 330, 220, t + 0.22, 0.22, 'sine',     0.14);
}

/** トランプ あいこ */
export function playTrumpDraw(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  snap(ac, t, 0.04, 0.10);
  tone(ac, 494, t,        0.09, 'triangle', 0.20);
  tone(ac, 494, t + 0.16, 0.09, 'triangle', 0.14);
  tone(ac, 523, t + 0.30, 0.12, 'triangle', 0.18);
}

/** ゴール到着: 豪華ファンファーレ */
export function playGoalReached(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  kick(ac, t, 0.60);
  snap(ac, t, 0.09, 0.26);
  // アルペジオ
  const notes = [523, 659, 784, 1047, 1319, 1568];
  notes.forEach((f, i) => tone(ac, f, t + 0.03 + i * 0.08, 0.18, 'triangle', 0.24));
  // 和音
  tone(ac, 1047, t + 0.52, 0.60, 'triangle', 0.22);
  tone(ac, 1319, t + 0.52, 0.54, 'sine',     0.14);
  tone(ac, 1568, t + 0.52, 0.48, 'sine',     0.10);
  // スパークル
  snap(ac, t + 0.50, 0.12, 0.16);
  tone(ac, 2093, t + 0.60, 0.20, 'sine', 0.08);
  tone(ac, 2637, t + 0.66, 0.16, 'sine', 0.06);
}
