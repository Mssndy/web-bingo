'use client';

import { useState, useEffect } from 'react';

export default function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-sm"
      style={{
        background: 'linear-gradient(90deg, #667eea22, #764ba222)',
        border: '2px solid rgba(102,126,234,0.3)',
        color: '#4d96ff',
        letterSpacing: '0.05em',
      }}
    >
      <span style={{ fontSize: '1rem' }}>⏱</span>
      <span>{mm}:{ss}</span>
    </div>
  );
}
