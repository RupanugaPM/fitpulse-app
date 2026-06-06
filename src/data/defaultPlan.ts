import type { Workout, Exercise } from '../types';

export const DEFAULT_PLAN_ID = 'plan-daily-10x4';

function ex(
  id: string,
  name: string,
  description: string,
  reps: number,
  durationSec = 50,
  tips?: string
): Exercise {
  return { id, name, description, durationSec, reps, tips };
}

export function createDefaultPlan(): Workout {
  return {
    id: DEFAULT_PLAN_ID,
    name: 'Daily 10×4',
    description: '10 push-ups, 10 sit-ups, 10 squats, and 10 pull-ups.',
    category: 'strength',
    difficulty: 'beginner',
    durationMin: 8,
    caloriesEstimate: 65,
    tags: ['default', 'my-plan'],
    isCustom: true,
    isDefaultPlan: true,
    exercises: [
      ex('plan-pushups', 'Push-ups', 'Chest to floor, full extension at top', 10, 55, 'Modify on knees if needed'),
      ex('plan-situps', 'Sit-ups', 'Controlled crunches or full sit-ups', 10, 50),
      ex('plan-squats', 'Squats', 'Thighs parallel, chest up', 10, 55),
      ex('plan-pullups', 'Pull-ups', 'Pull-ups or inverted rows under a sturdy table', 10, 55, 'Jump or step to assist'),
    ],
  };
}
