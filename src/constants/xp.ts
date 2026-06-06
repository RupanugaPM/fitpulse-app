/** Must match server XP_PER_PUSHUP */
export const XP_PER_PUSHUP = 15;

export function estimatePushupXp(reps: number): number {
  let bonus = 0;
  if (reps >= 50) bonus = 100;
  else if (reps >= 30) bonus = 50;
  else if (reps >= 20) bonus = 25;
  else if (reps >= 10) bonus = 10;
  return reps * XP_PER_PUSHUP + bonus;
}
