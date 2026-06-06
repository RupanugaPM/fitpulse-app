import { differenceInCalendarDays, format, isSameDay } from 'date-fns';
import type { ReminderSettings } from '../types';

export function isWithinActiveHours(
  start: number,
  end: number,
  now = new Date()
): boolean {
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  if (start <= end) return h >= start && h < end;
  return h >= start || h < end;
}

export function isActiveDay(activeDays: number[], now = new Date()): boolean {
  return activeDays.length > 0 && activeDays.includes(now.getDay());
}

export function isReminderSlot(
  when: Date,
  settings: Pick<ReminderSettings, 'activeHoursStart' | 'activeHoursEnd' | 'activeDays'>
): boolean {
  return (
    isActiveDay(settings.activeDays, when) &&
    isWithinActiveHours(settings.activeHoursStart, settings.activeHoursEnd, when)
  );
}

function atHourOnDate(base: Date, hour: number): Date {
  const d = new Date(base);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Next moment an active-hours window opens (later today or on a future active day). */
export function getNextActiveWindowStart(
  after: Date,
  activeHoursStart: number,
  activeDays: number[]
): Date {
  if (activeDays.length === 0) {
    const fallback = new Date(after);
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
  }

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const day = new Date(after);
    day.setDate(after.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);

    if (!activeDays.includes(day.getDay())) continue;

    const windowStart = atHourOnDate(day, activeHoursStart);
    if (windowStart > after) return windowStart;
  }

  const fallback = atHourOnDate(after, activeHoursStart);
  fallback.setDate(fallback.getDate() + 7);
  return fallback;
}

export function computeNextReminderAt(
  from: Date,
  settings: Pick<
    ReminderSettings,
    'enabled' | 'intervalMinutes' | 'activeHoursStart' | 'activeHoursEnd' | 'activeDays'
  >
): Date | null {
  if (!settings.enabled || settings.activeDays.length === 0) return null;

  let candidate: Date;

  if (isReminderSlot(from, settings)) {
    candidate = new Date(from.getTime() + settings.intervalMinutes * 60 * 1000);
  } else {
    candidate = getNextActiveWindowStart(
      from,
      settings.activeHoursStart,
      settings.activeDays
    );
  }

  let lastMs = 0;
  for (let i = 0; i < 400; i++) {
    if (isReminderSlot(candidate, settings)) return candidate;

    const prevMs = candidate.getTime();
    candidate = getNextActiveWindowStart(
      candidate,
      settings.activeHoursStart,
      settings.activeDays
    );
    if (candidate.getTime() <= prevMs) {
      candidate = new Date(prevMs + 60_000);
    }
    if (candidate.getTime() === lastMs) break;
    lastMs = candidate.getTime();
  }

  return candidate;
}

export function formatNextReminderAt(iso: string, now = new Date()): string {
  const next = new Date(iso);
  const time = next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isSameDay(next, now)) return `Today at ${time}`;

  const dayDiff = differenceInCalendarDays(next, now);
  if (dayDiff === 1) return `Tomorrow at ${time}`;

  return `${format(next, 'EEEE')} at ${time}`;
}
