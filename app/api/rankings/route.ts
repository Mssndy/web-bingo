import { type NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/db';

// GET /api/rankings?mode=easy&period=week&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode   = searchParams.get('mode') ?? 'easy';
  const period = searchParams.get('period') ?? 'all';
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

  const cutoff = period === 'day'  ? Date.now() - 86_400_000
               : period === 'week' ? Date.now() - 604_800_000
               : 0;

  const raw = await redis.zrange(`ranking:${mode}`, '+inf', cutoff, {
    byScore: true,
    rev: true,
    offset: 0,
    count: limit,
    withScores: true,
  });

  const entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    const meta  = JSON.parse(raw[i] as string) as { playerName: string; ts: number };
    const score = raw[i + 1] as number;
    entries.push({ ...meta, score, mode });
  }

  return NextResponse.json(entries);
}

// POST /api/rankings  body: { playerName, score, mode }
export async function POST(req: NextRequest) {
  const body = await req.json() as { playerName?: unknown; score?: unknown; mode?: unknown };
  const { playerName, score, mode } = body;

  if (typeof playerName !== 'string' || playerName.length > 10 || playerName.length === 0) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (typeof score !== 'number' || score <= 0 || score > 9999) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (typeof mode !== 'string') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const key    = `ranking:${mode}`;
  const member = JSON.stringify({ playerName, ts: Date.now() });

  await redis.zadd(key, { score, member });
  // 上位500件に制限（古い低スコアを削除）
  await redis.zremrangebyrank(key, 0, -501);

  return NextResponse.json({ ok: true });
}
