'use client';

import { useRef } from 'react';
import type { CharBingoCard } from '@/lib/characters';
import { getCharBingoLines } from '@/lib/characters';

interface Props {
  card: CharBingoCard;
  drawnChars: string[];
  onCellTap?: (row: number, col: number) => void;
}

const COL_LABELS = ['B', 'I', 'N', 'G', 'O'];

const COL = [
  { bg: '#ff6b9d', dark: '#9b1d52', glow: 'rgba(255,107,157,0.7)' },
  { bg: '#4d96ff', dark: '#1a4f99', glow: 'rgba(77,150,255,0.7)'  },
  { bg: '#6bcb77', dark: '#2a7a34', glow: 'rgba(107,203,119,0.7)' },
  { bg: '#ff922b', dark: '#994d00', glow: 'rgba(255,146,43,0.7)'  },
  { bg: '#cc5de8', dark: '#7a1a9e', glow: 'rgba(204,93,232,0.7)'  },
];

export default function CharBingoCardDisplay({ card, drawnChars, onCellTap }: Props) {
  const bingoLines = getCharBingoLines(card);
  const drawnSet   = new Set(drawnChars);

  const stampedRef = useRef<Set<string>>(new Set());

  return (
    <div className="w-full">
      <div
        className="rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, #0b1840 0%, #152360 60%, #0e1e50 100%)',
          border: '4px solid #ffd93d',
          boxShadow: '0 8px 40px rgba(0,0,60,0.6), 0 0 0 2px rgba(255,217,61,0.25)',
        }}
      >
        {/* Title banner */}
        <div
          className="py-2 text-center"
          style={{ background: 'linear-gradient(90deg, #0b1840, #1c3380, #0b1840)' }}
        >
          <span
            className="font-black tracking-[0.35em] text-xl"
            style={{ color: '#ffd93d', textShadow: '0 0 14px rgba(255,217,61,0.9), 0 0 28px rgba(255,217,61,0.4)' }}
          >
            ✦ BINGO ✦
          </span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-5 gap-0 px-3 pt-3 pb-1.5">
          {COL_LABELS.map((label, c) => (
            <div
              key={label}
              className="mx-0.5 flex items-center justify-center rounded-xl py-2 font-black text-2xl text-white"
              style={{
                backgroundColor: COL[c].bg,
                boxShadow: `0 4px 10px ${COL[c].glow}`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Cell grid */}
        <div className="grid grid-cols-5 gap-0 px-3 pb-3 pt-1.5">
          {card.cells.map((row, r) =>
            row.map((cell, c) => {
              const marked = card.marked[r][c];
              const isFree = cell === 'FREE';
              const isBingo = bingoLines.has(`${r},${c}`);
              const col = COL[c];
              const key = `${r}-${c}`;

              const canTap = !isFree && !marked && drawnSet.has(cell as string);

              const isNewStamp = marked && !isFree && !stampedRef.current.has(key);
              if (marked && !isFree) stampedRef.current.add(key);

              let cellStyle: React.CSSProperties;
              let innerStyle: React.CSSProperties = {};
              let innerClass = 'font-black transition-transform';

              if (isFree) {
                cellStyle = {
                  background: 'linear-gradient(135deg, #ffd93d 0%, #ff922b 100%)',
                  boxShadow: '0 3px 10px rgba(255,180,0,0.5)',
                };
              } else if (isBingo) {
                cellStyle = {
                  background: 'linear-gradient(135deg, #ffe44d 0%, #ffa800 100%)',
                  boxShadow: '0 0 14px rgba(255,210,0,0.9), 0 0 28px rgba(255,210,0,0.5)',
                  animation: 'cell-glow-pulse 1.4s ease-in-out infinite',
                  ['--glow-color' as string]: 'rgba(255,210,0,0.6)',
                };
                innerStyle = { color: '#6b3a00', textShadow: '0 1px 3px rgba(0,0,0,0.3)' };
              } else if (marked) {
                cellStyle = {
                  backgroundColor: col.bg,
                  boxShadow: `0 3px 8px ${col.glow}`,
                };
                innerClass += isNewStamp ? ' animate-[stamp-in_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]' : '';
                innerStyle = { color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.4)' };
              } else if (canTap) {
                cellStyle = {
                  background: `linear-gradient(135deg, ${col.dark} 0%, #162050 100%)`,
                  border: `2.5px solid ${col.bg}`,
                  boxShadow: `0 0 12px ${col.glow}, 0 0 24px ${col.glow}`,
                  animation: 'cell-glow-pulse 1s ease-in-out infinite',
                  ['--glow-color' as string]: col.glow,
                };
                innerStyle = { color: '#fff', textShadow: `0 0 8px ${col.glow}` };
                innerClass += ' cursor-pointer';
              } else {
                cellStyle = {
                  backgroundColor: '#0e1c4a',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                };
                innerStyle = { color: 'rgba(255,255,255,0.45)' };
              }

              return (
                <button
                  key={key}
                  onClick={() => canTap && onCellTap?.(r, c)}
                  disabled={!canTap && !isFree}
                  style={cellStyle}
                  className="mx-0.5 my-0.5 aspect-square flex items-center justify-center rounded-xl select-none transition-all active:scale-90"
                >
                  {isFree ? (
                    <span className="text-white text-2xl">⭐</span>
                  ) : (
                    <span style={innerStyle} className={`text-lg leading-none ${innerClass}`}>
                      {marked ? '★' : String(cell)}
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
