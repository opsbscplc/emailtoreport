import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, getDay } from 'date-fns';

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

  if (scope === 'weekly') {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
    
    // Get all outages for the current week
    const outages = await db.collection('outages').find({
      start: {
        $gte: weekStart,
        $lte: weekEnd
      }
    }).toArray();
    
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    
    // Create daily breakdown for the week
    const dailyBreakdown = Array(7).fill(0).map(() => ({ hours: 0, count: 0 }));
    
    outages.forEach(outage => {
      const dayOfWeek = getDay(new Date(outage.start));
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday=0 to Sunday=6, Monday=1 to Monday=0
      dailyBreakdown[adjustedDay].hours += toHours(outage.durationMinutes || 0);
      dailyBreakdown[adjustedDay].count += 1;
    });
    
    return NextResponse.json({ 
      scope, 
      weekStart: weekStart.toISOString(), 
      weekEnd: weekEnd.toISOString(),
      totalMinutes, 
      totalHours: toHours(totalMinutes), 
      outages,
      dailyBreakdown
    });
  }

  return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
}


