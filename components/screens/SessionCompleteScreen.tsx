'use client';

import Mascot from '@/components/ui/Mascot';

interface Props {
  playerName: string;
  correctCount: number;
  stickerCount: number;
  mode: 'easy' | 'char-practice';
  onPlayAgain: () => void;
  onHome: () => void;
}

function StickerMini({ count }: { count: number }) {
  const TOTAL = 25;
  const filledCount = count % TOTAL === 0 && count > 0 ? TOTAL : count % TOTAL;
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
      {Array.from({ length: TOTAL }).map((_, i) => (
        <span key={i} className="text-xl text-center leading-none">
          {i < filledCount ? '🌟' : '⬜'}
        </span>
      ))}
    </div>
  );
}

export default function SessionCompleteScreen({
  playerName,
  correctCount,
  stickerCount,
  onPlayAgain,
  onHome,
}: Props) {
  const TOTAL = 25;
  const isFullPage = stickerCount % TOTAL === 0 && stickerCount > 0;

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-6 animate-[fade-in_0.3s_ease_both]">

      {/* Mascot */}
      <div className="flex justify-center">
        <Mascot state="veryHappy" size="lg" />
      </div>

      {/* Title */}
      <div className="text-center">
        <p
          className="text-4xl font-black animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          style={{ color: 'var(--color-bingo-pink)' }}
        >
          ぜんぶできたよ！🎉
        </p>
        <p className="text-lg font-bold text-gray-600 mt-2">
          きょうは <span className="font-black" style={{ color: 'var(--color-bingo-green)' }}>{correctCount}もん</span> できたね！
        </p>
        <p className="text-base font-bold text-gray-500 mt-1">
          <span className="font-black" style={{ color: 'var(--color-bingo-purple)' }}>{playerName}</span>
          ちゃん、すごい！
        </p>
      </div>

      {/* Sticker badge */}
      <div
        className="flex items-center gap-3 px-6 py-3 rounded-2xl border-4 animate-[bounce-in_0.6s_cubic-bezier(0.34,1.56,0.64,1)_0.2s_both]"
        style={{ background: 'var(--color-bingo-yellow)', borderColor: 'var(--color-bingo-orange)' }}
      >
        <span className="text-3xl">🌟</span>
        <div>
          <p className="text-xs font-bold text-gray-600">シールゲット！</p>
          <p className="text-2xl font-black" style={{ color: 'var(--color-bingo-orange)' }}>
            +1まい
          </p>
        </div>
        <div className="ml-2 text-center">
          <p className="text-xs font-bold text-gray-500">ごうけい</p>
          <p className="text-2xl font-black" style={{ color: 'var(--color-bingo-purple)' }}>
            {stickerCount}まい
          </p>
        </div>
      </div>

      {/* Sticker book mini */}
      <div
        className="w-full rounded-3xl border-4 p-4"
        style={{ background: 'white', borderColor: 'var(--color-bingo-blue)' }}
      >
        <p className="text-center text-sm font-black text-gray-500 mb-3">📒 シールちょう</p>
        {isFullPage && (
          <p
            className="text-center text-base font-black mb-2 animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
            style={{ color: 'var(--color-bingo-pink)' }}
          >
            シールがいっぱい！✨
          </p>
        )}
        <StickerMini count={stickerCount} />
        <p className="text-center text-xs text-gray-400 font-bold mt-2">
          {stickerCount}まい / {Math.ceil(stickerCount / 25) * 25}まい
        </p>
      </div>

      {/* Buttons */}
      <div className="w-full flex flex-col gap-3">
        <button
          onClick={onPlayAgain}
          className="w-full text-2xl font-black text-white rounded-2xl py-5 shadow-lg active:scale-95 transition-transform"
          style={{ background: 'var(--color-bingo-green)' }}
        >
          もう一回！ 🔄
        </button>
        <button
          onClick={onHome}
          className="w-full text-lg font-black text-gray-500 rounded-2xl py-4 border-4 active:scale-95 transition-transform bg-white"
          style={{ borderColor: '#e5e7eb' }}
        >
          🏠 ホームへ
        </button>
      </div>
    </div>
  );
}
