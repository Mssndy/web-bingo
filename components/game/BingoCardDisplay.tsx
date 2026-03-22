import type { BingoCard } from '@/lib/types';
import { getBingoLines } from '@/lib/bingo';

interface Props {
  card: BingoCard;
  drawnNumbers: number[];
  onCellTap?: (row: number, col: number) => void;
}

const COL_LABELS = ['B', 'I', 'N', 'G', 'O'];

// Marked cell background colors (cycling by cell index)
const MARKED_BG = [
  '#ff6b9d', // pink
  '#4d96ff', // blue
  '#6bcb77', // green
  '#ff922b', // orange
  '#cc5de8', // purple
];

// Column header colors
const COL_BG = [
  '#ff6b9d',
  '#4d96ff',
  '#6bcb77',
  '#ff922b',
  '#cc5de8',
];

export default function BingoCardDisplay({ card, drawnNumbers, onCellTap }: Props) {
  const bingoLines = getBingoLines(card);
  const drawnSet = new Set(drawnNumbers);

  return (
    <div className="w-full">
      <p className="text-xs text-gray-400 font-bold mb-2 text-center tracking-widest">
        ✨ あなたのカード ✨
      </p>

      <div
        className="rounded-3xl p-3 shadow-lg border-4"
        style={{ background: 'linear-gradient(135deg, #fff8f0 0%, #ffeef8 100%)', borderColor: '#ffd93d' }}
      >
        {/* B I N G O header */}
        <div className="grid grid-cols-5 gap-1.5 mb-1.5">
          {COL_LABELS.map((label, c) => (
            <div
              key={label}
              className="flex items-center justify-center rounded-xl py-1 text-white font-black text-lg shadow-sm"
              style={{ backgroundColor: COL_BG[c] }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {card.cells.map((row, r) =>
            row.map((cell, c) => {
              const marked = card.marked[r][c];
              const isFree = cell === 'FREE';
              const isBingo = bingoLines.has(`${r},${c}`);
              const cellIdx = r * 5 + c;
              const markedColor = MARKED_BG[cellIdx % MARKED_BG.length];

              // Tappable: number has been drawn and cell is not yet marked
              const canTap = !isFree && !marked && drawnSet.has(cell as number);

              let style: React.CSSProperties = {};
              let extraClass = '';

              if (isFree) {
                style = { background: 'linear-gradient(135deg, #ffd93d, #ff922b)' };
                extraClass = 'shadow-md';
              } else if (isBingo) {
                style = { background: 'linear-gradient(135deg, #ffd93d, #ffb800)', boxShadow: '0 0 8px rgba(255,180,0,0.6)' };
                extraClass = 'ring-2 ring-yellow-400';
              } else if (marked) {
                style = { backgroundColor: markedColor };
                extraClass = 'shadow-sm';
              } else if (canTap) {
                style = { backgroundColor: '#ffffff', borderColor: markedColor, borderWidth: 3 };
                extraClass = 'border-solid animate-pulse cursor-pointer';
              } else {
                style = { backgroundColor: '#ffffff' };
                extraClass = 'border-2 border-gray-100';
              }

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => canTap && onCellTap?.(r, c)}
                  disabled={!canTap && !isFree}
                  style={style}
                  className={`
                    aspect-square flex items-center justify-center rounded-xl
                    text-sm font-black transition-all select-none
                    ${extraClass}
                    ${canTap ? 'active:scale-90' : ''}
                  `}
                >
                  {isFree ? (
                    <span className="text-white text-xl">⭐</span>
                  ) : marked ? (
                    <span className="text-white text-lg">✓</span>
                  ) : (
                    <span className={canTap ? 'text-gray-700' : 'text-gray-400'}>
                      {cell}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
