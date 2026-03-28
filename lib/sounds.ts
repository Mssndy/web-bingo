/**
 * Simple Web Audio API sound effects — no external files needed.
 * All sounds are triggered by user interaction, so AudioContext suspension
 * is not an issue.
 */

type OscType = OscillatorType;

function makeCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new AudioContext();
  } catch {
    return null;
  }
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscType = 'sine',
  vol = 0.28,
) {
  const osc = ac.createOscillator();
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

/** 正解音: C5→E5→G5 の明るいアルペジオ */
export function playCorrect(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 523, t,        0.12);
  tone(ac, 659, t + 0.1,  0.12);
  tone(ac, 784, t + 0.2,  0.22);
}

/** ベスト更新音: さらに高い音を加えた豪華版 */
export function playNewBest(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 523,  t,        0.1);
  tone(ac, 659,  t + 0.09, 0.1);
  tone(ac, 784,  t + 0.18, 0.1);
  tone(ac, 1047, t + 0.27, 0.28);
  // きらきらした高音
  tone(ac, 1319, t + 0.45, 0.2, 'sine', 0.18);
}

/** 不正解音: 穏やかな下降音（怖くない） */
export function playWrong(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 330, t,        0.1, 'sine', 0.2);
  tone(ac, 247, t + 0.12, 0.18, 'sine', 0.15);
}

/** ビンゴ音: C-E-G-C のファンファーレ */
export function playBingo(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 523,  t,        0.14);
  tone(ac, 659,  t + 0.12, 0.14);
  tone(ac, 784,  t + 0.24, 0.14);
  tone(ac, 1047, t + 0.36, 0.45);
  // ハーモニー
  tone(ac, 784,  t + 0.36, 0.45, 'sine', 0.15);
}

/** 抽選音: 軽いポップ音 */
export function playDraw(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 440, t, 0.07, 'sine', 0.18);
}

/** じゃんけんカウントダウン: じゃん・けん・ポン！の3拍リズム */
export function playJankenPon(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 392, t,        0.09, 'sine', 0.22); // G4 じゃん
  tone(ac, 392, t + 0.4,  0.09, 'sine', 0.22); // G4 けん
  tone(ac, 523, t + 0.8,  0.18, 'sine', 0.30); // C5 ポン！
}

/** じゃんけん勝ち音: 明るいファンファーレ */
export function playJankenWin(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 523,  t,        0.10);
  tone(ac, 659,  t + 0.09, 0.10);
  tone(ac, 784,  t + 0.18, 0.10);
  tone(ac, 1047, t + 0.27, 0.32);
}

/** じゃんけん負け音: 穏やかな下降（怖くない） */
export function playJankenLose(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 370, t,        0.12, 'sine', 0.20);
  tone(ac, 294, t + 0.14, 0.20, 'sine', 0.14);
}

/** たまなげ: 投げる瞬間のシュッという音 */
export function playToss(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(700, t);
  osc.frequency.exponentialRampToValueAtTime(130, t + 0.22);
  gain.gain.setValueAtTime(0.20, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.start(t);
  osc.stop(t + 0.24);
}

/** たまなげ: ゲージが止まったときのカチッという音 */
export function playGaugeStop(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 900, t,        0.03, 'square', 0.12);
  tone(ac, 650, t + 0.02, 0.05, 'sine',   0.10);
}

/** たまなげ: ボールが着地したときの「ポスッ」音 */
export function playLand(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 200, t,        0.05, 'sine', 0.28);
  tone(ac, 130, t + 0.04, 0.10, 'sine', 0.20);
}

/** じゃんけんあいこ音: ニュートラルなポップ×2 */
export function playJankenDraw(): void {
  const ac = makeCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 440, t,        0.08, 'sine', 0.20);
  tone(ac, 440, t + 0.16, 0.08, 'sine', 0.16);
}
