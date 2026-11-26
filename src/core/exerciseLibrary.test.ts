import { BUILTIN_EXERCISES, LIBRARY_EXERCISES, allExercises, findExercise } from './exerciseDb'
import {
  LIBRARY_ID_PREFIX,
  categoryOfMuscle,
  libraryInstructions,
  mapLibraryEquipment,
  mapLibraryMuscle,
} from './exerciseLibrary'
import { MUSCLE_GROUPS } from './muscles'

describe('knihovna cviků', () => {
  it('je velká a ID se nesráží s vestavěnými', () => {
    expect(LIBRARY_EXERCISES.length).toBeGreaterThan(650)
    const ids = allExercises([]).map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(LIBRARY_EXERCISES.every((e) => e.id.startsWith(LIBRARY_ID_PREFIX))).toBe(true)
  })

  it('neopakuje cviky, které už jsou mezi vestavěnými', () => {
    expect(findExercise(`${LIBRARY_ID_PREFIX}Barbell_Bench_Press_-_Medium_Grip`, [])).toBeUndefined()
    expect(findExercise('bench-barbell', [])).toBe(BUILTIN_EXERCISES[0])
  })

  it('každý cvik má platnou svalovou skupinu a vedlejší svaly bez hlavního', () => {
    for (const e of LIBRARY_EXERCISES) {
      expect(MUSCLE_GROUPS).toContain(e.muscleGroup)
      expect(e.secondaryMuscles ?? []).not.toContain(e.muscleGroup)
    }
  })

  it('findExercise najde knihovní i vlastní cvik', () => {
    const lib = LIBRARY_EXERCISES[0]
    expect(findExercise(lib.id, [])).toBe(lib)
    const custom = { ...lib, id: 'my-1', isCustom: true }
    expect(findExercise('my-1', [custom])).toBe(custom)
  })

  it('postup se najde jen pro knihovní cvik', () => {
    expect(libraryInstructions('bench-barbell')).toBeNull()
    expect(libraryInstructions(LIBRARY_EXERCISES[0].id)?.length).toBeGreaterThan(0)
  })
})

describe('mapování', () => {
  it('ramena dělí podle názvu', () => {
    expect(mapLibraryMuscle('shoulders', 'Side Lateral Raise')).toBe('ShouldersSide')
    expect(mapLibraryMuscle('shoulders', 'Reverse Flyes')).toBe('ShouldersRear')
    expect(mapLibraryMuscle('shoulders', 'Arnold Dumbbell Press')).toBe('ShouldersFront')
  })
  it('záda a drobné skupiny', () => {
    expect(mapLibraryMuscle('lats', 'x')).toBe('Back')
    expect(mapLibraryMuscle('forearms', 'x')).toBe('Biceps')
    expect(mapLibraryMuscle('neznámý', 'x')).toBe('Abs')
  })
  it('vybavení a kategorie', () => {
    expect(mapLibraryEquipment('e-z curl bar')).toBe('Barbell')
    expect(mapLibraryEquipment('kettlebells')).toBe('Other')
    expect(categoryOfMuscle('Hamstrings')).toBe('Legs')
    expect(categoryOfMuscle('ShouldersRear')).toBe('Pull')
    expect(categoryOfMuscle('Triceps')).toBe('Push')
  })
})
