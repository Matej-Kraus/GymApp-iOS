import type { Split, WorkoutSession } from './types'

const SAMPLE_SPLIT_PUSH_ID = 'sample-split-push'
const SAMPLE_SPLIT_PULL_ID = 'sample-split-pull'

const now = Date.now()
const DAY = 86_400_000

export const SAMPLE_SPLITS: Split[] = [
  {
    id: SAMPLE_SPLIT_PUSH_ID,
    name: 'Push',
    exerciseIds: ['bench-barbell', 'bench-incline-db', 'overhead-press', 'tricep-pushdown', 'cable-fly', 'lateral-raise'],
    groupId: 'ppl',
    groupName: 'Push / Pull / Legs',
    isSample: true,
  },
  {
    id: SAMPLE_SPLIT_PULL_ID,
    name: 'Pull',
    exerciseIds: ['deadlift', 'pullup', 'row-barbell', 'lat-pulldown', 'bicep-curl-db', 'face-pull'],
    groupId: 'ppl',
    groupName: 'Push / Pull / Legs',
    isSample: true,
  },
]

export const SAMPLE_SESSIONS: WorkoutSession[] = [
  {
    id: 'sample-session-push',
    date: new Date(now - 7 * DAY).toISOString(),
    splitId: SAMPLE_SPLIT_PUSH_ID,
    splitName: 'Push',
    durationMinutes: 58,
    notes: '',
    isSample: true,
    entries: [
      {
        exerciseId: 'bench-barbell',
        exerciseName: 'Bench Press',
        sets: [
          { weight: 40, reps: 10, rpe: null, completed: true, role: 'warmup', isPR: false },
          { weight: 60, reps: 8,  rpe: null, completed: true, role: 'warmup', isPR: false },
          { weight: 80, reps: 6,  rpe: 8,    completed: true, role: 'working', isPR: false },
          { weight: 80, reps: 5,  rpe: 9,    completed: true, role: 'working', isPR: false },
          { weight: 64, reps: 12, rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
      {
        exerciseId: 'bench-incline-db',
        exerciseName: 'Incline Dumbbell Press',
        sets: [
          { weight: 20, reps: 10, rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 35, reps: 8,  rpe: 7,    completed: true, role: 'working', isPR: false },
          { weight: 35, reps: 7,  rpe: 8,    completed: true, role: 'working', isPR: false },
          { weight: 28, reps: 14, rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
      {
        exerciseId: 'overhead-press',
        exerciseName: 'Overhead Press',
        sets: [
          { weight: 30, reps: 10, rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 55, reps: 6,  rpe: 8,    completed: true, role: 'working', isPR: false },
          { weight: 55, reps: 5,  rpe: 9,    completed: true, role: 'working', isPR: false },
          { weight: 44, reps: 11, rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
      {
        exerciseId: 'tricep-pushdown',
        exerciseName: 'Tricep Pushdown',
        sets: [
          { weight: 20, reps: 12, rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 40, reps: 8,  rpe: 7,    completed: true, role: 'working', isPR: false },
          { weight: 40, reps: 7,  rpe: 8,    completed: true, role: 'working', isPR: false },
          { weight: 32, reps: 15, rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
      {
        exerciseId: 'cable-fly',
        exerciseName: 'Cable Fly',
        sets: [
          { weight: 10, reps: 12, rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 20, reps: 10, rpe: 7,    completed: true, role: 'working', isPR: false },
          { weight: 20, reps: 9,  rpe: 8,    completed: true, role: 'working', isPR: false },
          { weight: 16, reps: 15, rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
      {
        exerciseId: 'lateral-raise',
        exerciseName: 'Lateral Raise',
        sets: [
          { weight: 8,  reps: 12, rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 14, reps: 10, rpe: 7,    completed: true, role: 'working', isPR: false },
          { weight: 14, reps: 9,  rpe: 8,    completed: true, role: 'working', isPR: false },
          { weight: 11, reps: 18, rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
    ],
  },
  {
    id: 'sample-session-pull',
    date: new Date(now - 5 * DAY).toISOString(),
    splitId: SAMPLE_SPLIT_PULL_ID,
    splitName: 'Pull',
    durationMinutes: 52,
    notes: 'Skvělý deadlift dnes.',
    isSample: true,
    entries: [
      {
        exerciseId: 'deadlift',
        exerciseName: 'Deadlift',
        sets: [
          { weight: 60,  reps: 10, rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 100, reps: 5,  rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 140, reps: 5,  rpe: 8,    completed: true, role: 'working', isPR: true  },
          { weight: 112, reps: 8,  rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
      {
        exerciseId: 'pullup',
        exerciseName: 'Pull-up',
        sets: [
          { weight: 0,  reps: 8,  rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 10, reps: 6,  rpe: 7,    completed: true, role: 'working', isPR: false },
          { weight: 10, reps: 5,  rpe: 8,    completed: true, role: 'working', isPR: false },
          { weight: 0,  reps: 14, rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
      {
        exerciseId: 'row-barbell',
        exerciseName: 'Barbell Row',
        sets: [
          { weight: 60, reps: 8,  rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 90, reps: 6,  rpe: 8,    completed: true, role: 'working', isPR: false },
          { weight: 90, reps: 5,  rpe: 9,    completed: true, role: 'working', isPR: false },
          { weight: 72, reps: 12, rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
      {
        exerciseId: 'lat-pulldown',
        exerciseName: 'Lat Pulldown',
        sets: [
          { weight: 40, reps: 10, rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 70, reps: 8,  rpe: 7,    completed: true, role: 'working', isPR: false },
          { weight: 70, reps: 7,  rpe: 8,    completed: true, role: 'working', isPR: false },
          { weight: 56, reps: 14, rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
      {
        exerciseId: 'bicep-curl-db',
        exerciseName: 'Dumbbell Bicep Curl',
        sets: [
          { weight: 12, reps: 12, rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 20, reps: 8,  rpe: 7,    completed: true, role: 'working', isPR: false },
          { weight: 20, reps: 7,  rpe: 8,    completed: true, role: 'working', isPR: false },
          { weight: 16, reps: 14, rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
      {
        exerciseId: 'face-pull',
        exerciseName: 'Face Pull',
        sets: [
          { weight: 15, reps: 15, rpe: null, completed: true, role: 'warmup',  isPR: false },
          { weight: 25, reps: 12, rpe: 7,    completed: true, role: 'working', isPR: false },
          { weight: 25, reps: 11, rpe: 8,    completed: true, role: 'working', isPR: false },
          { weight: 20, reps: 18, rpe: null, completed: true, role: 'backoff', isPR: false },
        ],
      },
    ],
  },
]
