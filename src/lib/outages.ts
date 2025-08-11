import { differenceInMinutes } from 'date-fns';

export type RawEvent = {
  type: 'down' | 'up';
  at: Date;
  messageId: string;
};

export type Outage = {
  start: Date;
  end?: Date;
  durationMinutes?: number;
  events: RawEvent[];
  year: number;
  month: number; // 1-12
  day: number; // 1-31
};

export function groupEventsIntoOutages(events: RawEvent[]): Outage[] {
  // Sort by time
  const sorted = [...events].sort((a, b) => a.at.getTime() - b.at.getTime());
  const outages: Outage[] = [];
  let current: Outage | null = null;

  for (const e of sorted) {
    if (e.type === 'down') {
      if (!current) {
        current = {
          start: e.at,
          events: [e],
          year: e.at.getFullYear(),
          month: e.at.getMonth() + 1,
          day: e.at.getDate(),
        };
      } else {
        // Consecutive down, treat as same outage, append event
        current.events.push(e);
      }
    } else if (e.type === 'up') {
      if (current) {
        current.events.push(e);
        current.end = e.at;
        // Calculate duration with proper rounding (any outage >= 1 second = at least 1 minute)
        const durationMs = e.at.getTime() - current.start.getTime();
        if (durationMs < 1000) {
          // Less than 1 second = 0 minutes
          current.durationMinutes = 0;
        } else if (durationMs < 60000) {
          // Between 1 second and 60 seconds = 1 minute  
          current.durationMinutes = 1;
        } else {
          // 60+ seconds = round to nearest minute
          current.durationMinutes = Math.round(durationMs / (1000 * 60));
        }
        outages.push(current);
        current = null;
      } else {
        // Up without a known down: ignore or treat as zero-duration
        // We skip storing it as outage, but could log
      }
    }
  }

  // If trailing outage not closed, keep partial outage
  if (current) {
    outages.push(current);
  }

  return outages;
}


