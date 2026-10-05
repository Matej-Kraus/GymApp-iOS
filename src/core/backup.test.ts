import {
  autoSnapshotReason,
  backupMetaFor,
  daysAgoLabel,
  hasUserData,
  offPhoneBackupStatus,
  parseSnapshotFilename,
  showBackupReminder,
  snoozeBackupReminder,
  snapshotFilename,
  snapshotsToPrune,
  sortSnapshots,
} from './backup'
import { emptyData } from './storage'
import type { AppData, WorkoutSession } from './types'

const NOW = new Date('2026-10-05T12:00:00.000Z')
const daysBefore = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

function session(id: string, date: string, extra: Partial<WorkoutSession> = {}): WorkoutSession {
  return { id, date, splitId: null, splitName: 'Push', entries: [], durationMinutes: 60, notes: '', ...extra }
}

function withSessions(...sessions: WorkoutSession[]): AppData {
  return { ...emptyData(), sessions }
}

describe('názvy snapshotů', () => {
  it('tam a zpět bez dvojteček', () => {
    const name = snapshotFilename(NOW, 'session')
    expect(name).toBe('2026-10-05T12-00-00Z_session.json')
    expect(parseSnapshotFilename(name)).toEqual({
      id: name,
      createdAt: '2026-10-05T12:00:00.000Z',
      reason: 'session',
    })
  })

  it('cizí soubory ignoruje', () => {
    expect(parseSnapshotFilename('workout-backup-2026-10-01.json')).toBeNull()
    expect(parseSnapshotFilename('2026-10-05T12-00-00Z_hack.json')).toBeNull()
  })

  it('řadí od nejnovějšího', () => {
    const names = [snapshotFilename(daysBefore(3), 'weekly'), 'x.txt', snapshotFilename(NOW, 'session')]
    expect(sortSnapshots(names).map((s) => s.reason)).toEqual(['session', 'weekly'])
  })
})

describe('snapshotsToPrune', () => {
  it('nechá 10 automatických a 5 pojistných, maže nejstarší', () => {
    const auto = Array.from({ length: 12 }, (_, i) => snapshotFilename(daysBefore(i), 'session'))
    const safety = Array.from({ length: 6 }, (_, i) => snapshotFilename(daysBefore(i + 0.5), 'before-restore'))
    const pruned = snapshotsToPrune([...auto, ...safety])
    expect(pruned).toEqual([auto[10], auto[11], safety[5]])
  })
})

describe('autoSnapshotReason', () => {
  const data = withSessions(session('a', '2026-10-01T10:00:00.000Z'))

  it('prázdná nebo jen ukázková data nechrání', () => {
    expect(autoSnapshotReason(emptyData(), null, NOW)).toBeNull()
    const sample = withSessions(session('s', '2026-10-01T10:00:00.000Z', { isSample: true }))
    expect(hasUserData(sample)).toBe(false)
    expect(autoSnapshotReason(sample, null, NOW)).toBeNull()
  })

  it('první snapshot hned', () => {
    expect(autoSnapshotReason(data, null, NOW)).toBe('session')
  })

  it('nic se nezměnilo → nic', () => {
    expect(autoSnapshotReason(data, backupMetaFor(data, daysBefore(30)), NOW)).toBeNull()
  })

  it('nový trénink → hned', () => {
    const meta = backupMetaFor(data, NOW)
    const next = withSessions(...data.sessions, session('b', '2026-10-05T11:00:00.000Z'))
    expect(autoSnapshotReason(next, meta, NOW)).toBe('session')
  })

  it('úprava série v tréninku se počítá', () => {
    const meta = backupMetaFor(data, NOW)
    const edited = withSessions({ ...data.sessions[0], notes: 'heavy day' })
    expect(autoSnapshotReason(edited, meta, NOW)).toBe('session')
  })

  it('změna nastavení → týdenní, až po týdnu', () => {
    const changed = { ...data, settings: { ...data.settings, restSeconds: 90 } }
    expect(autoSnapshotReason(changed, backupMetaFor(data, daysBefore(2)), NOW)).toBeNull()
    expect(autoSnapshotReason(changed, backupMetaFor(data, daysBefore(7)), NOW)).toBe('weekly')
  })
})

describe('offPhoneBackupStatus', () => {
  const three = withSessions(
    session('a', '2026-09-01T10:00:00.000Z'),
    session('b', '2026-09-03T10:00:00.000Z'),
    session('c', '2026-09-05T10:00:00.000Z'),
  )

  it('málo dat → nepřipomínat', () => {
    expect(offPhoneBackupStatus(withSessions(session('a', '2026-09-01T10:00:00.000Z')), NOW)).toEqual({
      daysAgo: null,
      stale: false,
    })
  })

  it('nikdy nezálohováno → připomenout', () => {
    expect(offPhoneBackupStatus(three, NOW).stale).toBe(true)
  })

  it('čerstvý export → klid, po 14 dnech připomenout', () => {
    const fresh = { ...three, settings: { ...three.settings, lastExportAt: daysBefore(3).toISOString() } }
    expect(offPhoneBackupStatus(fresh, NOW)).toEqual({ daysAgo: 3, stale: false })
    const old = { ...three, settings: { ...three.settings, lastExportAt: daysBefore(14).toISOString() } }
    expect(offPhoneBackupStatus(old, NOW)).toEqual({ daysAgo: 14, stale: true })
  })

  it('popisky', () => {
    expect([null, 0, 1, 5].map(daysAgoLabel)).toEqual(['never', 'today', 'yesterday', '5 days ago'])
  })
})

describe('připomínka na dashboardu', () => {
  const stale = withSessions(
    session('a', '2026-09-01T10:00:00.000Z'),
    session('b', '2026-09-03T10:00:00.000Z'),
    session('c', '2026-09-05T10:00:00.000Z'),
  )

  it('odložení na 3 dny, pak se vrátí', () => {
    expect(showBackupReminder(stale, NOW)).toBe(true)
    const snoozed = {
      ...stale,
      settings: { ...stale.settings, backupReminderSnoozedUntil: snoozeBackupReminder(NOW) },
    }
    expect(showBackupReminder(snoozed, NOW)).toBe(false)
    expect(showBackupReminder(snoozed, new Date(NOW.getTime() + 3 * 86_400_000 + 1))).toBe(true)
  })
})
