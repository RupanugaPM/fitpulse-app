import type { Workout, Exercise } from '../types';

const ex = (
  id: string,
  name: string,
  description: string,
  durationSec: number,
  reps?: number,
  tips?: string
): Exercise => ({ id, name, description, durationSec, reps, tips });

export const WORKOUTS: Workout[] = [
  {
    id: 'desk-reset-5',
    name: 'Desk Reset',
    description: 'Quick relief for neck, shoulders, and wrists after sitting.',
    category: 'desk',
    difficulty: 'beginner',
    durationMin: 5,
    caloriesEstimate: 25,
    tags: ['office', 'quick', 'posture'],
    exercises: [
      ex('neck-roll', 'Neck Rolls', 'Slow circles — 5 each direction', 45, undefined, 'Move gently, no forcing'),
      ex('shoulder-shrug', 'Shoulder Shrugs', 'Lift shoulders to ears, hold, release', 40, 10),
      ex('wrist-circles', 'Wrist Circles', 'Extend arms, rotate wrists', 30, 15),
      ex('seated-twist', 'Seated Spinal Twist', 'Twist left and right holding chair', 60, 8),
      ex('chest-opener', 'Chest Opener', 'Clasp hands behind, open chest', 45, 5),
    ],
  },
  {
    id: 'power-7',
    name: '7-Minute Power',
    description: 'High-intensity bodyweight burst to wake up your metabolism.',
    category: 'cardio',
    difficulty: 'intermediate',
    durationMin: 7,
    caloriesEstimate: 70,
    tags: ['hiit', 'no equipment'],
    exercises: [
      ex('jumping-jacks', 'Jumping Jacks', 'Full range, land softly', 45, undefined, 'Modify: step jacks'),
      ex('squats', 'Bodyweight Squats', 'Chest up, knees track toes', 45, 15),
      ex('pushups', 'Push-Ups', 'Core tight, full ROM', 45, 12, 'Knee push-ups OK'),
      ex('lunges', 'Alternating Lunges', 'Back knee toward floor', 45, 12),
      ex('plank', 'Plank Hold', 'Straight line head to heels', 45),
      ex('burpees', 'Burpees', 'Controlled pace', 45, 8, 'Step back if needed'),
      ex('mountain', 'Mountain Climbers', 'Hips level, quick feet', 45, 20),
    ],
  },
  {
    id: 'stretch-flow-10',
    name: 'Full Body Stretch',
    description: 'Improve flexibility and reduce muscle tension.',
    category: 'stretch',
    difficulty: 'beginner',
    durationMin: 10,
    caloriesEstimate: 35,
    tags: ['flexibility', 'recovery'],
    exercises: [
      ex('cat-cow', 'Cat-Cow', 'Sync breath with spine movement', 60, 10),
      ex('hip-flexor', 'Hip Flexor Stretch', '30 sec each side', 60),
      ex('hamstring', 'Standing Hamstring', 'Hinge at hips, soft knees', 60, 4),
      ex('quad-stretch', 'Quad Stretch', 'Hold wall for balance', 60, 2),
      ex('child-pose', "Child's Pose", 'Breathe into lower back', 90),
      ex('shoulder-stretch', 'Cross-Body Shoulder', '30 sec each arm', 60),
    ],
  },
  {
    id: 'core-blast-8',
    name: 'Core Blast',
    description: 'Target abs and obliques with zero equipment.',
    category: 'core',
    difficulty: 'intermediate',
    durationMin: 8,
    caloriesEstimate: 55,
    tags: ['abs', 'strength'],
    exercises: [
      ex('dead-bug', 'Dead Bug', 'Lower back pressed to floor', 50, 12),
      ex('bicycle', 'Bicycle Crunches', 'Elbow to opposite knee', 45, 20),
      ex('russian', 'Russian Twists', 'Feet up for challenge', 45, 24),
      ex('leg-raises', 'Leg Raises', 'Control the descent', 45, 12),
      ex('side-plank', 'Side Plank', '30 sec each side', 60),
      ex('flutter', 'Flutter Kicks', 'Small kicks, core engaged', 45, 30),
    ],
  },
  {
    id: 'mobility-hip-6',
    name: 'Hip Mobility',
    description: 'Open tight hips from sitting — great between meetings.',
    category: 'mobility',
    difficulty: 'beginner',
    durationMin: 6,
    caloriesEstimate: 20,
    tags: ['hips', 'mobility'],
    exercises: [
      ex('90-90', '90/90 Hip Switches', 'Controlled transitions', 60, 10),
      ex('pigeon', 'Pigeon Pose', '45 sec each side', 90),
      ex('frog', 'Frog Stretch', 'Knees wide, rock gently', 60),
      ex('glute-bridge', 'Glute Bridges', 'Squeeze at top', 45, 15),
      ex('clamshell', 'Clamshells', 'Band optional', 45, 12),
    ],
  },
  {
    id: 'upper-strength-12',
    name: 'Upper Body Strength',
    description: 'Push, pull, and stabilize — build functional upper strength.',
    category: 'strength',
    difficulty: 'intermediate',
    durationMin: 12,
    caloriesEstimate: 85,
    tags: ['upper body', 'strength'],
    exercises: [
      ex('arm-circles', 'Arm Circles Warm-Up', 'Small to large circles', 40, 20),
      ex('pushup-wide', 'Wide Push-Ups', 'Hands wider than shoulders', 50, 12),
      ex('diamond', 'Diamond Push-Ups', 'Tricep focus', 50, 10),
      ex('pike', 'Pike Push-Ups', 'Hips high for shoulders', 50, 10),
      ex('superman', 'Superman Hold', 'Lift arms and legs', 45, 8),
      ex('tricep-dip', 'Chair Tricep Dips', 'Elbows back', 50, 12),
      ex('plank-shoulder', 'Plank Shoulder Taps', 'Minimize hip sway', 50, 16),
    ],
  },
  {
    id: 'cardio-walk-5',
    name: 'Indoor Cardio Walk',
    description: 'Low-impact movement — perfect for small spaces.',
    category: 'cardio',
    difficulty: 'beginner',
    durationMin: 5,
    caloriesEstimate: 30,
    tags: ['low impact', 'beginner'],
    exercises: [
      ex('march', 'High Knee March', 'Pump arms', 60),
      ex('side-step', 'Side Steps', 'Stay light on feet', 45, 20),
      ex('toe-tap', 'Toe Taps', 'Tap step or floor', 45, 24),
      ex('boxer', 'Boxer Shuffle', 'Quick feet', 45),
      ex('cooldown-walk', 'Cooldown March', 'Slow breathing', 60),
    ],
  },
  {
    id: 'yoga-desk-8',
    name: 'Office Yoga Flow',
    description: 'Calming flow you can do in work clothes.',
    category: 'yoga',
    difficulty: 'beginner',
    durationMin: 8,
    caloriesEstimate: 30,
    tags: ['yoga', 'mindfulness'],
    exercises: [
      ex('mountain', 'Mountain Pose', 'Ground through feet', 30),
      ex('forward-fold', 'Standing Forward Fold', 'Bend knees as needed', 45),
      ex('warrior-1', 'Warrior I', 'Each side', 60, 2),
      ex('tree', 'Tree Pose', 'Find a focal point', 60, 2),
      ex('down-dog', 'Downward Dog', 'Pedal feet', 60),
      ex('savasana-mini', 'Seated Breath', '4-4-4-4 box breathing', 90),
    ],
  },
  {
    id: 'legs-burn-10',
    name: 'Leg Day Lite',
    description: 'Squats, lunges, and calves without gym equipment.',
    category: 'strength',
    difficulty: 'advanced',
    durationMin: 10,
    caloriesEstimate: 90,
    tags: ['legs', 'strength'],
    exercises: [
      ex('squat-pulse', 'Squat Pulses', 'Stay in bottom range', 45, 20),
      ex('jump-squat', 'Jump Squats', 'Land quietly', 45, 12),
      ex('reverse-lunge', 'Reverse Lunges', 'Each leg', 50, 16),
      ex('wall-sit', 'Wall Sit', 'Thighs parallel', 60),
      ex('calf-raise', 'Calf Raises', 'Full stretch at bottom', 45, 20),
      ex('single-leg', 'Single Leg Deadlift', 'Balance focus', 50, 10),
    ],
  },
  {
    id: 'micro-2',
    name: '2-Min Micro Break',
    description: 'Absolute minimum — stand, breathe, move.',
    category: 'desk',
    difficulty: 'beginner',
    durationMin: 2,
    caloriesEstimate: 10,
    tags: ['micro', 'fastest'],
    exercises: [
      ex('stand', 'Stand & Reach', 'Reach overhead, side bends', 40),
      ex('breath', 'Deep Breathing', 'In 4, hold 4, out 4', 40),
      ex('squat-mini', 'Mini Squats', 'Just 10 reps', 40, 10),
    ],
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  stretch: 'Stretch',
  strength: 'Strength',
  cardio: 'Cardio',
  mobility: 'Mobility',
  desk: 'Desk / Office',
  core: 'Core',
  yoga: 'Yoga',
};

export function getWorkoutById(id: string): Workout | undefined {
  return WORKOUTS.find((w) => w.id === id);
}

export function getAllExercises(): Exercise[] {
  const map = new Map<string, Exercise>();
  for (const w of WORKOUTS) {
    for (const e of w.exercises) map.set(e.id, e);
  }
  return [...map.values()];
}
