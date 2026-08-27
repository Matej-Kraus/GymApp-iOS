import {
  currentWeek,
  defaultMesocycle,
  deloadSignals,
  isDeloadWeek,
  volumeTargetMultiplier,
} from './mesocycle'
import type { Exercise, MesocycleConfig, SetLog, WorkoutSession } from './types'

const meso: MesocycleConfig = { startDate: '2026-08-03', lengthWeeks: 5, deloadWeek: true }

describe('currentWeek', () => {
  it('den startu je týden 1', () => {
    expect(currentWeek(meso, '2026-08-03')).toBe(1)
  })

  it('šestý den je pořád týden 1, sedmý už týden 2', () => {
    expect(currentWeek(meso, '2026-08-09')).toBe(1)
    expect(currentWeek(meso, '2026-08-10')).toBe(2)
  })

  it('po konci cyklu se začíná znovu od jedničky', () => {
    // 5 týdnů = 35 dní; 36. den je zase týden 1.
    expect(currentWeek(meso, '2026-09-06')).toBe(5)
    expect(currentWeek(meso, '2026-09-07')).toBe(1)
  })

  it('datum před startem → týden 1, ne záporné číslo', () => {
    expect(currentWeek(meso, '2026-07-01')).toBe(1)
  })
})

describe('isDeloadWeek', () => {
  it('poslední týden cyklu je deload', () => {
    expect(isDeloadWeek(meso, '2026-08-31')).toBe(true) // týden 5
  })

  it('týdny akumulace nejsou deload', () => {
    for (const date of ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24']) {
      expect(isDeloadWeek(meso, date)).toBe(false)
    }
  })

  it('s vypnutým deloadem není deload nikdy', () => {
    expect(isDeloadWeek({ ...meso, deloadWeek: false }, '2026-08-31')).toBe(false)
  })
})

describe('volumeTargetMultiplier', () => {
  it('roste přes týdny akumulace', () => {
    const w1 = volumeTargetMultiplier(meso, '2026-08-03')
    const w4 = volumeTargetMultiplier(meso, '2026-08-24')
    expect(w4).toBeGreaterThan(w1)
  })

  it('první týden začíná na MEV úrovni, ne na plném objemu', () => {
    expect(volumeTargetMultiplier(meso, '2026-08-03')).toBeLessThan(1)
  })

  it('poslední týden akumulace je plný objem', () => {
    expect(volumeTargetMultiplier(meso, '2026-08-24')).toBe(1)
  })

  it('deload výrazně ubere', () => {
    expect(volumeTargetMultiplier(meso, '2026-08-31')).toBeLessThanOrEqual(0.6)
  })
})

describe('defaultMesocycle', () => {
  it('4 týdny akumulace + 1 deload', () => {
    const m = defaultMesocycle('2026-08-03')
    expect(m.lengthWeeks).toBe(5)
    expect(m.deloadWeek).toBe(true)
  })
})

// ── Signály deloadu ────────────────────────────────────────────────────
const bench: Exercise = {
  id: 'bench',
  name: 'Bench Press',
  muscleGroup: 'Chest',
  category: 'Push',
  equipment: 'Barbell',
  isBodyweight: false,
  imageUrl: null,
  isCustom: true,
  defaultRepRange: [5, 9],
  defaultSets: 3,
}

function set(rpe: number | null, weight = 60, reps = 8): SetLog {
  return { weight, reps, rpe, completed: true, role: 'working', isPR: false }
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

/** Trénink se dvěma cviky — stagnace se hlásí až od dvou. */
function session(id: string, date: string, sets: SetLog[]): WorkoutSession {
  return {
    id,
    date,
    splitId: null,
    splitName: 'Push',
    entries: [
      { exerciseId: 'bench', exerciseName: 'Bench Press', sets },
      { exerciseId: 'ohp', exerciseName: 'Overhead Press', sets },
    ],
    durationMinutes: 60,
    notes: '',
  }
}

const ohp: Exercise = { ...bench, id: 'ohp', name: 'Overhead Press', muscleGroup: 'ShouldersFront' }

describe('deloadSignals', () => {
  it('bez historie nic nenavrhuje', () => {
    const s = deloadSignals([], [bench, ohp], null)
    expect(s.shouldDeload).toBe(false)
    expect(s.reasons).toEqual([])
  })

  it('naplánovaný deload týden stačí sám o sobě', () => {
    const s = deloadSignals([], [bench, ohp], { ...meso, startDate: daysAgo(29).slice(0, 10) })
    expect(s.scheduled).toBe(true)
    expect(s.shouldDeload).toBe(true)
  })

  it('jeden signál nestačí — potřeba 2 ze 3', () => {
    // Jen vyčerpání: průměrné RIR ≤ 0,5 (samé RPE 10). Na stagnaci by byly
    // potřeba tři tréninky, tady je jeden.
    const sessions = [session('a', daysAgo(2), [set(10), set(10), set(10)])]
    const s = deloadSignals(sessions, [bench, ohp], null)
    expect(s.exhausted).toBe(true)
    expect(s.shouldDeload).toBe(false)
  })

  it('vyčerpání + stagnace → deload', () => {
    const sessions = [
      session('a', daysAgo(2), [set(10)]),
      session('b', daysAgo(9), [set(10)]),
      session('c', daysAgo(16), [set(10)]),
    ]
    const s = deloadSignals(sessions, [bench, ohp], null)
    expect(s.exhausted).toBe(true)
    expect(s.stagnating).toBe(true)
    expect(s.shouldDeload).toBe(true)
    expect(s.reasons.length).toBeGreaterThanOrEqual(2)
  })

  it('svěží trénink se stoupajícím výkonem nic nehlásí', () => {
    const sessions = [
      session('a', daysAgo(2), [set(7, 70, 8)]),
      session('b', daysAgo(9), [set(7, 65, 8)]),
      session('c', daysAgo(16), [set(7, 60, 8)]),
    ]
    const s = deloadSignals(sessions, [bench, ohp], null)
    expect(s.shouldDeload).toBe(false)
  })

  it('nezadané RPE se nepočítá jako vyčerpání', () => {
    const sessions = [session('a', daysAgo(2), [set(null), set(null)])]
    expect(deloadSignals(sessions, [bench, ohp], null).exhausted).toBe(false)
  })

  it('důvody jsou čitelné věty, ne kódy', () => {
    const sessions = [
      session('a', daysAgo(2), [set(10)]),
      session('b', daysAgo(9), [set(10)]),
      session('c', daysAgo(16), [set(10)]),
    ]
    for (const r of deloadSignals(sessions, [bench, ohp], null).reasons) {
      expect(r.length).toBeGreaterThan(10)
      expect(r).toMatch(/[a-z]/)
    }
  })
})
