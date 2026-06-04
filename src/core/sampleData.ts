import type { SetLog, Split, WorkoutSession } from './types'

/**
 * UKÁZKOVÁ DATA — 2 týdny programu Push / Pull / Legs.
 * Každý týden 2× Push, 2× Pull, 2× Legs (celkem 12 tréninků), každý trénink 3 cviky.
 * Váhy rostou trénink od tréninku → v grafech je vidět progres.
 * Vše označeno `isSample: true`, takže to jde v Nastavení hromadně smazat.
 */

const PUSH_ID = 'sample-split-push'
const PULL_ID = 'sample-split-pull'
const LEGS_ID = 'sample-split-legs'
const DAY = 86_400_000
const now = Date.now()

export const SAMPLE_SPLITS: Split[] = [
  { id: PUSH_ID, name: 'Push', exerciseIds: ['bench-barbell', 'overhead-press', 'tricep-pushdown'], groupId: 'ppl', groupName: 'Push / Pull / Legs', isSample: true },
  { id: PULL_ID, name: 'Pull', exerciseIds: ['deadlift', 'row-barbell', 'bicep-curl-db'], groupId: 'ppl', groupName: 'Push / Pull / Legs', isSample: true },
  { id: LEGS_ID, name: 'Legs', exerciseIds: ['squat', 'leg-press', 'leg-curl'], groupId: 'ppl', groupName: 'Push / Pull / Legs', isSample: true },
]

const SPLIT_NAME: Record<string, string> = { [PUSH_ID]: 'Push', [PULL_ID]: 'Pull', [LEGS_ID]: 'Legs' }

/** Plán cviku: startovní pracovní váha, přírůstek na trénink, cílová opakování. */
interface ExPlan { id: string; name: string; start: number; step: number; reps: number }

const PLANS: Record<string, ExPlan[]> = {
  [PUSH_ID]: [
    { id: 'bench-barbell', name: 'Bench Press', start: 60, step: 2.5, reps: 8 },
    { id: 'overhead-press', name: 'Overhead Press', start: 40, step: 2.5, reps: 8 },
    { id: 'tricep-pushdown', name: 'Tricep Pushdown', start: 25, step: 2.5, reps: 10 },
  ],
  [PULL_ID]: [
    { id: 'deadlift', name: 'Deadlift', start: 100, step: 5, reps: 5 },
    { id: 'row-barbell', name: 'Barbell Row', start: 50, step: 2.5, reps: 8 },
    { id: 'bicep-curl-db', name: 'Dumbbell Curl', start: 14, step: 1, reps: 10 },
  ],
  [LEGS_ID]: [
    { id: 'squat', name: 'Squat', start: 80, step: 5, reps: 6 },
    { id: 'leg-press', name: 'Leg Press', start: 120, step: 10, reps: 10 },
    { id: 'leg-curl', name: 'Leg Curl', start: 30, step: 2.5, reps: 12 },
  ],
}

const round2 = (w: number) => Math.round(w / 2.5) * 2.5

function buildEntry(plan: ExPlan, occ: number, isLast: boolean) {
  const w = plan.start + plan.step * occ
  const sets: SetLog[] = [
    { weight: round2(w * 0.5), reps: 10, rpe: null, completed: true, role: 'warmup', isPR: false },
    { weight: w, reps: plan.reps, rpe: 8, completed: true, role: 'working', isPR: isLast },
    { weight: w, reps: plan.reps - 1, rpe: 9, completed: true, role: 'working', isPR: false },
    { weight: round2(w * 0.8), reps: plan.reps + 4, rpe: null, completed: true, role: 'backoff', isPR: false },
  ]
  return { exerciseId: plan.id, exerciseName: plan.name, sets }
}

// Rozvrh 2 týdnů: každý týden Push, Pull, Legs, Push, Pull, Legs.
// Od nejstaršího (offset 13 dní) po nejnovější → occ roste, váhy rostou.
const WEEK_ORDER = [PUSH_ID, PULL_ID, LEGS_ID, PUSH_ID, PULL_ID, LEGS_ID]
const DAY_OFFSETS = [13, 12, 11, 10, 9, 8, 6, 5, 4, 3, 2, 1] // 2 týdny, vždy 1 den volna

function buildSessions(): WorkoutSession[] {
  const occ: Record<string, number> = { [PUSH_ID]: 0, [PULL_ID]: 0, [LEGS_ID]: 0 }
  const sessions: WorkoutSession[] = []
  for (let i = 0; i < DAY_OFFSETS.length; i++) {
    const splitId = WEEK_ORDER[i % WEEK_ORDER.length]
    const k = occ[splitId]
    const isLast = k === 3 // 4. (poslední) výskyt daného typu = nejtěžší → PR
    const entries = PLANS[splitId].map((p) => buildEntry(p, k, isLast))
    sessions.push({
      id: `sample-${splitId}-${k}`,
      date: new Date(now - DAY_OFFSETS[i] * DAY).toISOString(),
      splitId,
      splitName: SPLIT_NAME[splitId],
      entries,
      durationMinutes: 55,
      notes: '',
      isSample: true,
    })
    occ[splitId] = k + 1
  }
  return sessions
}

export const SAMPLE_SESSIONS: WorkoutSession[] = buildSessions()
