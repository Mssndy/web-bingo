'use client';

export type MascotState = 'idle' | 'happy' | 'veryHappy' | 'encourage';

interface Props {
  state?: MascotState;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = { sm: '2.5rem', md: '3.5rem', lg: '5rem' };

const ANIM: Record<MascotState, string> = {
  idle:      'animate-[mascot-idle_2.5s_ease-in-out_infinite]',
  happy:     'animate-[mascot-happy_0.55s_cubic-bezier(0.34,1.56,0.64,1)_both]',
  veryHappy: 'animate-[mascot-veryhappy_0.7s_ease-in-out_both]',
  encourage: 'animate-[mascot-encourage_0.5s_ease-in-out_both]',
};

export default function Mascot({ state = 'idle', size = 'md' }: Props) {
  return (
    <span
      key={state}
      className={`leading-none select-none inline-block ${ANIM[state]}`}
      style={{ fontSize: SIZE[size] }}
      aria-hidden
    >
      🐰
    </span>
  );
}
