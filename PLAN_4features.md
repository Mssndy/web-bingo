# 実装プラン：未就学児向け4機能

> このファイルは実装セッション用の設計書。読んでそのまま実装に入ること。

---

## 概要

| # | 機能 | 一言説明 |
|---|------|---------|
| 1 | セッション完了 | 5問正解でおわり！画面へ遷移 |
| 2 | シール集め | 完了ごとに1枚、シール帳が埋まる |
| 3 | TTS音声フィードバック | 正解・不正解を声で読み上げ |
| 4 | マスコット🐰 | 正解・不正解・完了でリアクション |

対象画面：**EasyGameScreen**（かんたん学ぼう）と **CharPracticeGameScreen**（もじモード練習）

---

## 1. ファイル変更一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `components/ui/Mascot.tsx` | うさぎマスコット（状態別アニメーション） |
| `components/screens/SessionCompleteScreen.tsx` | セッション完了お祝い画面 |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `lib/speech.ts` | `speakFeedback()` 追加 |
| `lib/storage.ts` | シール枚数の保存/取得関数追加 |
| `app/globals.css` | マスコット用 keyframe アニメーション追加 |
| `lib/types.ts` | AppScreen に `'session-complete'` 追加 |
| `components/screens/EasyGameScreen.tsx` | 4機能すべて組み込み |
| `components/screens/CharPracticeGameScreen.tsx` | 4機能すべて組み込み |
| `components/screens/NameEntryScreen.tsx` | シール帳プレビューを追加 |
| `components/BingoApp.tsx` | session-complete 画面の routing 追加 |

---

## 2. 各ファイルの詳細設計

---

### `lib/speech.ts` への追加

```typescript
const FEEDBACK_LINES = {
  correct:  ['すごい！', 'やったね！', 'せいかい！', 'よくできました！'],
  newbest:  ['さいこう！', 'あたらしいきろく！', 'すごすぎる！'],
  wrong:    ['おしい！', 'もう一回！', 'ドンマイ！'],
  complete: ['ぜんぶできたよ！', 'やったー！', 'かんぺき！'],
} as const;

export function speakFeedback(type: keyof typeof FEEDBACK_LINES, locale = 'ja-JP') {
  const lines = FEEDBACK_LINES[type];
  const text = lines[Math.floor(Math.random() * lines.length)];
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = locale;
  utter.rate = 0.85;
  utter.pitch = 1.3;  // 少し高めで子供向け
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}
```

---

### `lib/storage.ts` への追加

```typescript
// ── シール ──────────────────────────────────────────────────────────────────

export function getStickerCount(playerName: string): number {
  return parseInt(localStorage.getItem(`stickers_${playerName}`) ?? '0', 10);
}

export function addSticker(playerName: string): number {
  const next = getStickerCount(playerName) + 1;
  localStorage.setItem(`stickers_${playerName}`, String(next));
  return next;
}
```

---

### `lib/types.ts` への追加

`AppScreen` union に `'session-complete'` を追加するだけ。

---

### `app/globals.css` への追加（keyframes）

```css
@keyframes mascot-idle {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%       { transform: translateY(-6px) rotate(3deg); }
}
@keyframes mascot-happy {
  0%   { transform: scale(1) translateY(0); }
  40%  { transform: scale(1.4) translateY(-16px) rotate(-10deg); }
  70%  { transform: scale(1.2) translateY(-8px) rotate(8deg); }
  100% { transform: scale(1) translateY(0) rotate(0deg); }
}
@keyframes mascot-veryhappy {
  0%   { transform: scale(1) rotate(0deg); }
  25%  { transform: scale(1.5) rotate(-15deg); }
  50%  { transform: scale(1.6) rotate(15deg); }
  75%  { transform: scale(1.4) rotate(-8deg); }
  100% { transform: scale(1) rotate(0deg); }
}
@keyframes mascot-encourage {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25%       { transform: translateX(-5px) rotate(-8deg); }
  75%       { transform: translateX(5px) rotate(8deg); }
}
```

---

### `components/ui/Mascot.tsx`

```tsx
'use client';

export type MascotState = 'idle' | 'happy' | 'veryHappy' | 'encourage';

interface Props {
  state?: MascotState;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = { sm: '2.5rem', md: '3.5rem', lg: '5rem' };

const ANIM: Record<MascotState, string> = {
  idle:      'animate-[mascot-idle_2.5s_ease-in-out_infinite]',
  happy:     'animate-[mascot-happy_0.55s_cubic-bezier(0.34,1.56,0.64,1)_both]',
  veryHappy: 'animate-[mascot-veryhappy_0.7s_ease-in-out_both]',
  encourage: 'animate-[mascot-encourage_0.5s_ease-in-out_both]',
};

export default function Mascot({ state = 'idle', size = 'md' }: Props) {
  return (
    <span
      key={state}   // key変更でアニメーション再トリガー
      className={`leading-none select-none inline-block ${ANIM[state]}`}
      style={{ fontSize: SIZE[size] }}
      aria-hidden
    >
      🐰
    </span>
  );
}
```

---

### `components/screens/SessionCompleteScreen.tsx`

Props:
```typescript
interface Props {
  playerName: string;
  correctCount: number;       // このセッションの正解数（= SESSION_GOAL）
  stickerCount: number;       // 追加後の合計シール枚数
  mode: 'easy' | 'char-practice';
  onPlayAgain: () => void;
  onHome: () => void;
}
```

レイアウト（上から）:
1. マスコット `veryHappy` size=`lg` ── アニメ中心に大きく
2. 「ぜんぶできたよ！🎉」大テキスト
3. 「きょうは {correctCount}もん できたね！」
4. シール獲得バッジ「シール +1 🌟」bounce-in
5. シール帳ミニ表示（下記 StickerMini コンポーネント）
6. ボタン2つ: 「もう一回！」/ 「ホームへ」

```tsx
// StickerMini: 5×5グリッド、stickerCount枚だけ🌟を表示
function StickerMini({ count }: { count: number }) {
  const TOTAL = 25;
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
      {Array.from({ length: TOTAL }).map((_, i) => (
        <span key={i} className="text-xl text-center leading-none">
          {i < count % TOTAL || (count >= TOTAL && count % TOTAL === 0 && i < TOTAL)
            ? '🌟'
            : '⬜'}
        </span>
      ))}
    </div>
  );
}
```

**注意**: `count % TOTAL` で25枚超えたら新しいページ扱いに。
25の倍数のときは全マス埋まった状態で表示 → 特別演出のテキスト「シールがいっぱい！✨」を表示。

---

### `BingoApp.tsx` への変更

#### 追加する state
```typescript
const [sessionResult, setSessionResult] = useState<{
  correctCount: number;
  stickerCount: number;
  mode: 'easy' | 'char-practice';
} | null>(null);
```

#### 既存の onHome をそのまま使う形で session-complete 画面を挟む

```typescript
// EasyGameScreen から呼ばれる新しいコールバック
function handleSessionComplete(correctCount: number, mode: 'easy' | 'char-practice') {
  const stickerCount = addSticker(playerName);
  setSessionResult({ correctCount, stickerCount, mode });
  setScreen('session-complete');
}
```

#### 画面追加（JSX）
```tsx
{screen === 'session-complete' && sessionResult && (
  <SessionCompleteScreen
    playerName={playerName}
    correctCount={sessionResult.correctCount}
    stickerCount={sessionResult.stickerCount}
    mode={sessionResult.mode}
    onPlayAgain={() => setScreen(sessionResult.mode === 'easy' ? 'easy' : 'char-practice')}
    onHome={() => { setSessionResult(null); setScreen('name-entry'); }}
  />
)}
```

---

### `EasyGameScreen.tsx` への変更

#### 追加する定数・state
```typescript
const SESSION_GOAL = 5;

// 追加 state
const [sessionCorrect, setSessionCorrect] = useState(0);
const [mascotState, setMascotState] = useState<MascotState>('idle');
```

#### Props に追加
```typescript
interface Props {
  playerName: string;
  settings: EasySettings;
  onHome: () => void;
  onSessionComplete: (correctCount: number) => void; // 追加
}
```

#### handleChoice の変更
```typescript
if (choice === problem.answer) {
  const newStreak = streak + 1;
  const newSessionCorrect = sessionCorrect + 1;
  setStreak(newStreak);
  setSessionCorrect(newSessionCorrect);

  if (newStreak > bestStreak) {
    setBestStreak(newStreak);
    saveEasyBestStreak(playerName, newStreak);
    playNewBest();
    speakFeedback('newbest');
    setMascotState('veryHappy');
    setFeedback('newbest');
  } else {
    playCorrect();
    speakFeedback('correct');
    setMascotState('happy');
    setFeedback('correct');
  }

  // セッション完了チェック
  if (newSessionCorrect >= SESSION_GOAL) {
    // 少し遅らせてからセッション完了へ（アニメを見せるため）
    setTimeout(() => onSessionComplete(SESSION_GOAL), 1800);
  }
} else {
  playWrong();
  speakFeedback('wrong');
  setMascotState('encourage');
  setStreak(0);
  setFeedback('wrong');
}
```

#### マスコット・フィードバック後は idle に戻す
```typescript
// feedbackが変わったあと idle に戻す
useEffect(() => {
  if (mascotState !== 'idle') {
    const t = setTimeout(() => setMascotState('idle'), 800);
    return () => clearTimeout(t);
  }
}, [mascotState]);
```

#### セッション進捗バー（JSXに追加、ストリークカウンターの上）
```tsx
{/* セッション進捗 */}
<div className="flex items-center gap-2">
  <span className="text-xs font-black text-gray-400 shrink-0">きょう</span>
  <div className="flex-1 flex gap-1">
    {Array.from({ length: SESSION_GOAL }).map((_, i) => (
      <div
        key={i}
        className="flex-1 h-3 rounded-full transition-all duration-300"
        style={{
          background: i < sessionCorrect
            ? 'var(--color-bingo-green)'
            : '#e5e7eb',
        }}
      />
    ))}
  </div>
  <span className="text-xs font-black text-gray-400 shrink-0">
    {sessionCorrect}/{SESSION_GOAL}
  </span>
</div>
```

#### マスコット配置（フィードバックバナーの左横に小さく）
フィードバック部分を横並びに:
```tsx
{feedback && (
  <div className="flex items-center gap-3">
    <Mascot state={mascotState} size="sm" />
    <div className="flex-1">
      {/* 既存のフィードバックバナー */}
    </div>
  </div>
)}
// feedback=null のときはマスコットだけ表示
{!feedback && <div className="flex justify-center"><Mascot state="idle" size="sm" /></div>}
```

---

### `CharPracticeGameScreen.tsx` への変更

EasyGameScreen と同じ変更。差分だけ:
- `speakFeedback` の locale は `CHAR_LOCALE[settings.contentType]` を使う（ja-JP）
- `onSessionComplete` prop 追加
- 同じ進捗バー・マスコット・SESSION_GOAL=5

---

### `NameEntryScreen.tsx` への変更

シール帳プレビューをホーム画面に追加。

```typescript
// Props に追加
stickerCount: number;
```

#### JSXに追加（ランキングボタンの近く）
```tsx
{stickerCount > 0 && (
  <div
    className="flex items-center gap-3 px-3 py-2 rounded-2xl"
    style={{ background: 'white', border: '2px solid rgba(255,217,61,0.6)' }}
  >
    <span className="text-2xl">🌟</span>
    <div>
      <p className="text-xs font-bold text-gray-400">シールちょう</p>
      <p className="text-lg font-black" style={{ color: 'var(--color-bingo-orange)' }}>
        {stickerCount}まい
      </p>
    </div>
    {/* ミニプレビュー: 最新5枚 */}
    <div className="flex gap-0.5 ml-auto">
      {Array.from({ length: Math.min(stickerCount % 25 || (stickerCount > 0 ? 25 : 0), 5) }).map((_, i) => (
        <span key={i} className="text-base">🌟</span>
      ))}
    </div>
  </div>
)}
```

`BingoApp.tsx` で `getStickerCount(playerName)` を呼んで NameEntryScreen に渡す。

---

## 3. 実装の順番

1. `app/globals.css` — keyframes 追加（5分）
2. `lib/speech.ts` — speakFeedback 追加（5分）
3. `lib/storage.ts` — sticker 関数追加（5分）
4. `lib/types.ts` — AppScreen 追加（2分）
5. `components/ui/Mascot.tsx` — 新規作成（15分）
6. `components/screens/SessionCompleteScreen.tsx` — 新規作成（20分）
7. `components/screens/EasyGameScreen.tsx` — 4機能統合（20分）
8. `components/screens/CharPracticeGameScreen.tsx` — 4機能統合（15分）
9. `components/screens/NameEntryScreen.tsx` — シール表示追加（10分）
10. `components/BingoApp.tsx` — routing + sticker count 追加（15分）
11. git commit & push

---

## 4. 確認が必要な既存ファイル

実装前に必ず読むもの:
- `app/globals.css` — 既存アニメーション名の確認（衝突防止）
- `lib/speech.ts` — 既存の speakChar 実装確認
- `lib/storage.ts` — 既存の関数パターン確認
- `components/BingoApp.tsx` — 現在の screen routing 全体確認

---

## 5. 設計上の判断メモ

- **SESSION_GOAL = 5** は定数。設定可能にする必要なし（シンプルさ優先）
- **マスコット emoji = 🐰**（うさぎ）。変更する場合は Mascot.tsx の1行だけ
- **シール25枚でリセット** でなく、累計カウントを保持してページ数で管理。25枚ごとに「シールいっぱい！」
- **speakFeedback は speakChar をキャンセルしない**。別のコンテキストで呼ばれるため `cancel()` を先頭に入れる
- **SessionComplete への遷移は1800ms遅延**（最後の正解アニメを見せてから）
- **もう一回はセッション正解カウントをリセット**して同じ画面に戻る（EasyGame/CharPracticeGame の useEffect が playerName/settings を見てリセットするか、onPlayAgain で screen を一度離れてから戻る方が確実）

---

---

## 6. サーバーサイド永続化

> 4機能実装の**後に**実施する。独立した機能追加なので順番は変えられる。

---

### 目的

| 課題 | 解決 |
|------|------|
| デバイスを変えると記録が消える | サーバーに保存 → どこからでも見れる |
| ランキングが自分のデバイス内だけ | グローバルランキング化 |
| シール枚数・ベストスコアが消える | サーバーに永続化 |

---

### 技術選定：Upstash Redis

**なぜ Redis か**
- ランキング = Sorted Set（スコア順取得がネイティブ）
- シール・ストリーク = 単純な String key-value
- 書き込みレイテンシが低い（ゲーム中のfire-and-forgetに向く）
- REST API なので Edge Runtime でも動く

**なぜ Upstash か**
- Vercel 以外でも動く（Vercel KV は Vercel 専用）
- Free tier：10,000 commands/day、256MB → このアプリで余裕
- `@upstash/redis` パッケージ1つで完結
- セットアップ：console.upstash.com で5分

---

### データモデル（Redis keys）

```
# ランキング（Sorted Set）
ranking:{mode}
  member = JSON.stringify({ playerName, ts })
  score  = score (数値)
  例) ZADD ranking:easy 15 '{"playerName":"かず","ts":1700000000000}'

# ベストスコア（String）
streak:practice:{playerName}        → "42"
streak:easy:{playerName}            → "15"
streak:char:{contentType}:{player}  → "8"

# シール枚数（String）
stickers:{playerName}               → "12"
```

`ranking:{mode}` の Sorted Set は上位 500 件を保持（ZREMRANGEBYRANK で古いものを削除）。

---

### 基本方針：localStorage をキャッシュとして維持

**壊してはいけない前提**：オフラインでも動く。

```
書き込み:  localStorage に即時書き込み  →  サーバーに fire-and-forget（失敗しても無視）
読み込み:  localStorage から即時表示   →  バックグラウンドでサーバーから取得・マージ
```

既存のゲームロジックは **一切変えない**。サーバー同期は lib 層に隠蔽する。

---

### 新規作成ファイル

#### `lib/db.ts`（サーバーサイドのみ）

```typescript
import { Redis } from '@upstash/redis';

// サーバーサイド専用（API route からのみ import）
export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

#### `app/api/rankings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/db';

// GET /api/rankings?mode=easy&period=week&limit=20
export async function GET(req: NextRequest) {
  const mode   = req.nextUrl.searchParams.get('mode') ?? 'easy';
  const period = req.nextUrl.searchParams.get('period') ?? 'all';
  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 50);

  const cutoff = period === 'day'  ? Date.now() - 86400_000
               : period === 'week' ? Date.now() - 604800_000
               : 0;

  // ZRANGE ... BYSCORE ... LIMIT — 上位をスコア降順で取得
  const raw = await redis.zrange(`ranking:${mode}`, '+inf', cutoff, {
    byScore: true, rev: true, limit: { offset: 0, count: limit },
    withScores: true,
  });

  const entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    const meta  = JSON.parse(raw[i] as string);
    const score = raw[i + 1] as number;
    entries.push({ ...meta, score, mode });
  }

  return NextResponse.json(entries);
}

// POST /api/rankings  body: { playerName, score, mode }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerName, score, mode } = body;

  // バリデーション
  if (typeof playerName !== 'string' || playerName.length > 10) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (typeof score !== 'number' || score <= 0 || score > 9999) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const key    = `ranking:${mode}`;
  const member = JSON.stringify({ playerName, ts: Date.now() });

  await redis.zadd(key, { score, member });
  // 上位500件に制限（古い低スコアを削除）
  await redis.zremrangebyrank(key, 0, -501);

  return NextResponse.json({ ok: true });
}
```

#### `app/api/records/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/db';

// GET /api/records?player=かず
// → { "streak:practice": 42, "streak:easy": 15, "stickers": 3, ... }
export async function GET(req: NextRequest) {
  const player = req.nextUrl.searchParams.get('player');
  if (!player || player.length > 10) {
    return NextResponse.json({});
  }

  const keys = [
    `streak:practice:${player}`,
    `streak:easy:${player}`,
    `streak:char:hiragana:${player}`,
    `streak:char:katakana:${player}`,
    `streak:char:alphabet:${player}`,
    `stickers:${player}`,
  ];

  const values = await redis.mget(...keys);
  const result: Record<string, number> = {};
  keys.forEach((k, i) => {
    if (values[i] != null) {
      result[k] = parseInt(String(values[i]), 10);
    }
  });

  return NextResponse.json(result);
}

// POST /api/records  body: { playerName, key, value }
// key例: "streak:easy" / "stickers"
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerName, key, value } = body;

  if (typeof playerName !== 'string' || playerName.length > 10) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (typeof value !== 'number' || value < 0 || value > 99999) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const ALLOWED_KEYS = ['streak:practice', 'streak:easy',
    'streak:char:hiragana', 'streak:char:katakana', 'streak:char:alphabet', 'stickers'];
  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const fullKey = `${key}:${playerName}`;
  // サーバーは常に最大値を保持（デバイス間で大きい方を勝たせる）
  const current = parseInt(String(await redis.get(fullKey) ?? '0'), 10);
  if (value > current) {
    await redis.set(fullKey, String(value));
  }

  return NextResponse.json({ ok: true });
}
```

#### `lib/api.ts`（クライアントサイド fetch ラッパー）

```typescript
import type { RankEntry, RankGameMode, RankPeriod } from './ranking';

// fire-and-forget — エラーは握り潰す（オフライン時も動くように）
export function pushRankEntryToServer(entry: Omit<RankEntry, 'ts'>): void {
  fetch('/api/rankings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch(() => {});
}

export function pushRecordToServer(playerName: string, key: string, value: number): void {
  fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName, key, value }),
  }).catch(() => {});
}

// ランキング取得（Promise — 呼び元で await）
export async function fetchRankingsFromServer(
  mode: RankGameMode,
  period: RankPeriod,
): Promise<RankEntry[]> {
  const res = await fetch(`/api/rankings?mode=${mode}&period=${period}&limit=20`);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
}

// プレイヤーの記録取得（起動時に一度だけ呼ぶ）
export async function fetchRecordsFromServer(
  playerName: string,
): Promise<Record<string, number>> {
  const res = await fetch(`/api/records?player=${encodeURIComponent(playerName)}`);
  if (!res.ok) return {};
  return res.json();
}
```

#### `.env.local.example`

```
# Upstash Redis（console.upstash.com で作成）
UPSTASH_REDIS_REST_URL=https://xxxxxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXxxxxxxxxxx

# ホスティング先（Vercel等）にも同じ変数を設定すること
```

---

### 変更ファイル

#### `lib/ranking.ts` への変更

`saveRankEntry` の末尾に1行追加するだけ：

```typescript
import { pushRankEntryToServer } from './api';

export function saveRankEntry(entry: Omit<RankEntry, 'ts'>): void {
  if (typeof window === 'undefined') return;
  if (entry.score <= 0) return;

  // 既存 localStorage 処理（変更なし）
  const all = loadAllRankEntries();
  all.push({ ...entry, ts: Date.now() });
  all.sort((a, b) => b.score - a.score);
  localStorage.setItem(RANK_KEY, JSON.stringify(all.slice(0, MAX_TOTAL)));

  // ↓ 追加（fire-and-forget）
  pushRankEntryToServer(entry);
}
```

`RankingScreen` でサーバーから取得してローカルにマージする関数を追加：

```typescript
export async function refreshRankingsFromServer(
  mode: RankGameMode,
  period: RankPeriod,
): Promise<void> {
  try {
    const serverEntries = await fetchRankingsFromServer(mode, period);
    if (!serverEntries.length) return;

    // localStorage のデータとマージ（サーバーデータを優先）
    const local = loadAllRankEntries().filter(
      e => !(e.mode === mode && serverEntries.some(s => s.playerName === e.playerName && s.ts === e.ts))
    );
    const merged = [...local, ...serverEntries]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_TOTAL);

    localStorage.setItem(RANK_KEY, JSON.stringify(merged));
  } catch {
    // サーバー取得失敗はサイレントに無視
  }
}
```

#### `lib/storage.ts` への変更

`saveBestStreak`、`saveEasyBestStreak`、`saveCharBestStreak` それぞれに push を追加：

```typescript
import { pushRecordToServer } from './api';

export function saveBestStreak(playerName: string, streak: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STREAK_KEY_PREFIX}${playerName}`, String(streak));
  pushRecordToServer(playerName, 'streak:practice', streak); // ← 追加
}

// saveEasyBestStreak → 'streak:easy'
// saveCharBestStreak → `streak:char:${contentType}`
```

サーバーから記録をロードして localStorage を上書きする関数を追加：

```typescript
export async function syncRecordsFromServer(playerName: string): Promise<void> {
  try {
    const records = await fetchRecordsFromServer(playerName);
    // サーバーの値がローカルより大きければ上書き
    for (const [fullKey, value] of Object.entries(records)) {
      const lsKey = fullKey.replace(`:${playerName}`, '').replace('streak:', STREAK_KEY_PREFIX);
      // ... 各キーをマッピングして localStorage を更新
    }
  } catch {}
}
```

> **実装時の注意**: キーのマッピングが少し複雑なので、実装時に storage.ts の既存キーを見ながら慎重に対応させること。

#### `components/screens/RankingScreen.tsx` への変更

```typescript
// マウント時にサーバーからリフレッシュ
useEffect(() => {
  refreshRankingsFromServer(activeMode, period)
    .then(() => setEntries(getTopEntries(activeMode, period)));
}, [activeMode, period]);
```

#### `components/BingoApp.tsx` への変更

アプリ起動時（playerName が決まった時点）に一度だけサーバー同期：

```typescript
function handleNameSubmit(name: string) {
  setPlayerName(name);
  syncRecordsFromServer(name).catch(() => {}); // fire-and-forget
}
```

---

### セットアップ手順（実装前に確認）

```bash
# 1. パッケージインストール
npm install @upstash/redis

# 2. Upstash コンソールで Redis DB を作成
#    https://console.upstash.com → Create Database → Region: Japan (ap-northeast-1)

# 3. 環境変数を設定
cp .env.local.example .env.local
# UPSTASH_REDIS_REST_URL と TOKEN を貼り付け

# 4. Vercel / ホスティング先にも同じ環境変数を設定
```

---

### 実装順序（機能1〜4の後）

| ステップ | 作業 | 所要 |
|---------|------|------|
| 11 | `npm install @upstash/redis` + `.env.local` 作成 | 5分 |
| 12 | `lib/db.ts` | 5分 |
| 13 | `app/api/rankings/route.ts` | 15分 |
| 14 | `app/api/records/route.ts` | 15分 |
| 15 | `lib/api.ts` | 10分 |
| 16 | `lib/ranking.ts` に push + refresh 追加 | 15分 |
| 17 | `lib/storage.ts` に push + sync 追加 | 15分 |
| 18 | `RankingScreen.tsx` に useEffect refresh 追加 | 10分 |
| 19 | `BingoApp.tsx` に起動時 syncRecords 追加 | 5分 |
| 20 | ローカルテスト → git commit & push | 10分 |

---

_このファイルは実装完了後に削除してよい_
