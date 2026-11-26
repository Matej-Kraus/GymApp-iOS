import { toImportableSessions, dedupeAgainstExisting } from './healthImport'
import type { HealthWorkout } from './health'
import type { WorkoutSession } from '@/core'

function workout(uuid: string, activityType: number): HealthWorkout {
  return {
    uuid,
    activityType,
    date: '2026-06-01',
    startDateISO: '2026-06-01T18:00:00.000Z',
    durationMin: 45,
    energyKcal: 320,
  }
}

test('toImportableSessions vyřadí neposilovací typ (running)', () => {
  const result = toImportableSessions([workout('w1', 37 /* running */)])
  expect(result).toHaveLength(0)
})

test('toImportableSessions zachová silové typy', () => {
  const result = toImportableSessions([
    workout('w1', 20 /* functionalStrengthTraining */),
    workout('w2', 50 /* traditionalStrengthTraining */),
    workout('w3', 59 /* coreTraining */),
  ])
  expect(result).toHaveLength(3)
  expect(result.every((s) => s.source === 'healthkit')).toBe(true)
  expect(result.every((s) => s.entries.length === 0)).toBe(true)
})

test('toImportableSessions mapuje uuid na externalId a startDateISO na date', () => {
  const [session] = toImportableSessions([workout('watch-uuid-1', 50)])
  expect(session.externalId).toBe('watch-uuid-1')
  expect(session.date).toBe('2026-06-01T18:00:00.000Z')
})

function importedSession(externalId: string): WorkoutSession {
  return {
    id: 'x', date: '2026-06-01T18:00:00.000Z', splitId: null, splitName: 'Watch',
    entries: [], durationMinutes: 45, notes: '', source: 'healthkit', externalId,
  }
}

test('dedupeAgainstExisting odfiltruje už importované externalId', () => {
  const imported = toImportableSessions([workout('w1', 50)])
  const existing = [importedSession('w1')]
  expect(dedupeAgainstExisting(imported, existing)).toHaveLength(0)
})

test('dedupeAgainstExisting zachová nové záznamy', () => {
  const imported = toImportableSessions([workout('w1', 50), workout('w2', 50)])
  const existing = [importedSession('w1')]
  const result = dedupeAgainstExisting(imported, existing)
  expect(result).toHaveLength(1)
  expect(result[0].externalId).toBe('w2')
})

test('dedupeAgainstExisting je no-op při opakovaném běhu na vlastním výstupu', () => {
  const imported = toImportableSessions([workout('w1', 50), workout('w2', 50)])
  const firstRun = dedupeAgainstExisting(imported, [])
  const secondRun = dedupeAgainstExisting(toImportableSessions([workout('w1', 50), workout('w2', 50)]), firstRun)
  expect(secondRun).toHaveLength(0)
})
