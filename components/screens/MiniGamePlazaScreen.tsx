'use client';

interface GameCard {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  gradient: string;
  border: string;
  anim: string;
  onSelect?: () => void;
  comingSoon?: boolean;
}

interface Props {
  playerName: string;
  onHome: () => void;
  onJanken: () => void;
  onToss: () => void;
}

export default function MiniGamePlazaScreen({ playerName, onHome, onJanken, onToss }: Props) {
  const GAMES: GameCard[] = [
    {
      id: 'janken',
      emoji: '✊',
      label: 'じゃんけん',
      desc: '石・はさみ・紙で\nあそぼう！',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'rgba(102,126,234,0.6)',
      anim: 'float-bob-1 3.8s ease-in-out infinite',
      onSelect: onJanken,
    },
    {
      id: 'toss',
      emoji: '⚾',
      label: 'たまなげビンゴ',
      desc: 'ボールをなげて\nビンゴをねらえ！',
      gradient: 'linear-gradient(135deg, #ff922b 0%, #e03131 100%)',
      border: 'rgba(224,49,49,0.6)',
      anim: 'float-bob-2 4.2s ease-in-out infinite 0.7s',
      onSelect: onToss,
    },
    {
      id: 'coming2',
      emoji: '🌟',
      label: 'もうすぐ！',
      desc: 'たのしみに\nしててね！',
      gradient: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
      border: 'rgba(148,163,184,0.4)',
      anim: 'float-bob-3 3.5s ease-in-out infinite 1.4s',
      comingSoon: true,
    },
  ];

  return (
    <div className="flex flex-col items-center gap-3 py-4 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="w-full max-w-sm px-4 flex items-center justify-between">
        <button
          onClick={onHome}
          className="text-2xl p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all"
          aria-label="ホームにもどる"
        >
          🏠
        </button>
        <div className="w-10" />
      </div>

      {/* Title */}
      <div className="text-center px-4">
        <h2
          className="text-2xl font-black tracking-wide drop-shadow-sm"
          style={{
            background: 'linear-gradient(90deg, #667eea 0%, #cc5de8 50%, #ff6b9d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          🎮 ミニゲーム広場
        </h2>
        <p className="text-sm text-gray-400 font-bold mt-1">
          {playerName}、どのゲームであそぶ？✨
        </p>
      </div>

      {/* Game cards */}
      <div className="w-full max-w-sm px-4">
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((game) => (
            <button
              key={game.id}
              disabled={game.comingSoon}
              onClick={() => game.onSelect?.()}
              className="flex flex-col items-center justify-center gap-1.5 rounded-3xl py-5 px-2 shadow-lg active:scale-95 transition-all disabled:cursor-not-allowed relative overflow-hidden"
              style={{
                background: game.gradient,
                border: `3px solid ${game.border}`,
                animation: game.comingSoon ? undefined : game.anim,
                opacity: game.comingSoon ? 0.65 : 1,
              }}
            >
              {/* Shine overlay */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 55%)' }}
              />
              {game.comingSoon && (
                <div
                  className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-black text-white z-20"
                  style={{ background: 'rgba(0,0,0,0.25)' }}
                >
                  🔒
                </div>
              )}
              <span
                className="text-4xl leading-none relative z-10"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
              >
                {game.emoji}
              </span>
              <span className="text-xs font-black text-white leading-tight text-center relative z-10 drop-shadow">
                {game.label}
              </span>
              <span className="text-[10px] text-white/80 text-center whitespace-pre-line leading-snug relative z-10">
                {game.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
