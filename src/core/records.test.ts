import { bestE1RM, markPRs } from './records'
import type { SetLog, WorkoutSession } from './types'

function set(weight: number, reps: number, role: SetLog['role'] = 'working'): SetLog {
  return { weight, reps, rpe: null, completed: true, role, isPR: false }
}
function session(id: string, date: string, sets: SetLog[]): WorkoutSession {
  return {
    id, date, splitId: null, splitName: 'Push',
    entries: [{ exerciseId: 'bench', exerciseName: 'Bench Press', sets }],
    durationMinutes: null, notes: '',
  }
}

// — bestE1RM —
test('bestE1RM: prázdná historie = 0', () => {
  expect(bestE1RM([], 'bench')).toBe(0)
})
test('bestE1RM: warmup se nezapočítá', () => {
  expect(bestE1RM([session('s1', '2026-01-01T10:00:00.000Z', [set(100, 5, 'warmup')])], 'bench')).toBe(0)
})
test('bestE1RM: vrátí nejvyšší 1RM napříč tréninky', () => {
  const sessions = [
    session('s1', '2026-01-01T10:00:00.000Z', [set(80, 5)]),
    session('s2', '2026-01-08T10:00:00.000Z', [set(82.5, 5)]),
  ]
  expect(bestE1RM(sessions, 'bench')).toBeCloseTo(82.5 * (1 + 5 / 30), 2)
})

// — markPRs —
test('markPRs: první trénink bez historie = PR', () => {
  const s = session('s1', '2026-01-01T10:00:00.000Z', [set(80, 5)])
  const marked = markPRs(s, [])
  expect(marked.entries[0].sets[0].isPR).toBe(true)
})
test('markPRs: warmup nikdy není PR', () => {
  const s = session('s1', '2026-01-01T10:00:00.000Z', [set(80, 5, 'warmup')])
  const marked = markPRs(s, [])
  expect(marked.entries[0].sets[0].isPR).toBe(false)
})
test('markPRs: nepřekoná-li 1RM, není PR', () => {
  const history = [session('s0', '2026-01-01T10:00:00.000Z', [set(100, 5)])]
  const s = session('s1', '2026-01-08T10:00:00.000Z', [set(80, 5)])
  const marked = markPRs(s, history)
  expect(marked.entries[0].sets[0].isPR).toBe(false)
})
test('markPRs: překonání 1RM = PR', () => {
  const history = [session('s0', '2026-01-01T10:00:00.000Z', [set(80, 5)])]
  const s = session('s1', '2026-01-08T10:00:00.000Z', [set(82.5, 5)])
  const marked = markPRs(s, history)
  expect(marked.entries[0].sets[0].isPR).toBe(true)
})
test('markPRs: jen jedna série = PR (nejlepší z dnešního tréninku)', () => {
  const s = session('s1', '2026-01-01T10:00:00.000Z', [set(80, 5), set(80, 5)])
  const marked = markPRs(s, [])
  expect(marked.entries[0].sets[0].isPR).toBe(true)
  expect(marked.entries[0].sets[1].isPR).toBe(false) // stejný výkon = ne PR
})
