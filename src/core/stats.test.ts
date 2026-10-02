import {
  epley1RM,
  countsTowardProgress,
  setVolume,
  entryVolume,
  sessionVolume,
  countScoringSets,
  workoutStreakWeeks,
  volumeLast30Days,
  topMuscleGroup,
} from './stats'
import type { SetLog, WorkoutEntry, WorkoutSession } from './types'

function set(weight: number, reps: number, role: SetLog['role'] = 'working', completed = true): SetLog {
  return { weight, reps, rpe: null, completed, role, isPR: false }
}
function entry(exerciseId: string, sets: SetLog[]): WorkoutEntry {
  return { exerciseId, exerciseName: exerciseId, sets }
}
function session(id: string, date: string, entries: WorkoutEntry[]): WorkoutSession {
  return { id, date, splitId: null, splitName: 'Test', entries, durationMinutes: null, notes: '' }
}

// — epley1RM —
test('epley1RM: 1 rep = váha', () => {
  expect(epley1RM(100, 1)).toBe(100)
})
test('epley1RM: 0 nebo záporné reps = 0', () => {
  expect(epley1RM(100, 0)).toBe(0)
  expect(epley1RM(100, -1)).toBe(0)
})
test('epley1RM: 5×80 ≈ 93.3', () => {
  expect(epley1RM(80, 5)).toBeCloseTo(93.33, 1)
})

// — countsTowardProgress —
test('warmup se nepočítá', () => {
  expect(countsTowardProgress(set(60, 10, 'warmup'))).toBe(false)
})
test('working dokončená se počítá', () => {
  expect(countsTowardProgress(set(80, 5, 'working'))).toBe(true)
})
test('nedokončená série se nepočítá', () => {
  expect(countsTowardProgress({ ...set(80, 5), completed: false })).toBe(false)
})

// — setVolume / entryVolume / sessionVolume —
test('setVolume = váha × opakování', () => {
  expect(setVolume(set(80, 5))).toBe(400)
})
test('entryVolume ignoruje warmup a nedokončené', () => {
  const e = entry('bench', [
    set(40, 10, 'warmup'),
    set(80, 5, 'working'),
    set(64, 8, 'backoff'),
    { ...set(80, 5), completed: false },
  ])
  expect(entryVolume(e)).toBe(80 * 5 + 64 * 8) // 400 + 512 = 912
})
test('sessionVolume sčítá přes všechny cviky', () => {
  const s = session('s1', '2026-01-01T10:00:00.000Z', [
    entry('bench', [set(80, 5)]),
    entry('squat', [set(100, 5)]),
  ])
  expect(sessionVolume(s)).toBe(400 + 500)
})

// — countScoringSets —
test('countScoringSets počítá jen working/backoff dokončené', () => {
  const s = session('s1', '2026-01-01T10:00:00.000Z', [
    entry('bench', [
      set(40, 10, 'warmup'),
      set(80, 5, 'working'),
      set(64, 8, 'backoff'),
      { ...set(80, 5), completed: false },
    ]),
  ])
  expect(countScoringSets(s)).toBe(2)
})

// — workoutStreakWeeks —
test('prázdná historie = 0', () => {
  expect(workoutStreakWeeks([])).toBe(0)
})
test('streak = počet po sobě jdoucích týdnů', () => {
  const now = new Date()
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)
  const sessions = [
    session('s1', thisMonday.toISOString(), [entry('bench', [set(80, 5)])]),
    session('s2', lastMonday.toISOString(), [entry('bench', [set(80, 5)])]),
  ]
  expect(workoutStreakWeeks(sessions)).toBe(2)
})

// — volumeLast30Days —
test('volumeLast30Days zahrnuje jen posledních 30 dní', () => {
  const recent = session('s1', new Date().toISOString(), [entry('bench', [set(80, 5)])])
  const old = session('s2', '2020-01-01T10:00:00.000Z', [entry('bench', [set(80, 5)])])
  expect(volumeLast30Days([recent, old])).toBe(400)
})

// — topMuscleGroup —
test('topMuscleGroup vrátí nejčastější svalovou skupinu', () => {
  const s1 = session('s1', '2026-01-01T10:00:00.000Z', [entry('bench-barbell', [])])
  const s2 = session('s2', '2026-01-02T10:00:00.000Z', [entry('bench-barbell', [])])
  const s3 = session('s3', '2026-01-03T10:00:00.000Z', [entry('overhead-press', [])])
  const result = topMuscleGroup([s1, s2, s3], [])
  expect(result).toBe('Chest')
})
test('topMuscleGroup na prázdné historii = null', () => {
  expect(topMuscleGroup([], [])).toBeNull()
})
