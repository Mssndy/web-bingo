import { type NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/db';

const ALLOWED_KEYS = [
  'streak:practice',
  'streak:easy',
  'streak:char:hiragana',
  'streak:char:katakana',
  'streak:char:alphabet',
  'stickers',
];

// GET /api/records?player=かず
export async function GET(req: NextRequest) {
  const player = req.nextUrl.searchParams.get('player');
  if (!player || player.length > 10) {
    return NextResponse.json({});
  }

  const keys = [
    `streak:practice:${player}`,
    `streak:easy:${player}`,
    `streak:char:hiragana:${player}`,
    `streak:char:katakana:${player}`,
    `streak:char:alphabet:${player}`,
    `stickers:${player}`,
  ];

  const values = await redis.mget(...keys);
  const result: Record<string, number> = {};
  keys.forEach((k, i) => {
    if (values[i] != null) {
      result[k] = parseInt(String(values[i]), 10);
    }
  });

  return NextResponse.json(result);
}

// POST /api/records  body: { playerName, key, value }
export async function POST(req: NextRequest) {
  const body = await req.json() as { playerName?: unknown; key?: unknown; value?: unknown };
  const { playerName, key, value } = body;

  if (typeof playerName !== 'string' || playerName.length > 10 || playerName.length === 0) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (typeof value !== 'number' || value < 0 || value > 99999) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (typeof key !== 'string' || !ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const fullKey = `${key}:${playerName}`;
  // サーバーは常に最大値を保持（デバイス間で大きい方を勝たせる）
  const current = parseInt(String(await redis.get(fullKey) ?? '0'), 10);
  if (value > current) {
    await redis.set(fullKey, String(value));
  }

  return NextResponse.json({ ok: true });
}
