import { warmupSets } from './warmup'

describe('warmupSets', () => {
  it('40 / 60 / 80 % pracovní váhy s klesajícím počtem opakování', () => {
    expect(warmupSets(100, 2.5)).toEqual([
      { weight: 40, reps: 10 },
      { weight: 60, reps: 5 },
      { weight: 80, reps: 3 },
    ])
  })

  it('zaokrouhluje na nejmenší kotouč', () => {
    expect(warmupSets(67.5, 2.5).map((s) => s.weight)).toEqual([27.5, 40, 55])
  })

  it('bez pracovní váhy nemá co navrhnout', () => {
    expect(warmupSets(0, 2.5)).toEqual([])
    expect(warmupSets(-10, 2.5)).toEqual([])
  })

  it('nikdy nenavrhne rozcvičku těžší nebo stejnou jako pracovní série', () => {
    for (const w of [5, 10, 20, 42.5, 100, 180]) {
      for (const s of warmupSets(w, 2.5)) {
        expect(s.weight).toBeLessThan(w)
      }
    }
  })

  it('u lehkých vah nevrací tutéž váhu dvakrát', () => {
    // 5 kg: 40 % i 60 % se po zaokrouhlení potkají na 2,5 kg.
    const sets = warmupSets(5, 2.5)
    const weights = sets.map((s) => s.weight)
    expect(new Set(weights).size).toBe(weights.length)
  })

  it('respektuje jiný nejmenší kotouč', () => {
    expect(warmupSets(100, 5).map((s) => s.weight)).toEqual([40, 60, 80])
    expect(warmupSets(50, 1.25).map((s) => s.weight)).toEqual([20, 30, 40])
  })
})
