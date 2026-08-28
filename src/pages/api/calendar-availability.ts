import type { APIRoute } from 'astro';

export const prerender = false;

interface BusySlot {
  start: string; // ISO String
  end: string;   // ISO String
  isAllDay: boolean;
}

// Simple standard iCal parser optimized for current & upcoming booking window
function parseICal(icalText: string): BusySlot[] {
  const events: BusySlot[] = [];
  const lines = icalText.split(/\r\n|\n|\r/);
  let inEvent = false;
  let dtStart = '';
  let dtEnd = '';
  let isAllDay = false;

  // Only return events within relevant booking window: 30 days ago to 365 days in future
  const now = Date.now();
  const minTime = now - (30 * 24 * 60 * 60 * 1000);
  const maxTime = now + (365 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      dtStart = '';
      dtEnd = '';
      isAllDay = false;
    } else if (line === 'END:VEVENT') {
      inEvent = false;
      if (dtStart) {
        let startTime: Date;
        let endTime: Date;

        if (dtStart.length === 8) { // YYYYMMDD (All day)
          isAllDay = true;
          const y = parseInt(dtStart.substring(0, 4), 10);
          const m = parseInt(dtStart.substring(4, 6), 10) - 1;
          const d = parseInt(dtStart.substring(6, 8), 10);
          startTime = new Date(Date.UTC(y, m, d, 0, 0, 0));
          endTime = new Date(Date.UTC(y, m, d, 23, 59, 59));
        } else {
          startTime = parseICalDate(dtStart);
          endTime = dtEnd ? parseICalDate(dtEnd) : new Date(startTime.getTime() + 60 * 60 * 1000);
        }

        const startMs = startTime.getTime();
        // Only keep events within current inquiry window
        if (!isNaN(startMs) && startMs >= minTime && startMs <= maxTime) {
          events.push({
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            isAllDay,
          });
        }
      }
    } else if (inEvent) {
      if (line.startsWith('DTSTART')) {
        const parts = line.split(':');
        dtStart = parts[1] || '';
      } else if (line.startsWith('DTEND')) {
        const parts = line.split(':');
        dtEnd = parts[1] || '';
      }
    }
  }

  return events;
}

function parseICalDate(str: string): Date {
  // Format: 20261014T143000Z or 20261014T143000
  const clean = str.replace(/[^0-9T]/g, '');
  const y = parseInt(clean.substring(0, 4), 10);
  const m = parseInt(clean.substring(4, 6), 10) - 1;
  const d = parseInt(clean.substring(6, 8), 10);
  const h = parseInt(clean.substring(9, 11) || '0', 10);
  const min = parseInt(clean.substring(11, 13) || '0', 10);
  const s = parseInt(clean.substring(13, 15) || '0', 10);
  
  if (str.endsWith('Z')) {
    return new Date(Date.UTC(y, m, d, h, min, s));
  }
  return new Date(y, m, d, h, min, s);
}

// In-memory cache for ultra-fast response times (<5ms) and reduced Google fetching
let cachedBusySlots: BusySlot[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory cache

export const GET: APIRoute = async () => {
  try {
    const calendarUrl = import.meta.env.GOOGLE_CALENDAR_ICAL_URL;
    console.log('[Calendar API] Evaluated calendarUrl:', calendarUrl ? calendarUrl.substring(0, 45) + '...' : 'UNDEFINED');

    if (!calendarUrl) {
      // Fail open: Return empty busy slots with status flag
      return new Response(JSON.stringify({ 
        busySlots: [], 
        source: 'demo', 
        status: 'open',
        message: 'No calendar feed configured. All slots available for inquiry.' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return in-memory cache if fresh
    const now = Date.now();
    if (cachedBusySlots.length > 0 && (now - cacheTimestamp) < CACHE_TTL_MS) {
      return new Response(JSON.stringify({ 
        busySlots: cachedBusySlots, 
        source: 'cache', 
        status: 'active',
        count: cachedBusySlots.length 
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    let res: Response | null = null;
    try {
      res = await fetch(calendarUrl);
      console.log('[Calendar API] Google fetch status:', res?.status);
    } catch (err: any) {
      console.warn('[Calendar API] Fetch failed:', err?.message || err);
    }

    if (!res || !res.ok) {
      console.warn(`[Calendar API] Google feed unreachable (${res ? res.status : 'network error'}). Serving fallback.`);
      return new Response(JSON.stringify({ 
        busySlots: cachedBusySlots, 
        source: cachedBusySlots.length ? 'cache-fallback' : 'fallback', 
        status: 'open',
        warning: 'Live calendar sync currently resting. Form remains 100% operational.' 
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
      });
    }

    const icalText = await res.text();
    const busySlots = parseICal(icalText);

    // Update in-memory cache
    cachedBusySlots = busySlots;
    cacheTimestamp = Date.now();

    return new Response(JSON.stringify({ 
      busySlots, 
      source: 'live',
      status: 'active',
      count: busySlots.length 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 mins, stale for 10 mins
      },
    });
  } catch (err: any) {
    console.error('[Calendar API] Error parsing calendar feed:', err);
    // Absolute fail-open: Never return a 500 error to the client
    return new Response(JSON.stringify({ 
      busySlots: [], 
      source: 'fallback',
      status: 'open',
      error: err.message 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
