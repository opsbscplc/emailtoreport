import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

function toHours(minutes?: number) {
  return minutes ? Math.round((minutes / 60) * 100) / 100 : 0;
}

export async function GET(req: NextRequest) {
  const db = await getDb();
  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') || 'daily';
  const year = Number(url.searchParams.get('year') || new Date().getFullYear());
  const month = Number(url.searchParams.get('month') || new Date().getMonth() + 1);
  const day = Number(url.searchParams.get('day') || new Date().getDate());

  if (scope === 'daily') {
    const outages = await db.collection('outages').find({ year, month, day }).toArray();
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    return NextResponse.json({ scope, year, month, day, totalMinutes, totalHours: toHours(totalMinutes), outages });
  }

  if (scope === 'monthly') {
    const outages = await db.collection('outages').find({ year, month }).toArray();
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    return NextResponse.json({ scope, year, month, totalMinutes, totalHours: toHours(totalMinutes), outages });
  }

  if (scope === 'yearly') {
    const outages = await db.collection('outages').find({ year }).toArray();
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    return NextResponse.json({ scope, year, totalMinutes, totalHours: toHours(totalMinutes), outages });
  }

  return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
}


