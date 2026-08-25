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
    const calendarUrl = import.meta.env.GOOGLE_CALENDAR_ICAL_URL || process.env.GOOGLE_CALENDAR_ICAL_URL;

    if (!calendarUrl) {
      // Fallback/Demo mode: Return empty or sample busy slots
      return new Response(JSON.stringify({ busySlots: [], source: 'demo' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(calendarUrl);
    if (!res.ok) {
      console.warn(`[Calendar API] Failed to fetch iCal feed (Status ${res.status}). Falling back to open availability.`);
      return new Response(JSON.stringify({ busySlots: [], source: 'fallback', status: res.status }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const icalText = await res.text();
    const busySlots = parseICal(icalText);

    return new Response(JSON.stringify({ busySlots, source: 'live' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 mins
      },
    });
  } catch (err: any) {
    console.error('[Calendar API] Error parsing calendar feed:', err);
    return new Response(JSON.stringify({ busySlots: [], error: err.message }), {
      status: 200, // Return 200 with empty so UI never crashes
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
