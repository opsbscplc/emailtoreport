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
    // Create date range for the entire day
    const dayStart = new Date(year, month - 1, day, 0, 0, 0); // Start of day
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59); // End of day
    
    const outages = await db.collection('outages').find({
      start: {
        $gte: dayStart,
        $lte: dayEnd
      }
    }).toArray();
    
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    return NextResponse.json({ 
      scope, 
      year, 
      month, 
      day, 
      dayStart: dayStart.toISOString(),
      dayEnd: dayEnd.toISOString(),
      totalMinutes, 
      totalHours: toHours(totalMinutes), 
      outages 
    });
  }

  if (scope === 'monthly') {
    // Create date range for the entire month
    const monthStart = new Date(year, month - 1, 1); // First day of month
    const monthEnd = new Date(year, month, 0, 23, 59, 59); // Last day of month
    
    const outages = await db.collection('outages').find({
      start: {
        $gte: monthStart,
        $lte: monthEnd
      }
    }).toArray();
    
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    return NextResponse.json({ 
      scope, 
      year, 
      month, 
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      totalMinutes, 
      totalHours: toHours(totalMinutes), 
      outages 
    });
  }

  if (scope === 'yearly') {
    // Create date range for the entire year (January 1st to December 31st)
    const yearStart = new Date(year, 0, 1); // January 1st
    const yearEnd = new Date(year, 11, 31, 23, 59, 59); // December 31st
    
    const outages = await db.collection('outages').find({
      start: {
        $gte: yearStart,
        $lte: yearEnd
      }
    }).toArray();
    
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    return NextResponse.json({ 
      scope, 
      year, 
      yearStart: yearStart.toISOString(),
      yearEnd: yearEnd.toISOString(),
      totalMinutes, 
      totalHours: toHours(totalMinutes), 
      outages 
    });
  }

  if (scope === 'weekly') {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday
    
    // Get all outages for the current week
    const outages = await db.collection('outages').find({
      start: {
        $gte: weekStart,
        $lte: weekEnd
      }
    }).toArray();
    
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    
    // Create daily breakdown for the week (Sunday=0, Monday=1, ..., Saturday=6)
    const dailyBreakdown = Array(7).fill(0).map(() => ({ hours: 0, count: 0 }));
    
    outages.forEach(outage => {
      const dayOfWeek = getDay(new Date(outage.start)); // 0=Sunday, 1=Monday, ..., 6=Saturday
      dailyBreakdown[dayOfWeek].hours += toHours(outage.durationMinutes || 0);
      dailyBreakdown[dayOfWeek].count += 1;
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


