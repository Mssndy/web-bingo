/**
 * ループ BGM — Web Audio API で生成（外部音源ファイル不要）。
 * 明るく軽快なメロディを控えめな音量でループ再生する。
 * 効果音(lib/sounds.ts)のじゃまにならないよう、低めのミックスにしている。
 *
 * 自動再生制限を避けるため、必ずユーザー操作（ボタン押下）起点で start() を呼ぶこと。
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextTime = 0;
let step = 0;
let running = false;

const BPM = 128;
const STEP = 60 / BPM / 2; // 8分音符の長さ（秒）
const LOOKAHEAD = 0.12;    // 先読みスケジュール（秒）
const TICK_MS = 40;        // スケジューラ起動間隔
const BASE_VOL = 0.5;      // マスター音量（控えめ）

// 周波数(Hz)。0 は休符。32ステップ = 4小節 × 8分音符。
// あかるい C / G / Am / F のコード進行にのせた はずむメロディ。
const MELODY: number[] = [
  659, 0,   784, 0,   523, 0,   587, 659, // E5 G5 C5 D5 E5
  587, 0,   523, 0,   587, 0,   0,   0,
  698, 0,   784, 0,   880, 0,   784, 698, // F5 G5 A5 G5 F5
  659, 0,   587, 0,   523, 0,   0,   0,
];
const BASS: number[] = [
  131, 0, 0, 0, 131, 0, 0, 0, // C3
  98,  0, 0, 0, 98,  0, 0, 0, // G2
  110, 0, 0, 0, 110, 0, 0, 0, // A2
  87,  0, 0, 0, 98,  0, 0, 0, // F2 → G2
];

/** 1音を鳴らす（やわらかいアタック → 指数減衰） */
function voice(freq: number, start: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(master);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

/** 先読みで音をスケジュールする */
function schedule() {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    const m = MELODY[step % MELODY.length];
    const b = BASS[step % BASS.length];
    if (m) voice(m, nextTime, STEP * 1.6, 'triangle', 0.09);
    if (b) voice(b, nextTime, STEP * 3.2, 'sine', 0.13);
    // 各拍に軽いきざみ（リズム感）
    if (step % 2 === 0) voice(1300, nextTime, 0.03, 'square', 0.013);
    nextTime += STEP;
    step++;
  }
}

/** BGM 再生開始（ユーザー操作起点で呼ぶこと） */
export function startBgm(): void {
  if (running || typeof window === 'undefined') return;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    master = ctx.createGain();
    master.gain.value = BASE_VOL;
    master.connect(ctx.destination);
  }
  ctx.resume?.();
  if (master) master.gain.value = BASE_VOL;
  running = true;
  step = 0;
  nextTime = ctx.currentTime + 0.08;
  schedule();
  timer = setInterval(schedule, TICK_MS);
}

/** BGM 停止（やさしくフェードアウト） */
export function stopBgm(): void {
  if (!running) return;
  running = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (ctx && master) {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  }
}

export function isBgmRunning(): boolean {
  return running;
}
