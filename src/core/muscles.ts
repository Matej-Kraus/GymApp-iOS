import type { MuscleGroup } from './types'

/**
 * Svalové skupiny — jediný zdroj pravdy.
 *
 * Dřív byla stejná mapa opsaná na pěti místech v UI a skupin bylo jen šest.
 * Šest je málo: „Arms 18 sérií" neřekne, že máš 14 na bicepsy a 4 na
 * tricepsy, a bez toho nedávají smysl objemové landmarky (MEV/MAV/MRV).
 */

/** Pořadí je zároveň pořadí zobrazení — shora dolů po těle. */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Traps',
  'ShouldersFront',
  'ShouldersSide',
  'ShouldersRear',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Abs',
]

/** Co se ukáže uživateli. Kód říká `ShouldersSide`, člověk „Side delts". */
export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  Chest: 'Chest',
  Back: 'Back',
  Traps: 'Traps',
  ShouldersFront: 'Front delts',
  ShouldersSide: 'Side delts',
  ShouldersRear: 'Rear delts',
  Biceps: 'Biceps',
  Triceps: 'Triceps',
  Quads: 'Quads',
  Hamstrings: 'Hamstrings',
  Glutes: 'Glutes',
  Calves: 'Calves',
  Abs: 'Abs',
}

/** Hrubší dělení pro místa, kde by 13 položek bylo moc (filtry, ikony). */
export type MuscleRegion = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core'

export const MUSCLE_REGION: Record<MuscleGroup, MuscleRegion> = {
  Chest: 'Chest',
  Back: 'Back',
  Traps: 'Back',
  ShouldersFront: 'Shoulders',
  ShouldersSide: 'Shoulders',
  ShouldersRear: 'Shoulders',
  Biceps: 'Arms',
  Triceps: 'Arms',
  Quads: 'Legs',
  Hamstrings: 'Legs',
  Glutes: 'Legs',
  Calves: 'Legs',
  Abs: 'Core',
}

export const MUSCLE_REGIONS: MuscleRegion[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
]

/** Skupiny v dané oblasti, v pořadí podle `MUSCLE_GROUPS`. */
export function musclesInRegion(region: MuscleRegion): MuscleGroup[] {
  return MUSCLE_GROUPS.filter((m) => MUSCLE_REGION[m] === region)
}

/** Šest skupin, jak vypadala data před `DATA_VERSION = 2`. */
export type LegacyMuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core'

/**
 * Klíčová slova v názvu cviku → skupina. Pořadí rozhoduje: bere se první
 * shoda, takže konkrétnější výrazy musí být dřív ("leg curl" před "curl").
 */
const NAME_HINTS: { match: string[]; muscle: MuscleGroup }[] = [
  // Nohy — konkrétní stroje dřív než obecné dřepy.
  { match: ['calf', 'calves'], muscle: 'Calves' },
  { match: ['leg curl', 'hamstring', 'romanian', 'rdl', 'good morning'], muscle: 'Hamstrings' },
  { match: ['hip thrust', 'glute', 'bridge'], muscle: 'Glutes' },
  { match: ['leg extension', 'squat', 'leg press', 'lunge', 'step up'], muscle: 'Quads' },
  // Paže.
  { match: ['tricep', 'skull', 'pushdown', 'overhead extension', 'kickback'], muscle: 'Triceps' },
  { match: ['bicep', 'curl', 'chin'], muscle: 'Biceps' },
  // Ramena.
  { match: ['lateral raise', 'side raise', 'side delt', 'upright row'], muscle: 'ShouldersSide' },
  { match: ['face pull', 'rear delt', 'reverse fly', 'rear fly'], muscle: 'ShouldersRear' },
  { match: ['front raise', 'overhead press', 'shoulder press', 'military'], muscle: 'ShouldersFront' },
  // Záda.
  { match: ['shrug', 'trap'], muscle: 'Traps' },
]

/** Když název nic neprozradí, tohle je nejpravděpodobnější volba. */
const LEGACY_FALLBACK: Record<LegacyMuscleGroup, MuscleGroup> = {
  Chest: 'Chest',
  Back: 'Back',
  Core: 'Abs',
  Arms: 'Biceps',
  Legs: 'Quads',
  Shoulders: 'ShouldersFront',
}

/**
 * Stará skupina + název cviku → nová skupina.
 *
 * Používá se jen při migraci `customExercises` (vestavěné cviky mají novou
 * skupinu natvrdo). Nikdy nespadne — na neznámý vstup vrátí `Chest`, což je
 * horší než správná odpověď, ale lepší než rozbitá appka.
 */
export function migrateLegacyMuscle(legacy: LegacyMuscleGroup, exerciseName: string): MuscleGroup {
  const name = (exerciseName ?? '').toLowerCase()
  const fallback = LEGACY_FALLBACK[legacy]

  // Hádat podle názvu má smysl jen tam, kde se skupina opravdu dělí.
  if (legacy === 'Arms' || legacy === 'Legs' || legacy === 'Shoulders' || legacy === 'Back') {
    for (const hint of NAME_HINTS) {
      if (hint.match.some((m) => name.includes(m))) {
        // Nápověda z jiné části těla by přeřadila cvik jinam, než uživatel
        // zamýšlel — bereme ji jen pokud sedí do původní oblasti.
        if (regionOfLegacy(legacy) === MUSCLE_REGION[hint.muscle]) return hint.muscle
      }
    }
  }
  return fallback ?? 'Chest'
}

function regionOfLegacy(legacy: LegacyMuscleGroup): MuscleRegion {
  return legacy === 'Core' ? 'Core' : (legacy as MuscleRegion)
}

/**
 * Velké partie snesou větší skok váhy (5 kg místo 2,5).
 *
 * Bydlí to tady, protože to potřebuje `progression.ts` i `rir.ts` a ty na
 * sebe nesmí navzájem importovat. Dřív byla ta podmínka opsaná v obou.
 */
export function isLargeMuscleGroup(muscle: MuscleGroup): boolean {
  return MUSCLE_REGION[muscle] === 'Legs' || muscle === 'Back'
}
