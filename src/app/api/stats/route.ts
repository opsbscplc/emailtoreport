import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { startOfWeek, endOfWeek, getDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

function toHours(minutes?: number) {
  return minutes ? Math.round((minutes / 60) * 100) / 100 : 0;
}

// Input validation helper
function validateInput(year: number, month?: number, day?: number): string | null {
  const currentYear = new Date().getFullYear();
  if (year < 2020 || year > currentYear + 5) {
    return `Invalid year: ${year}. Must be between 2020 and ${currentYear + 5}`;
  }
  if (month !== undefined && (month < 1 || month > 12)) {
    return `Invalid month: ${month}. Must be between 1 and 12`;
  }
  if (day !== undefined && (day < 1 || day > 31)) {
    return `Invalid day: ${day}. Must be between 1 and 31`;
  }
  return null;
}

// Cache for frequently accessed data (in-memory cache for demo, consider Redis for production)
const cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

function getCacheKey(scope: string, year: number, month?: number, day?: number, filterMonth?: number): string {
  return `${scope}_${year}_${month || 'null'}_${day || 'null'}_${filterMonth || 'null'}`;
}

function getFromCache(key: string): unknown | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCache(key: string, data: unknown, ttlMinutes: number = 5): void {
  // Limit cache size to prevent memory issues
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    if (firstKey) {
      cache.delete(firstKey);
    }
  }
  
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000 // Convert to milliseconds
  });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') || 'daily';
    const year = Number(url.searchParams.get('year') || new Date().getFullYear());
    const month = Number(url.searchParams.get('month') || new Date().getMonth() + 1);
    const day = Number(url.searchParams.get('day') || new Date().getDate());
    const filterMonthParam = url.searchParams.get('filterMonth');
    const filterMonth = filterMonthParam ? parseInt(filterMonthParam) : undefined;

    // Input validation
    const validationError = validateInput(year, scope === 'daily' ? month : undefined, scope === 'daily' ? day : undefined);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Check cache first
    const cacheKey = getCacheKey(scope, year, month, day, filterMonth);
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      return NextResponse.json({ ...cachedData, cached: true });
    }

    const db = await getDb();


    

  if (scope === 'daily') {
    // Create date range for the entire day in GMT+6 (Bangladesh timezone)
    const bangladeshTz = 'Asia/Dhaka';
    
    // Create start and end times in Bangladesh timezone
    const localDayStart = new Date(year, month - 1, day, 0, 0, 0);
    const localDayEnd = new Date(year, month - 1, day, 23, 59, 59);
    
    // Convert to UTC for database query
    const dayStart = fromZonedTime(localDayStart, bangladeshTz);
    const dayEnd = fromZonedTime(localDayEnd, bangladeshTz);
    
    // Optimized query with projection to reduce data transfer
    const outages = await db.collection('outages').find({
      start: {
        $gte: dayStart,
        $lte: dayEnd
      }
    }).sort({ start: 1 }).project({
      start: 1,
      end: 1,
      durationMinutes: 1,
      events: 1
    }).toArray();
    
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    const response = { 
      scope, 
      year, 
      month, 
      day, 
      dayStart: dayStart.toISOString(),
      dayEnd: dayEnd.toISOString(),
      totalMinutes, 
      totalHours: toHours(totalMinutes), 
      outages 
    };
    
    // Cache the response for 5 minutes (data doesn't change frequently)
    setCache(cacheKey, response, 5);
    
    return NextResponse.json(response);
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
    
    // Optimized query with projection
    const outages = await db.collection('outages').find({
      start: {
        $gte: monthStart,
        $lte: monthEnd
      }
    }).sort({ start: 1 }).project({
      start: 1,
      end: 1,
      durationMinutes: 1,
      events: 1
    }).toArray();
    
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    const response = { 
      scope, 
      year, 
      month, 
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      totalMinutes, 
      totalHours: toHours(totalMinutes), 
      outages 
    };
    
    // Cache monthly data for longer (15 minutes) as it changes less frequently
    setCache(cacheKey, response, 15);
    
    return NextResponse.json(response);
  }

  if (scope === 'yearly') {
    // Check if a specific month is requested for pagination    
    if (filterMonth) {
      // Filter for specific month (1-12) with Bangladesh timezone consideration
      const filterMonthIndex = filterMonth - 1; // Convert to 0-based month
      
      // Create date range for specific month in GMT+6 (Bangladesh timezone)
      const bangladeshTz = 'Asia/Dhaka';
      
      // Create start and end times in Bangladesh timezone
      const localMonthStart = new Date(year, filterMonthIndex, 1, 0, 0, 0); // First day of month
      const localMonthEnd = new Date(year, filterMonthIndex + 1, 0, 23, 59, 59); // Last day of month
      
      // Convert to UTC for database query
      const monthStart = fromZonedTime(localMonthStart, bangladeshTz);
      const monthEnd = fromZonedTime(localMonthEnd, bangladeshTz);
      
      // Optimized query with projection
      const outages = await db.collection('outages').find({
        start: {
          $gte: monthStart,
          $lte: monthEnd
        }
      }).sort({ start: 1 }).project({
        start: 1,
        end: 1,
        durationMinutes: 1,
        events: 1
      }).toArray();
      
      const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
      const response = { 
        scope, 
        year,
        filterMonth: filterMonth,
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        totalMinutes, 
        totalHours: toHours(totalMinutes), 
        outages 
      };
      
      // Cache yearly filtered data for longer (30 minutes)
      setCache(cacheKey, response, 30);
      
      return NextResponse.json(response);
    }
    
    // Default: Create date range for the entire year in GMT+6 (Bangladesh timezone)
    const bangladeshTz = 'Asia/Dhaka';
    
    // Create start and end times in Bangladesh timezone
    const localYearStart = new Date(year, 0, 1, 0, 0, 0); // January 1st
    const localYearEnd = new Date(year, 11, 31, 23, 59, 59); // December 31st
    
    // Convert to UTC for database query
    const yearStart = fromZonedTime(localYearStart, bangladeshTz);
    const yearEnd = fromZonedTime(localYearEnd, bangladeshTz);
    
    // Optimized query with projection
    const outages = await db.collection('outages').find({
      start: {
        $gte: yearStart,
        $lte: yearEnd
      }
    }).sort({ start: 1 }).project({
      start: 1,
      end: 1,
      durationMinutes: 1,
      events: 1
    }).toArray();
    
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    const response = { 
      scope, 
      year, 
      yearStart: yearStart.toISOString(),
      yearEnd: yearEnd.toISOString(),
      totalMinutes, 
      totalHours: toHours(totalMinutes), 
      outages 
    };
    
    // Cache yearly data for even longer (60 minutes)
    setCache(cacheKey, response, 60);
    
    return NextResponse.json(response);
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
    
    // Optimized query with projection for weekly data
    const outages = await db.collection('outages').find({
      start: {
        $gte: weekStart,
        $lte: weekEnd
      }
    }).sort({ start: 1 }).project({
      start: 1,
      end: 1,
      durationMinutes: 1,
      events: 1
    }).toArray();
    
    const totalMinutes = outages.reduce((acc, o) => acc + (o.durationMinutes || 0), 0);
    
    // Create daily breakdown for the week (Sunday=0, Monday=1, ..., Saturday=6)
    const dailyBreakdown = Array(7).fill(0).map(() => ({ hours: 0, count: 0 }));
    
    outages.forEach(outage => {
      const dayOfWeek = getDay(new Date(outage.start)); // 0=Sunday, 1=Monday, ..., 6=Saturday
      dailyBreakdown[dayOfWeek].hours += toHours(outage.durationMinutes || 0);
      dailyBreakdown[dayOfWeek].count += 1;
    });
    
    const response = { 
      scope, 
      weekStart: weekStart.toISOString(), 
      weekEnd: weekEnd.toISOString(),
      totalMinutes, 
      totalHours: toHours(totalMinutes), 
      outages,
      dailyBreakdown
    };
    
    // Cache weekly data for shorter time (2 minutes) as it's more dynamic
    setCache(cacheKey, response, 2);
    
    return NextResponse.json(response);
  }

    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  } catch (error) {
    console.error('Stats API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
    }, { status: 500 });
  }
}


