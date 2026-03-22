interface Props {
  drawnNumbers: number[];
}

const CHIP_COLORS = [
  'bg-[var(--color-bingo-pink)]',
  'bg-[var(--color-bingo-blue)]',
  'bg-[var(--color-bingo-green)]',
  'bg-[var(--color-bingo-orange)]',
  'bg-[var(--color-bingo-purple)]',
];

export default function DrawnHistory({ drawnNumbers }: Props) {
  if (drawnNumbers.length === 0) return null;

  // Show most recent first
  const reversed = [...drawnNumbers].reverse();

  return (
    <div className="w-full">
      <p className="text-xs text-gray-400 font-bold mb-2">でた すうじ</p>
      <div className="flex gap-2 overflow-x-auto pb-2 scroll-smooth">
        {reversed.map((n, i) => {
          const isLatest = i === 0;
          const color = CHIP_COLORS[n % CHIP_COLORS.length];
          return (
            <span
              key={`${n}-${drawnNumbers.length - 1 - i}`}
              className={`
                shrink-0 inline-flex items-center justify-center
                rounded-full font-black text-white
                ${isLatest ? 'w-12 h-12 text-xl ring-4 ring-white shadow-lg' : 'w-9 h-9 text-sm opacity-80'}
                ${color}
              `}
            >
              {n}
            </span>
          );
        })}
      </div>
    </div>
  );
}
