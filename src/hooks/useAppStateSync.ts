import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { appStateApi } from '../api/client';
import {
  applySyncableState,
  mergeAppStates,
  pickSyncableState,
  type SyncableAppState,
} from '../utils/appStateSync';

const SAVE_DEBOUNCE_MS = 1500;

let hydrating = false;

export function isAppStateHydrating() {
  return hydrating;
}

/** Push this browser's local data to SQLite (merge if server already has data). */
export async function migrateLocalDataToSql(): Promise<{
  ok: boolean;
  message: string;
  counts: { sessions: number; plans: number; statsDays: number };
}> {
  const token = localStorage.getItem('fitpulse_token');
  if (!token) {
    return { ok: false, message: 'Sign in first to save data to SQL.', counts: { sessions: 0, plans: 0, statsDays: 0 } };
  }

  hydrating = true;
  try {
    const local = applySyncableState(pickSyncableState(useAppStore.getState()));
    const { state: remote } = await appStateApi.get();
    const merged = remote ? mergeAppStates(local, remote) : local;
    const normalized = applySyncableState(merged);

    await appStateApi.save(normalized);
    useAppStore.setState(normalized);

    return {
      ok: true,
      message: remote
        ? 'Local data merged with your account and saved to SQL.'
        : 'Local data uploaded to SQL.',
      counts: {
        sessions: normalized.history.length,
        plans: normalized.workoutPlans.filter((p) => !p.isDefaultPlan).length,
        statsDays: normalized.dailyStats.length,
      },
    };
  } finally {
    hydrating = false;
  }
}

/** Load/save reminders, plans, and progress to SQL when signed in. */
export function useAppStateSync() {
  const user = useAuthStore((s) => s.user);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJson = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      lastSavedJson.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      hydrating = true;
      try {
        const { state: remote } = await appStateApi.get();
        if (cancelled) return;

        const local = pickSyncableState(useAppStore.getState());
        let merged: SyncableAppState;

        if (remote) {
          merged = mergeAppStates(local, remote);
        } else {
          merged = applySyncableState(local);
        }

        useAppStore.setState(merged);
        await appStateApi.save(merged);
        lastSavedJson.current = JSON.stringify(merged);
      } catch (err) {
        console.warn('FitPulse: could not sync app state from server', err);
      } finally {
        hydrating = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const scheduleSave = () => {
      if (hydrating) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const payload = applySyncableState(pickSyncableState(useAppStore.getState()));
          const json = JSON.stringify(payload);
          if (json === lastSavedJson.current) return;
          await appStateApi.save(payload);
          lastSavedJson.current = json;
        } catch (err) {
          console.warn('FitPulse: could not save app state to server', err);
        }
      }, SAVE_DEBOUNCE_MS);
    };

    const unsub = useAppStore.subscribe(scheduleSave);
    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [user?.id]);
}
