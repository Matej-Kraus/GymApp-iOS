import { rirFromRpe, weightCeiling, isStagnating, nextWorkingTarget } from './rir'
import { floorToIncrement } from './units'
import type { Exercise, Settings } from './types'

// Bench: krok 2,5 kg, rozsah 5–9 opakování.
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

describe('rirFromRpe', () => {
  it('RPE 8 → RIR 2', () => expect(rirFromRpe(8)).toBe(2))
  it('RPE 10 → RIR 0 (selhání)', () => expect(rirFromRpe(10)).toBe(0))
  it('RPE 6 → RIR 4', () => expect(rirFromRpe(6)).toBe(4))
  it('nezadané RPE → null (ne 10)', () => {
    expect(rirFromRpe(null)).toBeNull()
    expect(rirFromRpe(undefined)).toBeNull()
  })
  it('nesmyslné RPE ořízne do 0–10', () => {
    expect(rirFromRpe(12)).toBe(0)
    expect(rirFromRpe(-1)).toBe(10)
  })
})

describe('floorToIncrement', () => {
  it('zaokrouhluje DOLŮ, aby strop nešlo překročit', () => {
    expect(floorToIncrement(44, 2.5)).toBe(42.5)
    expect(floorToIncrement(45, 2.5)).toBe(45)
  })
})

describe('weightCeiling — tvrdý strop skoku', () => {
  it('u lehkých vah rozhoduje +10 % (40 kg → 44, ne 45)', () => {
    expect(weightCeiling(40, 2.5)).toBe(44)
  })
  it('u těžkých vah rozhoduje 2× krok (100 kg → 105, ne 110)', () => {
    expect(weightCeiling(100, 2.5)).toBe(105)
  })
})

describe('isStagnating — 2× po sobě žádné zlepšení', () => {
  const s = (weight: number, reps: number) => ({ weight, reps })

  it('tři tréninky bez zlepšení objemu → stagnace', () => {
    expect(isStagnating([s(40, 6), s(40, 6), s(40, 6)])).toBe(true)
  })
  it('poslední trénink se zlepšil → není stagnace', () => {
    expect(isStagnating([s(40, 7), s(40, 6), s(40, 6)])).toBe(false)
  })
  it('málo historie → nikdy stagnace', () => {
    expect(isStagnating([s(40, 6), s(40, 6)])).toBe(false)
    expect(isStagnating([])).toBe(false)
  })
})

describe('nextWorkingTarget — rozhodovací tabulka RIR', () => {
  it('RIR 0 (RPE 10) → drží váhu i opakování (konsolidace)', () => {
    const t = nextWorkingTarget({ weight: 40, reps: 6, rpe: 10 }, bench, settings)
    expect(t).toMatchObject({ weight: 40, reps: 6, action: 'hold' })
  })

  it('RIR 1 (RPE 9) → stejná váha, +1 opakování', () => {
    const t = nextWorkingTarget({ weight: 40, reps: 6, rpe: 9 }, bench, settings)
    expect(t).toMatchObject({ weight: 40, reps: 7, action: 'addRep' })
  })

  it('RIR 1 na stropu rozsahu → krok váhy a spadnout na dolní mez', () => {
    const t = nextWorkingTarget({ weight: 40, reps: 9, rpe: 9 }, bench, settings)
    expect(t).toMatchObject({ weight: 42.5, reps: 5, action: 'step' })
  })

  it('RIR 2 (RPE 8) → +1 krok váhy, opakování na dolní mez', () => {
    const t = nextWorkingTarget({ weight: 40, reps: 6, rpe: 8 }, bench, settings)
    expect(t).toMatchObject({ weight: 42.5, reps: 5, action: 'step' })
  })

  it('RIR 4 (RPE 6) na těžké váze → skok o 2 kroky', () => {
    const t = nextWorkingTarget({ weight: 100, reps: 6, rpe: 6 }, bench, settings)
    expect(t).toMatchObject({ weight: 105, reps: 5, action: 'jump' })
  })

  it('RIR 4 na lehké váze → brzda +10 % srazí skok na jeden krok', () => {
    const t = nextWorkingTarget({ weight: 40, reps: 6, rpe: 6 }, bench, settings)
    expect(t.weight).toBe(42.5)
  })

  it('nezadané RPE → jako RIR 2', () => {
    const t = nextWorkingTarget({ weight: 40, reps: 6, rpe: null }, bench, settings)
    expect(t).toMatchObject({ weight: 42.5, reps: 5, action: 'step' })
  })

  it('nikdy nepřekročí strop: ≤ 1,10× minulá váha, nebo jeden kotouč', () => {
    // +10 % je brzda proti velkým skokům. U lehkých vah je ale 10 % míň než
    // nejmenší kotouč — tam musí projít aspoň jeden krok, jinak se cvik
    // zasekne napořád (viz test níž).
    for (const w of [10, 20, 40, 60, 100, 140]) {
      const t = nextWorkingTarget({ weight: w, reps: 5, rpe: 6 }, bench, settings)
      expect(t.weight).toBeLessThanOrEqual(Math.max(w * 1.1, w + 2.5))
    }
  })

  it('lehká váha se nezasekne napořád, i když je 10 % míň než kotouč', () => {
    // 15 kg, kotouč 2,5: 10 % = 1,5 kg. Bez výjimky by strop spadl zpátky na
    // 15 kg a na stropu rozsahu (9 opakování) by cvik už nikdy nepostoupil.
    const t = nextWorkingTarget({ weight: 15, reps: 9, rpe: 8 }, bench, settings)
    expect(t.weight).toBe(17.5)
    expect(t.reps).toBe(5)
  })

  it('nikdy nenavrhne opakování mimo defaultRepRange', () => {
    for (const reps of [4, 5, 6, 7, 8, 9, 12]) {
      for (const rpe of [6, 8, 9, 10, null]) {
        const t = nextWorkingTarget({ weight: 60, reps, rpe }, bench, settings)
        expect(t.reps).toBeGreaterThanOrEqual(5)
        expect(t.reps).toBeLessThanOrEqual(9)
      }
    }
  })

  it('opakování nad rozsahem → clamp zpět do rozsahu s krokem váhy', () => {
    const t = nextWorkingTarget({ weight: 40, reps: 12, rpe: 8 }, bench, settings)
    expect(t.weight).toBe(42.5)
    expect(t.reps).toBe(5)
  })

  it('pod dolní mezí rozsahu → nepřidávat váhu, nejdřív dorovnat opakování', () => {
    const t = nextWorkingTarget({ weight: 40, reps: 3, rpe: 8 }, bench, settings)
    expect(t).toMatchObject({ weight: 40, reps: 5, action: 'buildReps' })
  })

  it('u lehké činky projde jeden kotouč i za cenu velkého relativního skoku', () => {
    // 10 → 12,5 kg je +25 %. Menší kotouč neexistuje, takže jediná alternativa
    // je nepostoupit vůbec. Opakování spadnou na dolní mez, což skok vyváží.
    const t = nextWorkingTarget({ weight: 10, reps: 6, rpe: 8 }, bench, settings)
    expect(t).toMatchObject({ weight: 12.5, reps: 5, action: 'step' })
  })

  it('stagnace 2× po sobě → mikro-deload ×0,9', () => {
    const t = nextWorkingTarget({ weight: 40, reps: 6, rpe: 9 }, bench, settings, [
      { weight: 40, reps: 6 },
      { weight: 40, reps: 6 },
    ])
    expect(t).toMatchObject({ weight: 35, reps: 5, action: 'deload' }) // 40 × 0,9 = 36 → dolů na kotouč = 35
  })

  it('bez historie stagnace nenastane ani při RIR 0', () => {
    const t = nextWorkingTarget({ weight: 40, reps: 6, rpe: 10 }, bench, settings)
    expect(t.action).not.toBe('deload')
  })
})
