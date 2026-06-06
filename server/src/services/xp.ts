/** XP per push-up rep (AI-tracked) */
export const XP_PER_PUSHUP = 15;

/** Bonus XP when hitting session milestones */
export function sessionBonusXp(reps: number): number {
  if (reps >= 50) return 100;
  if (reps >= 30) return 50;
  if (reps >= 20) return 25;
  if (reps >= 10) return 10;
  return 0;
}

export function xpForPushups(reps: number): number {
  return reps * XP_PER_PUSHUP + sessionBonusXp(reps);
}

/** Level 1 at 0 XP, each level needs 200 more XP than the last tier */
export function levelFromXp(totalXp: number): number {
  let level = 1;
  let threshold = 0;
  let step = 200;
  while (totalXp >= threshold + step) {
    threshold += step;
    level += 1;
    step = Math.floor(step * 1.15);
  }
  return level;
}

export function xpToNextLevel(totalXp: number): { current: number; needed: number; progress: number } {
  let level = 1;
  let floor = 0;
  let step = 200;
  while (totalXp >= floor + step) {
    floor += step;
    level += 1;
    step = Math.floor(step * 1.15);
  }
  const needed = floor + step;
  const progress = ((totalXp - floor) / step) * 100;
  return { current: totalXp - floor, needed: step, progress: Math.min(100, progress) };
}
