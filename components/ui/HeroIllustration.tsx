'use client';

const R = 27; // ball radius

const BALLS = [
  { letter: 'B', cx: 46,  cy: 100, grad: 'ball-b', anim: 'float-bob-1 3.2s ease-in-out infinite' },
  { letter: 'I', cx: 107, cy: 56,  grad: 'ball-i', anim: 'float-bob-2 2.8s ease-in-out infinite 0.4s' },
  { letter: 'N', cx: 168, cy: 98,  grad: 'ball-n', anim: 'float-bob-3 3.5s ease-in-out infinite 0.8s' },
  { letter: 'G', cx: 230, cy: 54,  grad: 'ball-g', anim: 'float-bob-1 3.0s ease-in-out infinite 1.1s' },
  { letter: 'O', cx: 282, cy: 97,  grad: 'ball-o', anim: 'float-bob-2 3.3s ease-in-out infinite 1.5s' },
] as const;

const STARS = [
  { cx: 18,  cy: 30,  r: 3.5, anim: 'twinkle 2.1s ease-in-out infinite' },
  { cx: 75,  cy: 16,  r: 2.5, anim: 'twinkle 1.8s ease-in-out infinite 0.6s' },
  { cx: 140, cy: 24,  r: 4,   anim: 'twinkle 2.5s ease-in-out infinite 1.0s' },
  { cx: 198, cy: 14,  r: 2.5, anim: 'twinkle 1.6s ease-in-out infinite 0.3s' },
  { cx: 256, cy: 22,  r: 3,   anim: 'twinkle 2.2s ease-in-out infinite 0.9s' },
  { cx: 308, cy: 35,  r: 2,   anim: 'twinkle 1.9s ease-in-out infinite 1.4s' },
  { cx: 28,  cy: 145, r: 2.5, anim: 'twinkle 2.0s ease-in-out infinite 0.7s' },
  { cx: 300, cy: 148, r: 3,   anim: 'twinkle 2.3s ease-in-out infinite 0.2s' },
  { cx: 138, cy: 148, r: 2,   anim: 'twinkle 1.7s ease-in-out infinite 1.2s' },
  { cx: 70,  cy: 148, r: 2.5, anim: 'twinkle 2.4s ease-in-out infinite 0.5s' },
  { cx: 255, cy: 148, r: 2,   anim: 'twinkle 1.5s ease-in-out infinite 1.8s' },
];

// Tiny decorative symbols (math / sparkle)
const SYMBOLS = [
  { x: 10,  y: 80,  text: '＋', color: 'rgba(255,217,61,0.5)',  size: 16 },
  { x: 295, y: 75,  text: '×',  color: 'rgba(107,203,119,0.5)', size: 16 },
  { x: 74,  y: 138, text: '✦',  color: 'rgba(255,107,157,0.6)', size: 14 },
  { x: 226, y: 135, text: '✦',  color: 'rgba(77,150,255,0.6)',  size: 14 },
];

export default function HeroIllustration() {
  return (
    <div
      className="w-full rounded-3xl overflow-hidden shadow-lg"
      style={{ background: 'linear-gradient(145deg, #0d1b4b 0%, #1a0838 50%, #0b1840 100%)' }}
    >
      <svg viewBox="0 0 320 165" className="w-full h-auto" aria-hidden="true">
        <defs>
          <radialGradient id="ball-b" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#ffbbd5" />
            <stop offset="100%" stopColor="#ff6b9d" />
          </radialGradient>
          <radialGradient id="ball-i" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#fff5b0" />
            <stop offset="100%" stopColor="#ffd93d" />
          </radialGradient>
          <radialGradient id="ball-n" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#b0f0b8" />
            <stop offset="100%" stopColor="#6bcb77" />
          </radialGradient>
          <radialGradient id="ball-g" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#b0d4ff" />
            <stop offset="100%" stopColor="#4d96ff" />
          </radialGradient>
          <radialGradient id="ball-o" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#e8bffa" />
            <stop offset="100%" stopColor="#cc5de8" />
          </radialGradient>
          <filter id="ball-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(0,0,0,0.5)" />
          </filter>
          <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Clip paths for each ball stripe */}
          {BALLS.map((ball) => (
            <clipPath key={`clip-${ball.letter}`} id={`clip-${ball.letter}`}>
              <circle cx={ball.cx} cy={ball.cy} r={R} />
            </clipPath>
          ))}
        </defs>

        {/* Stars */}
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="rgba(255,255,255,0.85)"
            style={{ animation: s.anim, transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        ))}

        {/* Decorative symbols */}
        {SYMBOLS.map((sym, i) => (
          <text
            key={i}
            x={sym.x}
            y={sym.y}
            fontSize={sym.size}
            fill={sym.color}
            fontFamily="Arial, sans-serif"
            fontWeight="900"
          >
            {sym.text}
          </text>
        ))}

        {/* BINGO balls */}
        {BALLS.map((ball) => (
          <g
            key={ball.letter}
            style={{ animation: ball.anim, transformBox: 'fill-box', transformOrigin: 'center' }}
            filter="url(#ball-shadow)"
          >
            {/* Main ball */}
            <circle cx={ball.cx} cy={ball.cy} r={R} fill={`url(#${ball.grad})`} />
            {/* Shiny highlight */}
            <ellipse
              cx={ball.cx - R * 0.22}
              cy={ball.cy - R * 0.25}
              rx={R * 0.38}
              ry={R * 0.25}
              fill="rgba(255,255,255,0.35)"
              style={{ transform: 'rotate(-30deg)', transformBox: 'fill-box', transformOrigin: 'center' }}
            />
            {/* White outer ring */}
            <circle cx={ball.cx} cy={ball.cy} r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
            {/* Stripe */}
            <rect
              x={ball.cx - R}
              y={ball.cy - 8}
              width={R * 2}
              height={16}
              fill="rgba(255,255,255,0.18)"
              clipPath={`url(#clip-${ball.letter})`}
            />
            {/* Letter */}
            <text
              x={ball.cx}
              y={ball.cy + 9}
              textAnchor="middle"
              fontSize="26"
              fontWeight="900"
              fontFamily="Arial Black, Arial, sans-serif"
              fill="white"
            >
              {ball.letter}
            </text>
          </g>
        ))}

        {/* "BINGO!" text at bottom */}
        <text
          x="160"
          y="158"
          textAnchor="middle"
          fontSize="11"
          fontWeight="900"
          fontFamily="Arial Black, Arial, sans-serif"
          fill="rgba(255,217,61,0.7)"
          letterSpacing="6"
        >
          ✦ BINGO ✦
        </text>
      </svg>
    </div>
  );
}
