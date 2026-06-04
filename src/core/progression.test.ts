import {
  suggestWorkingSet,
  suggestBackoffSet,
  backoffWeight,
  weightIncrementKg,
  lastPerformance,
} from './progression'
import { roundToIncrement, kgToLb } from './units'
import { epley1RM, sessionVolume } from './stats'
import { markPRs } from './records'
import type { Exercise, Settings, SetLog, SetRole, WorkoutSession } from './types'

// Testovací cvik a nastavení (podle příkladu uživatele: Bench, kotouč 2,5 kg).
const bench: Exercise = {
  id: 'bench',
  name: 'Bench Press',
  muscleGroup: 'Chest',
  category: 'Push',
  equipment: 'Barbell',
  isBodyweight: false,
  imageUrl: null,
  isCustom: false,
  defaultRepRange: [5, 9],
  defaultSets: 3,
}
const settings: Settings = { unit: 'kg', smallestPlateKg: 2.5 }

// Pomocníci na sestavení dat v testech.
function set(weight: number, reps: number, role: SetRole = 'working'): SetLog {
  return { weight, reps, rpe: null, completed: true, role, isPR: false }
}
function session(id: string, date: string, sets: SetLog[]): WorkoutSession {
  return {
    id,
    date,
    splitId: null,
    splitName: 'Push',
    entries: [{ exerciseId: 'bench', exerciseName: 'Bench Press', sets }],
    durationMinutes: null,
    notes: '',
  }
}

describe('přírůstek váhy', () => {
  it('horní partie = +2,5 kg', () => {
    expect(weightIncrementKg(bench)).toBe(2.5)
  })
  it('nohy / velké tahy = +5 kg', () => {
    expect(weightIncrementKg({ ...bench, muscleGroup: 'Legs', category: 'Legs' })).toBe(5)
  })
})

describe('working série (pracovní/těžká)', () => {
  it('poprvé (bez historie) → žádný návrh', () => {
    expect(suggestWorkingSet(null, bench, settings)).toBeNull()
  })

  it('6 opakování → stejná váha, cíl o 1 víc (7×40)', () => {
    const s = suggestWorkingSet({ weight: 40, reps: 6 }, bench, settings)
    expect(s?.weight).toBe(40)
    expect(s?.reps).toBe(7)
  })

  it('na stropu (9×40) → přidat váhu na 42,5 a dolů na 5', () => {
    const s = suggestWorkingSet({ weight: 40, reps: 9 }, bench, settings)
    expect(s?.weight).toBe(42.5)
    expect(s?.reps).toBe(5)
  })
})

describe('back-off série (−20 %)', () => {
  it('váha = 80 % z dnešní working (40 → 32,5)', () => {
    expect(backoffWeight(40, settings)).toBe(32.5)
  })

  it('cíl = víc opakování než minule (8 → 9)', () => {
    const s = suggestBackoffSet({ weight: 32.5, reps: 8 }, 40, settings)
    expect(s.weight).toBe(32.5)
    expect(s.reps).toBe(9)
  })
})

describe('units', () => {
  it('zaokrouhlení na nejmenší kotouč', () => {
    expect(roundToIncrement(41.3, 2.5)).toBe(42.5)
    expect(roundToIncrement(32, 2.5)).toBe(32.5)
  })
  it('kg → lb', () => {
    expect(Math.round(kgToLb(100))).toBe(220)
  })
})

describe('Epley 1RM', () => {
  it('1 opakování = váha', () => expect(epley1RM(100, 1)).toBe(100))
  it('5 opakování ≈ 116,7', () => expect(epley1RM(100, 5)).toBeCloseTo(116.667, 2))
})

describe('párování minulého výkonu', () => {
  it('vrátí working a backoff série z posledního tréninku', () => {
    const history = [
      session('s1', '2026-05-01', [set(40, 6, 'working'), set(32.5, 8, 'backoff')]),
    ]
    const last = lastPerformance(history, 'bench')
    expect(last.working[0]?.reps).toBe(6)
    expect(last.backoff[0]?.reps).toBe(8)
  })
})

describe('PR a objem', () => {
  it('nová série překoná staré 1RM → isPR; warm-up nikdy není PR', () => {
    const history = [session('s1', '2026-05-01', [set(40, 6, 'working')])]
    const fresh = session('s2', '2026-05-08', [
      set(42.5, 6, 'working'), // vyšší 1RM → PR
      set(0, 20, 'warmup'), // i s extrémními repy = nikdy PR
    ])
    const marked = markPRs(fresh, history)
    expect(marked.entries[0].sets[0].isPR).toBe(true)
    expect(marked.entries[0].sets[1].isPR).toBe(false)
  })

  it('objem tréninku ignoruje warm-up', () => {
    const s = session('s3', '2026-05-09', [set(42.5, 6, 'working'), set(0, 20, 'warmup')])
    expect(sessionVolume(s)).toBe(255) // 42,5 × 6
  })
})

import { SPLIT_TEMPLATES, BUILTIN_EXERCISES } from './exerciseDb'
import { SAMPLE_SESSIONS, SAMPLE_SPLITS } from './sampleData'

describe('sampleData', () => {
  it('každý trénink má alespoň 1 entry s alespoň 1 sérií', () => {
    for (const session of SAMPLE_SESSIONS) {
      expect(session.entries.length).toBeGreaterThan(0)
      for (const entry of session.entries) {
        expect(entry.sets.length).toBeGreaterThan(0)
      }
    }
  })

  it('splity i sessions jsou označeny isSample', () => {
    for (const s of SAMPLE_SPLITS) expect(s.isSample).toBe(true)
    for (const s of SAMPLE_SESSIONS) expect(s.isSample).toBe(true)
  })

  it('splitId v sessions odkazuje na existující sample split', () => {
    const splitIds = new Set(SAMPLE_SPLITS.map((s) => s.id))
    for (const session of SAMPLE_SESSIONS) {
      if (session.splitId) expect(splitIds.has(session.splitId)).toBe(true)
    }
  })
})

describe('SPLIT_TEMPLATES', () => {
  it('obsahuje Bro Split s 5 dny', () => {
    const broSplit = SPLIT_TEMPLATES.find((t) => t.groupId === 'bro-split')
    expect(broSplit).toBeDefined()
    expect(broSplit!.splits).toHaveLength(5)
    const dayNames = broSplit!.splits.map((s) => s.name)
    expect(dayNames).toEqual(['Chest', 'Back', 'Shoulders', 'Legs', 'Arms'])
  })

  it('všechny šablony mají groupId', () => {
    for (const tpl of SPLIT_TEMPLATES) {
      expect(tpl.groupId).toBeTruthy()
    }
  })

  it('všechna exercise ID v šablonách existují v databázi', () => {
    const ids = new Set(BUILTIN_EXERCISES.map((e) => e.id))
    for (const tpl of SPLIT_TEMPLATES) {
      for (const day of tpl.splits) {
        for (const exId of day.exerciseIds) {
          expect(ids.has(exId)).toBe(true) // `Cvik '${exId}' v šabloně '${tpl.name}/${day.name}' neexistuje`
        }
      }
    }
  })

  it('vestavěné cviky mají description', () => {
    for (const ex of BUILTIN_EXERCISES) {
      expect(ex.description).toBeTruthy() // `Cvik '${ex.id}' nemá description`
    }
  })
})

import { workoutStreakWeeks, volumeLast30Days, topMuscleGroup } from './stats'

const DAY_MS = 86_400_000

function makeSession(daysAgo: number, exerciseId = 'bench-barbell'): WorkoutSession {
  return {
    id: `test-${daysAgo}-${exerciseId}`,
    date: new Date(Date.now() - daysAgo * DAY_MS).toISOString(),
    splitId: null,
    splitName: 'Test',
    durationMinutes: 60,
    notes: '',
    entries: [{
      exerciseId,
      exerciseName: 'Test',
      sets: [{ weight: 100, reps: 5, rpe: 8, completed: true, role: 'working' as const, isPR: false }],
    }],
  }
}

describe('volumeLast30Days', () => {
  it('vrátí 0 pro prázdný seznam', () => {
    expect(volumeLast30Days([])).toBe(0)
  })

  it('počítá jen tréninky za posledních 30 dní', () => {
    const sessions = [
      makeSession(5),
      makeSession(20),
      makeSession(40),
    ]
    // 5 days ago: 100×5=500, 20 days ago: 500, 40 days ago: outside range
    expect(volumeLast30Days(sessions)).toBe(1000)
  })
})

describe('topMuscleGroup', () => {
  it('vrátí null pro prázdný seznam', () => {
    expect(topMuscleGroup([], [])).toBeNull()
  })

  it('vrátí nejčastější svalovou skupinu', () => {
    const sessions = [
      makeSession(1, 'bench-barbell'),
      makeSession(2, 'bench-barbell'),
      makeSession(3, 'squat'),
    ]
    // bench-barbell = Chest (2x), squat = Legs (1x)
    expect(topMuscleGroup(sessions, [])).toBe('Chest')
  })
})

describe('workoutStreakWeeks', () => {
  it('vrátí 0 pro prázdný seznam', () => {
    expect(workoutStreakWeeks([])).toBe(0)
  })

  it('vrátí aspoň 1 pro trénink tento nebo minulý týden', () => {
    const sessions = [makeSession(3)]
    expect(workoutStreakWeeks(sessions)).toBeGreaterThanOrEqual(1)
  })

  it('vrátí 0 pro trénink starší než 2 týdny bez aktuálního', () => {
    const sessions = [makeSession(20)]
    expect(workoutStreakWeeks(sessions)).toBe(0)
  })
})
