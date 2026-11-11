import { exerciseHistory, percentTable, roundToStep } from './exerciseHistory'
import type { SetLog, WorkoutSession } from './types'

const set = (weight: number, reps: number, over: Partial<SetLog> = {}): SetLog => ({
  weight, reps, rpe: null, completed: true, role: 'working', isPR: false, ...over,
})

function session(id: string, date: string, sets: SetLog[], exerciseId = 'bench'): WorkoutSession {
  return {
    id, date, splitId: null, splitName: 'Push', durationMinutes: null, notes: '',
    entries: [{ exerciseId, exerciseName: exerciseId, sets }],
  }
}

describe('exerciseHistory', () => {
  const sessions = [
    session('a', '2026-01-01T10:00:00.000Z', [set(100, 5)]),
    session('b', '2026-01-08T10:00:00.000Z', [set(60, 10, { role: 'warmup' }), set(80, 8)]),
    session('c', '2026-01-15T10:00:00.000Z', [set(90, 5, { completed: false })]),
    session('d', '2026-01-22T10:00:00.000Z', [set(50, 10)], 'squat'),
    session('e', '2026-01-29T10:00:00.000Z', [set(85, 6), set(85, 6, { role: 'backoff' })]),
    session('f', '2026-02-05T10:00:00.000Z', [set(82.5, 6)]),
  ]

  it('vrací poslední tréninky od nejnovějšího a přeskakuje prázdné', () => {
    const h = exerciseHistory(sessions, 'bench')
    expect(h.recent.map((r) => r.sessionId)).toEqual(['f', 'e', 'b'])
  })

  it('do sérií nezahrnuje warm-upy ani nedokončené', () => {
    const h = exerciseHistory(sessions, 'bench', 5)
    expect(h.recent.find((r) => r.sessionId === 'b')!.sets).toHaveLength(1)
    expect(h.recent.some((r) => r.sessionId === 'c')).toBe(false)
  })

  it('PR bere z celé historie, ne jen z posledních tréninků', () => {
    const h = exerciseHistory(sessions, 'bench', 1)
    expect(h.recent).toHaveLength(1)
    expect(h.pr).toMatchObject({ weight: 100, reps: 5, date: '2026-01-01T10:00:00.000Z' })
  })

  it('cvik bez historie → prázdný výsledek', () => {
    expect(exerciseHistory(sessions, 'deadlift')).toEqual({ recent: [], pr: null })
  })

  it('při shodě 1RM vyhrává starší výkon', () => {
    const h = exerciseHistory(
      [session('x', '2026-01-01T10:00:00.000Z', [set(100, 5)]), session('y', '2026-02-01T10:00:00.000Z', [set(100, 5)])],
      'bench',
    )
    expect(h.pr!.date).toBe('2026-01-01T10:00:00.000Z')
  })
})

describe('percentTable', () => {
  it('100 % = 1RM na 1 opakování', () => {
    const t = percentTable(100)
    expect(t[0]).toEqual({ percent: 100, weight: 100, reps: 1 })
  })
  it('zaokrouhluje na krok kotoučů', () => {
    expect(percentTable(103, 2.5).find((r) => r.percent === 80)!.weight).toBe(82.5)
    expect(roundToStep(81.5, 2.5)).toBe(82.5)
  })
  it('nesmyslný vstup → prázdná tabulka', () => {
    expect(percentTable(0)).toEqual([])
    expect(percentTable(NaN)).toEqual([])
  })
})
