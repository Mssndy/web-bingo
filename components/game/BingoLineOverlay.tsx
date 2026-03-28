import type { LineSegment } from '@/lib/types';

interface Props { segments: LineSegment[] }

/** SVG overlay that draws completed bingo lines across the cell grid. */
export default function BingoLineOverlay({ segments }: Props) {
  if (!segments.length) return null;
  return (
    <svg
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 10,
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {segments.map(({ r1, c1, r2, c2 }, i) => (
        <g key={i}>
          <line
            x1={c1 * 20 + 10} y1={r1 * 20 + 10}
            x2={c2 * 20 + 10} y2={r2 * 20 + 10}
            stroke="rgba(255,230,0,0.45)" strokeWidth={14} strokeLinecap="round"
          />
          <line
            x1={c1 * 20 + 10} y1={r1 * 20 + 10}
            x2={c2 * 20 + 10} y2={r2 * 20 + 10}
            stroke="rgba(255,255,255,0.92)" strokeWidth={5} strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}
