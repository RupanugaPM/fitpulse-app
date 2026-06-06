const MIN = 5;
const MAX = 480;

export function clampReminderMinutes(value: number): number {
  return Math.min(MAX, Math.max(MIN, Math.round(value)));
}

export function formatReminderInterval(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? '1 hour' : `${h} hours`;
  return `${h}h ${m}m`;
}

export const REMINDER_PRESETS = [15, 30, 45, 60, 90, 120] as const;
