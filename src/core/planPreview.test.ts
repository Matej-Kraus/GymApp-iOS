import { planDelta, planPreview } from './planPreview'
import type { SetLog, Split, WorkoutSession } from './types'

const set = (weight: number, reps: number, rpe: number | null = 8): SetLog => ({
  weight, reps, rpe, completed: true, role: 'working', isPR: false,
})

const split: Split = { id: 's', name: 'Push', exerciseIds: ['bench-barbell', 'overhead-press', 'nope'] } as Split
const sessions: WorkoutSession[] = [
  {
    id: 'a', date: '2026-01-01T10:00:00.000Z', splitId: 's', splitName: 'Push',
    durationMinutes: 60, notes: '',
    entries: [{ exerciseId: 'bench-barbell', exerciseName: 'Bench', sets: [set(80, 6)] }],
  },
]
const settings = { unit: 'kg' as const, smallestPlateKg: 2.5 }

describe('planPreview', () => {
  const rows = planPreview(split, sessions, [], settings)

  it('přeskočí neznámé cviky a zachová pořadí splitu', () => {
    expect(rows.map((r) => r.exercise.id)).toEqual(['bench-barbell', 'overhead-press'])
  })

  it('cvik s historií má minulý výkon i cíl', () => {
    expect(rows[0].last).toMatchObject({ weight: 80, reps: 6 })
    expect(rows[0].target).not.toBeNull()
  })

  it('cvik bez historie nemá cíl ani rozdíl', () => {
    expect(rows[1].last).toBeNull()
    expect(rows[1].target).toBeNull()
    expect(planDelta(rows[1])).toBeNull()
  })
})

describe('planDelta', () => {
  const base = planPreview(split, sessions, [], settings)[0]
  const withTarget = (weight: number, reps: number) => ({ ...base, target: { weight, reps } })

  it('váha má přednost před opakováními', () => {
    expect(planDelta(withTarget(82.5, 5))).toEqual({ kind: 'weight', kg: 2.5 })
    expect(planDelta(withTarget(72, 6))).toEqual({ kind: 'weight', kg: -8 })
  })
  it('stejná váha → rozdíl opakování', () => {
    expect(planDelta(withTarget(80, 7))).toEqual({ kind: 'reps', reps: 1 })
  })
  it('nic se nemění', () => {
    expect(planDelta(withTarget(80, 6))).toEqual({ kind: 'same' })
  })
})
