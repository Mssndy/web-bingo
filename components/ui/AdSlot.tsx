interface AdSlotProps {
  slotId: string;
  width: number;
  height: number;
  className?: string;
}

export default function AdSlot({ slotId, width, height, className = '' }: AdSlotProps) {
  return (
    <div
      id={slotId}
      data-ad-slot={slotId}
      style={{ width: '100%', minHeight: height }}
      className={`flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
