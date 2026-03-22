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
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onDraw}
        disabled={disabled}
        className="w-full py-6 text-3xl font-black text-white rounded-3xl bg-[var(--color-bingo-green)] shadow-xl active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {disabled ? '🎉 おわり！' : '🎲 つぎを ひく'}
      </button>
      <p className="text-sm text-gray-400">
        {label} <span className="font-black text-gray-600">{remaining}</span> {unit}
      </p>
    </div>
  );
}
