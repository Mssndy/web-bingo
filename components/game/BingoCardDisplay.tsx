import type { BingoCard } from '@/lib/types';
import { getBingoLines } from '@/lib/bingo';

interface Props {
  card: BingoCard;
  lastMatchedNumber: number | null;
}

export default function BingoCardDisplay({ card, lastMatchedNumber }: Props) {
  const bingoLines = getBingoLines(card);

  return (
    <div className="w-full">
      <p className="text-xs text-gray-400 font-bold mb-2">あなたのカード</p>
      <div className="grid grid-cols-5 gap-1">
        {card.cells.map((row, r) =>
          row.map((cell, c) => {
            const marked = card.marked[r][c];
            const isFree = cell === 'FREE';
            const isBingoCell = bingoLines.has(`${r},${c}`);
            const isLastMatch = cell === lastMatchedNumber;

            let cellClass =
              'aspect-square flex items-center justify-center rounded-xl text-sm font-black transition-all select-none ';

            if (isBingoCell) {
              cellClass += 'bg-[var(--color-bingo-yellow)] text-gray-800 shadow-md ring-2 ring-[var(--color-bingo-orange)] ';
            } else if (isFree) {
              cellClass += 'bg-[var(--color-bingo-green)] text-white ';
            } else if (marked) {
              cellClass += 'bg-[var(--color-bingo-pink)] text-white shadow-sm ';
            } else {
              cellClass += 'bg-white border-2 border-gray-100 text-gray-700 ';
            }

            if (isLastMatch) {
              cellClass += 'animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both] ';
            }

            return (
              <div key={`${r}-${c}`} className={cellClass}>
                {isFree ? '★' : marked ? '✓' : cell}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
