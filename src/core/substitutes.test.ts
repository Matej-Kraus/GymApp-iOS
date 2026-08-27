import { substituteScore, findSubstitutes } from './substitutes'
import { BUILTIN_EXERCISES } from './exerciseDb'
import type { Exercise } from './types'

const byId = new Map(BUILTIN_EXERCISES.map((e) => [e.id, e]))
const bench = byId.get('bench-barbell')!
const inclineDb = byId.get('bench-incline-db')!
const curl = byId.get('bicep-curl-db')!

describe('substituteScore', () => {
  it('shodný primární sval váží nejvíc', () => {
    expect(substituteScore(bench, inclineDb)).toBeGreaterThanOrEqual(3)
  })

  it('úplně jiná partie skóruje nízko', () => {
    expect(substituteScore(bench, curl)).toBeLessThan(substituteScore(bench, inclineDb))
  })

  it('cvik sám sebou není náhrada', () => {
    expect(substituteScore(bench, bench)).toBe(0)
  })

  it('shodné vybavení a kategorie přidávají', () => {
    const base: Exercise = { ...bench, id: 'a' }
    const sameEverything: Exercise = { ...bench, id: 'b' }
    const otherEquipment: Exercise = { ...bench, id: 'c', equipment: 'Machine' }
    expect(substituteScore(base, sameEverything)).toBeGreaterThan(
      substituteScore(base, otherEquipment),
    )
  })

  it('průnik vedlejších svalů se počítá', () => {
    const base: Exercise = { ...bench, id: 'a', secondaryMuscles: ['Triceps'] }
    const withOverlap: Exercise = { ...bench, id: 'b', secondaryMuscles: ['Triceps'] }
    const without: Exercise = { ...bench, id: 'c', secondaryMuscles: [] }
    expect(substituteScore(base, withOverlap)).toBeGreaterThan(substituteScore(base, without))
  })
})

describe('findSubstitutes', () => {
  it('nabídne cviky na stejnou partii, od nejlepšího', () => {
    const found = findSubstitutes(bench, BUILTIN_EXERCISES)
    expect(found.length).toBeGreaterThan(0)
    expect(found[0].muscleGroup).toBe('Chest')
  })

  it('nikdy nenabídne ten samý cvik', () => {
    expect(findSubstitutes(bench, BUILTIN_EXERCISES).map((e) => e.id)).not.toContain(bench.id)
  })

  it('řadí sestupně podle skóre', () => {
    const found = findSubstitutes(bench, BUILTIN_EXERCISES)
    const scores = found.map((e) => substituteScore(bench, e))
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })

  it('vrátí nejvýš `limit` položek', () => {
    expect(findSubstitutes(bench, BUILTIN_EXERCISES, 3)).toHaveLength(3)
  })

  it('nenabídne nic, co s cvikem nesouvisí', () => {
    for (const e of findSubstitutes(bench, BUILTIN_EXERCISES)) {
      expect(substituteScore(bench, e)).toBeGreaterThan(0)
    }
  })

  it('cvik bez příbuzných vrátí prázdno místo náhodných cviků', () => {
    const weird: Exercise = {
      ...bench,
      id: 'weird',
      muscleGroup: 'Calves',
      secondaryMuscles: [],
      category: 'Core',
      equipment: 'Other',
    }
    expect(findSubstitutes(weird, [bench, curl])).toEqual([])
  })
})
