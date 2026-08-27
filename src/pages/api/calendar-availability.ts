import type { APIRoute } from 'astro';

export const prerender = false;

interface BusySlot {
  start: string; // ISO String
  end: string;   // ISO String
  isAllDay: boolean;
}

// Simple standard iCal parser
function parseICal(icalText: string): BusySlot[] {
  const events: BusySlot[] = [];
  const lines = icalText.split(/\r\n|\n|\r/);
  let inEvent = false;
  let dtStart = '';
  let dtEnd = '';
  let isAllDay = false;

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
        // If no end time, default to 1 hour after start (or end of day if allday)
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

        events.push({
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          isAllDay,
        });
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

export const GET: APIRoute = async () => {
  try {
    const calendarUrl = import.meta.env.GOOGLE_CALENDAR_ICAL_URL;

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

    // Use 4-second timeout so a slow Google response never hangs the page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(calendarUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'K-and-R-Photography-Availability-Bot/1.0',
      },
    }).catch(err => {
      console.warn('[Calendar API] Network fetch failed or timed out:', err.name || err.message);
      return null;
    });

    clearTimeout(timeoutId);

    if (!res || !res.ok) {
      console.warn(`[Calendar API] Google feed unreachable (${res ? res.status : 'timeout/network'}). Gracefully failing open.`);
      return new Response(JSON.stringify({ 
        busySlots: [], 
        source: 'fallback', 
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
