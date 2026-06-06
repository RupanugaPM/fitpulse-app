import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { pickReminderWorkout } from '../utils/reminderWorkout';
import {
  computeNextReminderAt,
  isReminderSlot,
} from '../utils/reminderSchedule';

export function useReminderEngine(onFire: () => void) {
  const reminder = useAppStore((s) => s.reminder);
  const snoozeUntil = useAppStore((s) => s.snoozeUntil);
  const setLastReminder = useAppStore((s) => s.setLastReminder);
  const setNextReminder = useAppStore((s) => s.setNextReminder);
  const firedRef = useRef(false);

  const scheduleNext = useCallback(
    (from = new Date()) => {
      if (!reminder.enabled) {
        setNextReminder(null);
        return;
      }

      let next = computeNextReminderAt(from, reminder);

      const snooze = snoozeUntil ? new Date(snoozeUntil) : null;
      if (snooze && snooze > from) {
        const afterSnooze = computeNextReminderAt(snooze, reminder);
        if (afterSnooze && (!next || afterSnooze.getTime() > next.getTime())) {
          next = afterSnooze;
        } else if (!next) {
          next = snooze;
        }
      }

      setNextReminder(next?.toISOString() ?? null);
    },
    [reminder, snoozeUntil, setNextReminder]
  );

  const pickSuggestedWorkout = useCallback(() => {
    return pickReminderWorkout(reminder.preferredWorkoutIds);
  }, [reminder.preferredWorkoutIds]);

  const fireReminder = useCallback(() => {
    const now = new Date();
    if (snoozeUntil && new Date(snoozeUntil) > now) return;
    if (!reminder.enabled) return;
    if (!isReminderSlot(now, reminder)) {
      scheduleNext(now);
      return;
    }
    if (firedRef.current) return;

    firedRef.current = true;
    setLastReminder(now.toISOString());
    scheduleNext(now);

    const workout = pickSuggestedWorkout();
    const title = 'Time to move!';
    const body = workout
      ? `Try "${workout.name}" (${workout.durationMin} min)`
      : 'Take a quick active break';

    if (reminder.desktopNotifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const n = new Notification(title, {
          body,
          icon: '/favicon.svg',
          tag: 'fitpulse-reminder',
          requireInteraction: true,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      }
    }

    if (reminder.soundEnabled) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch {
        /* audio optional */
      }
    }

    onFire();
    setTimeout(() => {
      firedRef.current = false;
    }, 5000);
  }, [
    reminder,
    snoozeUntil,
    onFire,
    pickSuggestedWorkout,
    scheduleNext,
    setLastReminder,
  ]);

  useEffect(() => {
    if (!reminder.enabled) {
      setNextReminder(null);
      return;
    }

    scheduleNext();

    const intervalMs = 15_000;
    const id = setInterval(() => {
      const state = useAppStore.getState();
      const next = state.nextReminderAt;
      const now = new Date();

      if (!next) {
        scheduleNext(now);
        return;
      }

      if (new Date(next) > now) return;

      if (!isReminderSlot(now, state.reminder)) {
        scheduleNext(now);
        return;
      }

      fireReminder();
    }, intervalMs);

    return () => clearInterval(id);
  }, [
    reminder.enabled,
    reminder.intervalMinutes,
    reminder.activeHoursStart,
    reminder.activeHoursEnd,
    reminder.activeDays,
    snoozeUntil,
    fireReminder,
    scheduleNext,
    setNextReminder,
  ]);

  return { scheduleNext, pickSuggestedWorkout };
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}
