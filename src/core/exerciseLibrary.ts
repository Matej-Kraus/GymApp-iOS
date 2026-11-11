import type { Category, Equipment, Exercise, MuscleGroup } from './types'
import { MUSCLE_REGION } from './muscles'
import raw from './data/exerciseLibrary.json'

/**
 * Přibalená knihovna cviků z free-exercise-db (volné dílo). Data vyrábí
 * `scripts/build-exercise-library.mjs`; tady se mapují na svalové skupiny,
 * vybavení a kategorie appky.
 *
 * Názvy zůstávají anglicky — tak se ty cviky v posilovně stejně jmenují.
 * České názvy mají jen hlavní cviky (slovník `exerciseNames` v `@/i18n`).
 */

interface RawExercise {
  /** ID ve free-exercise-db = název složky s obrázky. */
  i: string
  n: string
  /** Hlavní sval v jejich názvosloví (např. "quadriceps", "lats"). */
  p: string
  s: string[]
  e: string
  /** c = vícekloubový, i = izolovaný. */
  m: string
}

export const LIBRARY_IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

/** Prefix ID knihovních cviků — nesmí se srazit s vestavěnými ani vlastními. */
export const LIBRARY_ID_PREFIX = 'fx-'

const MUSCLE_MAP: Record<string, MuscleGroup> = {
  abdominals: 'Abs',
  abductors: 'Glutes',
  adductors: 'Quads',
  biceps: 'Biceps',
  calves: 'Calves',
  chest: 'Chest',
  forearms: 'Biceps',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  lats: 'Back',
  'lower back': 'Back',
  'middle back': 'Back',
  neck: 'Traps',
  quadriceps: 'Quads',
  traps: 'Traps',
  triceps: 'Triceps',
}

/** „shoulders" se u nás dělí na tři hlavy — rozhoduje název cviku. */
function shoulderHead(name: string): MuscleGroup {
  const n = name.toLowerCase()
  if (/rear|reverse fl|face pull|bent[ -]over.*(raise|fl)|external rotation/.test(n)) return 'ShouldersRear'
  if (/lateral|side|upright row/.test(n)) return 'ShouldersSide'
  return 'ShouldersFront'
}

/** Hlavní sval knihovního cviku → skupina appky. Neznámý vstup = Abs (jádro), nikdy nespadne. */
export function mapLibraryMuscle(muscle: string, exerciseName: string): MuscleGroup {
  if (muscle === 'shoulders') return shoulderHead(exerciseName)
  return MUSCLE_MAP[muscle] ?? 'Abs'
}

export function mapLibraryEquipment(equipment: string): Equipment {
  switch (equipment) {
    case 'barbell':
    case 'e-z curl bar':
      return 'Barbell'
    case 'dumbbell':
      return 'Dumbbell'
    case 'machine':
      return 'Machine'
    case 'cable':
      return 'Cable'
    case 'body only':
      return 'Bodyweight'
    default:
      return 'Other'
  }
}

export function categoryOfMuscle(muscle: MuscleGroup): Category {
  if (muscle === 'Abs') return 'Core'
  if (MUSCLE_REGION[muscle] === 'Legs') return 'Legs'
  if (muscle === 'Back' || muscle === 'Traps' || muscle === 'Biceps' || muscle === 'ShouldersRear') return 'Pull'
  return 'Push'
}

function toExercise(x: RawExercise): Exercise {
  const muscleGroup = mapLibraryMuscle(x.p, x.n)
  // Vedlejší „shoulders": u tlaků přední hlava, u tahů zadní.
  const pulling = categoryOfMuscle(muscleGroup) === 'Pull'
  const secondary = [
    ...new Set(
      x.s.map((m) =>
        m === 'shoulders' ? (pulling ? 'ShouldersRear' : 'ShouldersFront') : (MUSCLE_MAP[m] ?? null),
      ),
    ),
  ].filter((m): m is MuscleGroup => m !== null && m !== muscleGroup)

  return {
    id: LIBRARY_ID_PREFIX + x.i,
    name: x.n,
    muscleGroup,
    secondaryMuscles: secondary.length > 0 ? secondary : undefined,
    category: categoryOfMuscle(muscleGroup),
    equipment: mapLibraryEquipment(x.e),
    isBodyweight: x.e === 'body only',
    imageUrl: `${LIBRARY_IMAGE_BASE}/${x.i}/0.jpg`,
    isCustom: false,
    // Izolované cviky se dělají na víc opakování než vícekloubové.
    defaultRepRange: x.m === 'i' ? [8, 12] : [5, 9],
    defaultSets: 3,
  }
}

/**
 * Knihovna bez cviků, které už appka má mezi vestavěnými (`excludeSourceIds`
 * = ID ve free-exercise-db, ze kterých vestavěné berou obrázek).
 */
export function buildLibrary(excludeSourceIds: ReadonlySet<string>): Exercise[] {
  return (raw as RawExercise[]).filter((x) => !excludeSourceIds.has(x.i)).map(toExercise)
}

/** Postup provedení (anglicky) — velký soubor, načte se až při prvním dotazu. */
export function libraryInstructions(exerciseId: string): string[] | null {
  if (!exerciseId.startsWith(LIBRARY_ID_PREFIX)) return null
  const all = require('./data/exerciseInstructions.json') as Record<string, string[]>
  return all[exerciseId.slice(LIBRARY_ID_PREFIX.length)] ?? null
}
