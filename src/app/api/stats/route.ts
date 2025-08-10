import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, getDay, addHours } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

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
    // Create date range for the entire day in GMT+6 (Bangladesh timezone)
    const bangladeshTz = 'Asia/Dhaka';
    
    // Create start and end times in Bangladesh timezone
    const localDayStart = new Date(year, month - 1, day, 0, 0, 0);
    const localDayEnd = new Date(year, month - 1, day, 23, 59, 59);
    
    // Convert to UTC for database query
    const dayStart = fromZonedTime(localDayStart, bangladeshTz);
    const dayEnd = fromZonedTime(localDayEnd, bangladeshTz);
    
    const outages = await db.collection('outages').find({
      start: {
        $gte: dayStart,
        $lte: dayEnd
      }
    }).sort({ start: 1 }).toArray();
    
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
    // Create date range for the entire month in GMT+6 (Bangladesh timezone)
    const bangladeshTz = 'Asia/Dhaka';
    
    // Create start and end times in Bangladesh timezone
    const localMonthStart = new Date(year, month - 1, 1, 0, 0, 0); // First day of month
    const localMonthEnd = new Date(year, month, 0, 23, 59, 59); // Last day of month
    
    // Convert to UTC for database query
    const monthStart = fromZonedTime(localMonthStart, bangladeshTz);
    const monthEnd = fromZonedTime(localMonthEnd, bangladeshTz);
    
    const outages = await db.collection('outages').find({
      start: {
        $gte: monthStart,
        $lte: monthEnd
      }
    }).sort({ start: 1 }).toArray();
    
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
    // Check if a specific month is requested for pagination
    const monthParam = url.searchParams.get('filterMonth');
    
    if (monthParam) {
      // Filter for specific month (1-12) with Bangladesh timezone consideration
      const filterMonth = parseInt(monthParam) - 1; // Convert to 0-based month
      
      // Create date range for specific month in GMT+6 (Bangladesh timezone)
      const bangladeshTz = 'Asia/Dhaka';
      
      // Create start and end times in Bangladesh timezone
      const localMonthStart = new Date(year, filterMonth, 1, 0, 0, 0); // First day of month
      const localMonthEnd = new Date(year, filterMonth + 1, 0, 23, 59, 59); // Last day of month
      
      // Convert to UTC for database query
      const monthStart = fromZonedTime(localMonthStart, bangladeshTz);
      const monthEnd = fromZonedTime(localMonthEnd, bangladeshTz);
      
      const outages = await db.collection('outages').find({
        start: {
          $gte: monthStart,
          $lte: monthEnd
        }
      }).sort({ start: 1 }).toArray();
      
      const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
      return NextResponse.json({ 
        scope, 
        year,
        filterMonth: parseInt(monthParam),
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        totalMinutes, 
        totalHours: toHours(totalMinutes), 
        outages 
      });
    }
    
    // Default: Create date range for the entire year in GMT+6 (Bangladesh timezone)
    const bangladeshTz = 'Asia/Dhaka';
    
    // Create start and end times in Bangladesh timezone
    const localYearStart = new Date(year, 0, 1, 0, 0, 0); // January 1st
    const localYearEnd = new Date(year, 11, 31, 23, 59, 59); // December 31st
    
    // Convert to UTC for database query
    const yearStart = fromZonedTime(localYearStart, bangladeshTz);
    const yearEnd = fromZonedTime(localYearEnd, bangladeshTz);
    
    const outages = await db.collection('outages').find({
      start: {
        $gte: yearStart,
        $lte: yearEnd
      }
    }).sort({ start: 1 }).toArray();
    
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
    const bangladeshTz = 'Asia/Dhaka';
    
    // Get current time in Bangladesh timezone
    const now = toZonedTime(new Date(), bangladeshTz);
    const localWeekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
    const localWeekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday
    
    // Convert to UTC for database query
    const weekStart = fromZonedTime(localWeekStart, bangladeshTz);
    const weekEnd = fromZonedTime(localWeekEnd, bangladeshTz);
    
    // Get all outages for the current week
    const outages = await db.collection('outages').find({
      start: {
        $gte: weekStart,
        $lte: weekEnd
      }
    }).sort({ start: 1 }).toArray();
    
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


