import { normalizeText, recentExerciseIds, searchExercises } from './exerciseSearch'
import { BUILTIN_EXERCISES } from './exerciseDb'

const cs: Record<string, string> = { squat: 'Dřep', deadlift: 'Mrtvý tah' }
const altName = (e: { id: string }) => cs[e.id]

describe('searchExercises', () => {
  it('hledá bez diakritiky a i v přeloženém názvu', () => {
    expect(normalizeText('  Dřep ')).toBe('drep')
    const out = searchExercises(BUILTIN_EXERCISES, { query: 'drep', altName })
    expect(out.map((e) => e.id)).toContain('squat')
  })

  it('všechna slova musí sedět, pořadí slov nerozhoduje', () => {
    const out = searchExercises(BUILTIN_EXERCISES, { query: 'press bench' })
    expect(out.map((e) => e.id)).toContain('bench-barbell')
    expect(out.map((e) => e.id)).not.toContain('overhead-press')
  })

  it('najde všechny varianty a shoda na začátku názvu jde první', () => {
    const out = searchExercises(BUILTIN_EXERCISES, { query: 'squat' })
    expect(searchExercises(BUILTIN_EXERCISES, { query: 'front' })[0].id).toBe('front-squat')
    const names = out.map((e) => e.name)
    expect(names).toEqual(expect.arrayContaining(['Back Squat', 'Front Squat', 'Goblet Squat']))
  })

  it('filtr oblasti funguje i bez dotazu', () => {
    const out = searchExercises(BUILTIN_EXERCISES, { region: 'Core' })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((e) => e.muscleGroup === 'Abs')).toBe(true)
  })
})

describe('recentExerciseIds', () => {
  it('od nejnovějšího, bez opakování, s limitem', () => {
    const sessions = [
      { date: '2026-01-01', entries: [{ exerciseId: 'a' }, { exerciseId: 'b' }] },
      { date: '2026-01-05', entries: [{ exerciseId: 'c' }, { exerciseId: 'a' }] },
    ]
    expect(recentExerciseIds(sessions)).toEqual(['c', 'a', 'b'])
    expect(recentExerciseIds(sessions, 2)).toEqual(['c', 'a'])
  })
})
