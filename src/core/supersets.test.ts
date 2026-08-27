import { isLastInSuperset, supersetLabel, supersetMembers } from './supersets'
import { warmupSets, WARMUP_SCHEMES } from './warmup'

/** Minimální tvar, který supersety potřebují — funguje pro draft i uložený trénink. */
const entries = [
  { exerciseId: 'bench', supersetGroup: 'A' },
  { exerciseId: 'row', supersetGroup: 'A' },
  { exerciseId: 'squat', supersetGroup: null },
  { exerciseId: 'curl' },
]

describe('supersetMembers', () => {
  it('vrátí indexy cviků ve stejné skupině', () => {
    expect(supersetMembers(entries, 0)).toEqual([0, 1])
    expect(supersetMembers(entries, 1)).toEqual([0, 1])
  })

  it('cvik bez skupiny je sám za sebe', () => {
    expect(supersetMembers(entries, 2)).toEqual([2])
    expect(supersetMembers(entries, 3)).toEqual([3])
  })
})

describe('isLastInSuperset', () => {
  it('odpočinek se spustí až po posledním cviku skupiny', () => {
    expect(isLastInSuperset(entries, 0)).toBe(false)
    expect(isLastInSuperset(entries, 1)).toBe(true)
  })

  it('samostatný cvik je vždy poslední', () => {
    expect(isLastInSuperset(entries, 2)).toBe(true)
    expect(isLastInSuperset(entries, 3)).toBe(true)
  })
})

describe('supersetLabel', () => {
  it('označí pozici ve skupině (A1, A2)', () => {
    expect(supersetLabel(entries, 0)).toBe('A1')
    expect(supersetLabel(entries, 1)).toBe('A2')
  })

  it('cvik mimo superset nemá označení', () => {
    expect(supersetLabel(entries, 2)).toBeNull()
  })
})

describe('schémata rozcvičky', () => {
  it('nabízí víc než jedno', () => {
    expect(Object.keys(WARMUP_SCHEMES).length).toBeGreaterThan(1)
  })

  it('standard dá tři série 40/60/80', () => {
    expect(warmupSets(100, 2.5, 'standard').map((s) => s.weight)).toEqual([40, 60, 80])
  })

  it('short dá míň sérií než standard', () => {
    expect(warmupSets(100, 2.5, 'short').length).toBeLessThan(
      warmupSets(100, 2.5, 'standard').length,
    )
  })

  it('thorough dá víc sérií než standard', () => {
    expect(warmupSets(100, 2.5, 'thorough').length).toBeGreaterThan(
      warmupSets(100, 2.5, 'standard').length,
    )
  })

  it('bez schématu se chová jako standard (stará volání fungují dál)', () => {
    expect(warmupSets(100, 2.5)).toEqual(warmupSets(100, 2.5, 'standard'))
  })

  it('žádné schéma nenavrhne rozcvičku těžší než pracovní série', () => {
    for (const scheme of Object.keys(WARMUP_SCHEMES) as (keyof typeof WARMUP_SCHEMES)[]) {
      for (const s of warmupSets(60, 2.5, scheme)) {
        expect(s.weight).toBeLessThan(60)
      }
    }
  })
})
