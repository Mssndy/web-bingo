interface Props {
  onDraw: () => void;
  disabled: boolean;
  remaining: number;
  label?: string;
  unit?: string;
}

export default function DrawButton({
  onDraw,
  disabled,
  remaining,
  label = 'のこり',
  unit = '個',
}: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onDraw}
        disabled={disabled}
        className="flex-1 py-3 text-2xl font-black text-white rounded-2xl bg-[var(--color-bingo-green)] shadow-lg active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {disabled ? '🎉 おわり！' : '🎲 つぎを ひく'}
      </button>
      <p className="shrink-0 text-sm text-gray-400">
        {label} <span className="font-black text-gray-600">{remaining}</span> {unit}
      </p>
    </div>
  );
}
