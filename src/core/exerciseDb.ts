/**
 * Vestavěná databáze cviků. Klíčové pohyby z každé kategorie — stačí pro plnohodnotné tréninky.
 * U každého cviku je odkaz na obrázek z free-exercise-db (yuhonas/free-exercise-db, public domain).
 * Base URL obrázků: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/
 */
import type { Exercise } from './types'

const IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

function ex(
  id: string,
  name: string,
  muscleGroup: Exercise['muscleGroup'],
  category: Exercise['category'],
  equipment: Exercise['equipment'],
  isBodyweight: boolean,
  imgPath: string | null,
  repRange: [number, number] = [5, 9],
  defaultSets = 3,
): Exercise {
  return {
    id,
    name,
    muscleGroup,
    category,
    equipment,
    isBodyweight,
    imageUrl: imgPath ? `${IMG}/${imgPath}/0.jpg` : null,
    isCustom: false,
    defaultRepRange: repRange,
    defaultSets,
  }
}

const DESCRIPTIONS: Record<string, string> = {
  'bench-barbell': 'Základní tlakový cvik na hrudník. Leh na lavici, tyč spouštěj na střed hrudníku, lokty pod 45°.',
  'bench-incline-db': 'Tlak na šikmé lavici se zdůrazněním horního hrudníku. Sklon lavice 30–45°, činky k ramenům.',
  'overhead-press': 'Tlak nad hlavu — základní cvik na ramena. Stoj nebo sed, tyč ze výše ramen tlačíš kolmo nahoru.',
  'db-shoulder-press': 'Tlak s jednoručkami nad hlavu. Sed na lavici, výchozí poloha na úrovni uší, tlačíš kolmo nahoru.',
  'dips': 'Kliky na bradlech — zaměřeno na hrudník a triceps. Mírný předklon zdůrazní hrudník, vzpřímení triceps.',
  'tricep-pushdown': 'Izolační cvik na triceps u kabelu. Lokty u těla, předloktí tlačíš dolů až do plného natažení.',
  'cable-fly': 'Přetahy u kabelu — izolace hrudníku. Stoj uprostřed, ramena mírně pokrčená, ruce se setkají před hrudníkem.',
  'lateral-raise': 'Upažování s jednoručkami — izolace deltoidů. Mírně pokrčené lokty, zvedej do výše ramen, ne výše.',
  'skull-crusher': 'Francouzský tlak — izolace tricepsu. Leh, tyč k čelu a zpět, lokty fixované kolmo na lavici.',
  'chest-dip': 'Kliky na bradlech zaměřené na hrudník. Širší úchop, větší předklon, klesej do natažení hrudníku.',
  'deadlift': 'Král silových cviků — celé tělo. Neutrální záda, tyč u holeně, tlač do podlahy a propni boky nahoře.',
  'pullup': 'Stahy na hrazdě nadhmatem. Plný rozsah pohybu — z visení do brady nad hrazdu. Přidej závaží na opasek.',
  'chinup': 'Stahy na hrazdě podhmatem — větší zapojení bicepsu. Úchop na šířku ramen, klesej do plného visení.',
  'row-barbell': 'Přítahy s tyčí v předklonu — záda a biceps. Torzo rovnoběžně se zemí, tyč táhni k pupku.',
  'row-cable': 'Přítahy v sedu na kabelu. Záda vzpřímená, lopatky stáhni k sobě, ruce táhni k pasu.',
  'lat-pulldown': 'Stahování horní kladky — záda. Sed, hrudník mírně dozadu, tyč táhni k hornímu hrudníku.',
  'bicep-curl-db': 'Bicepsový zdvih s jednoručkami. Stoj nebo sed, zdvihej střídavě nebo současně, plný rozsah.',
  'bicep-curl-bb': 'Bicepsový zdvih s tyčí. Stoj, lokty u těla, tyč zdvihej ke klíčním kostem, nekývej torsem.',
  'face-pull': 'Přítahy lana k obličeji — zadní deltoid a rotátorová manžeta. Kabel ve výši hlavy, tahy k uším.',
  'hammer-curl': 'Kladivový bicepsový zdvih — zaměřuje brachialis. Neutrální úchop (palec nahoru), plný rozsah.',
  'shrug': 'Pokrčování ramen s tyčí — trapézové svaly. Stoj, ramena zvedej přímo nahoru, bez kroužení.',
  'squat': 'Dřep s tyčí na zádech — základ silového tréninku. Hluboký dřep, kolena sledují špičky, záda zpřímená.',
  'front-squat': 'Přední dřep s tyčí na prsou — větší zapojení kvadricepsů. Lokty vysoké, trup vzpřímený.',
  'leg-press': 'Tlak nohama — bezpečná alternativa dřepu. Nohy na šířku ramen, klesej do 90° v kolenou.',
  'rdl': 'Rumunský deadlift — hamstringy a hýždě. Tyč u nohou, kolena mírně pokrčená, předkloň boky dozadu.',
  'leg-curl': 'Flexe kolene na stroji — izolace hamstringů. Lez na břicho, paty táhni k hýždím, plný rozsah.',
  'leg-extension': 'Extenze kolene na stroji — izolace kvadricepsů. Sed, nohy zdvihej do plného natažení.',
  'calf-raise': 'Zdvihání na špičky — lýtkové svaly. Stoj na hraně stupínku, plný rozsah dolů i nahoru.',
  'lunge': 'Výpad s tyčí — unilaterální cvik na nohy. Velký krok vpřed, zadní koleno k zemi, trup vzpřímený.',
  'goblet-squat': 'Goblet dřep s jednoručkou — pohybový vzor pro začátečníky. Závaží u hrudi, hluboký dřep.',
  'hip-thrust': 'Hip thrust s tyčí — izolace hýžďového svalu. Záda na lavici, tyč v bocích, propni boky nahoře.',
  'plank': 'Plank — izometrický cvik na core. Předloktí na zemi, tělo v přímce, bříšní svaly zapnuté.',
  'cable-crunch': 'Stahování kabelu klečmo — izolace břicha. Klečíš, ruce u hlavy, ohýbej páteř dolů.',
  'ab-wheel': 'Kolečko — náročný cvik na core. Z kleku vyroluj dopředu do téměř vodorovné polohy, vrať se.',
  'hanging-leg-raise': 'Zdvihání nohou ve visu — břicho a hip flexory. Vis na hrazdě, nohy zdvihej do vodorovné polohy.',
}

export const BUILTIN_EXERCISES: Exercise[] = [
  // ── PUSH ────────────────────────────────────────────────────────
  ex('bench-barbell', 'Bench Press', 'Chest', 'Push', 'Barbell', false, 'Barbell_Bench_Press_-_Medium_Grip'),
  ex('bench-incline-db', 'Incline Dumbbell Press', 'Chest', 'Push', 'Dumbbell', false, 'Dumbbell_Incline_Bench_Press'),
  ex('overhead-press', 'Overhead Press', 'Shoulders', 'Push', 'Barbell', false, 'Barbell_Shoulder_Press'),
  ex('db-shoulder-press', 'Dumbbell Shoulder Press', 'Shoulders', 'Push', 'Dumbbell', false, 'Dumbbell_Shoulder_Press'),
  ex('dips', 'Dips', 'Chest', 'Push', 'Bodyweight', true, 'Dips_-_Chest_Version', [5, 9]),
  ex('tricep-pushdown', 'Tricep Pushdown', 'Arms', 'Push', 'Cable', false, 'Triceps_Pushdown'),
  ex('cable-fly', 'Cable Fly', 'Chest', 'Push', 'Cable', false, 'Cable_Fly', [10, 15]),
  ex('lateral-raise', 'Lateral Raise', 'Shoulders', 'Push', 'Dumbbell', false, 'Side_Lateral_Raise', [10, 15]),
  ex('skull-crusher', 'Skull Crusher', 'Arms', 'Push', 'Barbell', false, 'EZ-Bar_Skullcrusher', [8, 12]),
  ex('chest-dip', 'Chest Dip', 'Chest', 'Push', 'Bodyweight', true, 'Chest_Dip', [5, 9]),

  // ── PULL ────────────────────────────────────────────────────────
  ex('deadlift', 'Deadlift', 'Back', 'Pull', 'Barbell', false, 'Barbell_Deadlift'),
  ex('pullup', 'Pull-up', 'Back', 'Pull', 'Bodyweight', true, 'Pull-up'),
  ex('chinup', 'Chin-up', 'Back', 'Pull', 'Bodyweight', true, 'Chin-up'),
  ex('row-barbell', 'Barbell Row', 'Back', 'Pull', 'Barbell', false, 'Barbell_Bent_Over_Row'),
  ex('row-cable', 'Seated Cable Row', 'Back', 'Pull', 'Cable', false, 'Seated_Cable_Rows'),
  ex('lat-pulldown', 'Lat Pulldown', 'Back', 'Pull', 'Cable', false, 'Wide-Grip_Lat_Pulldown'),
  ex('bicep-curl-db', 'Dumbbell Bicep Curl', 'Arms', 'Pull', 'Dumbbell', false, 'Dumbbell_Alternate_Bicep_Curl', [8, 12]),
  ex('bicep-curl-bb', 'Barbell Bicep Curl', 'Arms', 'Pull', 'Barbell', false, 'Barbell_Curl', [6, 10]),
  ex('face-pull', 'Face Pull', 'Shoulders', 'Pull', 'Cable', false, 'Face_Pull', [12, 20]),
  ex('hammer-curl', 'Hammer Curl', 'Arms', 'Pull', 'Dumbbell', false, 'Dumbbell_Hammer_Curl', [8, 12]),
  ex('shrug', 'Barbell Shrug', 'Back', 'Pull', 'Barbell', false, 'Barbell_Shrug', [8, 12]),

  // ── LEGS ────────────────────────────────────────────────────────
  ex('squat', 'Back Squat', 'Legs', 'Legs', 'Barbell', false, 'Barbell_Full_Squat'),
  ex('front-squat', 'Front Squat', 'Legs', 'Legs', 'Barbell', false, 'Barbell_Front_Squat'),
  ex('leg-press', 'Leg Press', 'Legs', 'Legs', 'Machine', false, 'Leg_Press', [8, 15]),
  ex('rdl', 'Romanian Deadlift', 'Legs', 'Legs', 'Barbell', false, 'Romanian_Deadlift'),
  ex('leg-curl', 'Leg Curl', 'Legs', 'Legs', 'Machine', false, 'Lying_Leg_Curls', [8, 15]),
  ex('leg-extension', 'Leg Extension', 'Legs', 'Legs', 'Machine', false, 'Leg_Extensions', [10, 15]),
  ex('calf-raise', 'Calf Raise', 'Legs', 'Legs', 'Machine', false, 'Standing_Calf_Raises', [12, 20]),
  ex('lunge', 'Barbell Lunge', 'Legs', 'Legs', 'Barbell', false, 'Barbell_Lunge', [8, 12]),
  ex('goblet-squat', 'Goblet Squat', 'Legs', 'Legs', 'Dumbbell', false, 'Dumbbell_Goblet_Squat', [8, 15]),
  ex('hip-thrust', 'Hip Thrust', 'Legs', 'Legs', 'Barbell', false, 'Barbell_Hip_Thrust', [8, 15]),

  // ── CORE ────────────────────────────────────────────────────────
  ex('plank', 'Plank', 'Core', 'Core', 'Bodyweight', true, null, [1, 1]),
  ex('cable-crunch', 'Cable Crunch', 'Core', 'Core', 'Cable', false, 'Cable_Crunch', [12, 20]),
  ex('ab-wheel', 'Ab Wheel Rollout', 'Core', 'Core', 'Bodyweight', true, 'Ab_Roller', [8, 15]),
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'Core', 'Core', 'Bodyweight', true, 'Hanging_Leg_Raise', [10, 15]),
].map((e) => ({ ...e, description: DESCRIPTIONS[e.id] }))

/** Šablony splitů — každá obsahuje pole exercise ID. */
export const SPLIT_TEMPLATES: Array<{
  name: string
  groupId: string
  splits: Array<{ name: string; exerciseIds: string[] }>
}> = [
  {
    name: 'Push / Pull / Legs (PPL)',
    groupId: 'ppl',
    splits: [
      {
        name: 'Push',
        exerciseIds: ['bench-barbell', 'bench-incline-db', 'overhead-press', 'tricep-pushdown', 'cable-fly', 'lateral-raise'],
      },
      {
        name: 'Pull',
        exerciseIds: ['deadlift', 'pullup', 'row-barbell', 'lat-pulldown', 'bicep-curl-db', 'face-pull'],
      },
      {
        name: 'Legs',
        exerciseIds: ['squat', 'leg-press', 'rdl', 'leg-curl', 'leg-extension', 'calf-raise'],
      },
    ],
  },
  {
    name: 'Upper / Lower',
    groupId: 'upper-lower',
    splits: [
      {
        name: 'Upper',
        exerciseIds: ['bench-barbell', 'row-barbell', 'overhead-press', 'lat-pulldown', 'tricep-pushdown', 'bicep-curl-db'],
      },
      {
        name: 'Lower',
        exerciseIds: ['squat', 'rdl', 'leg-press', 'leg-curl', 'leg-extension', 'calf-raise'],
      },
    ],
  },
  {
    name: 'Bro Split',
    groupId: 'bro-split',
    splits: [
      {
        name: 'Chest',
        exerciseIds: ['bench-barbell', 'bench-incline-db', 'cable-fly', 'dips', 'skull-crusher'],
      },
      {
        name: 'Back',
        exerciseIds: ['deadlift', 'pullup', 'row-barbell', 'lat-pulldown', 'face-pull'],
      },
      {
        name: 'Shoulders',
        exerciseIds: ['overhead-press', 'db-shoulder-press', 'lateral-raise', 'face-pull'],
      },
      {
        name: 'Legs',
        exerciseIds: ['squat', 'leg-press', 'rdl', 'leg-curl', 'leg-extension', 'calf-raise'],
      },
      {
        name: 'Arms',
        exerciseIds: ['bicep-curl-db', 'bicep-curl-bb', 'hammer-curl', 'tricep-pushdown', 'skull-crusher'],
      },
    ],
  },
  {
    name: 'Full Body A / B / C',
    groupId: 'full-body',
    splits: [
      {
        name: 'Full Body A',
        exerciseIds: ['squat', 'bench-barbell', 'row-barbell', 'overhead-press', 'bicep-curl-db'],
      },
      {
        name: 'Full Body B',
        exerciseIds: ['deadlift', 'bench-incline-db', 'pullup', 'tricep-pushdown', 'cable-crunch'],
      },
      {
        name: 'Full Body C',
        exerciseIds: ['front-squat', 'db-shoulder-press', 'lat-pulldown', 'hip-thrust', 'lateral-raise'],
      },
    ],
  },
  {
    name: 'Arnold Split',
    groupId: 'arnold',
    splits: [
      {
        name: 'Hrudník & Záda',
        exerciseIds: ['bench-barbell', 'bench-incline-db', 'row-barbell', 'pullup', 'cable-fly', 'lat-pulldown'],
      },
      {
        name: 'Ramena & Paže',
        exerciseIds: ['overhead-press', 'lateral-raise', 'bicep-curl-bb', 'hammer-curl', 'tricep-pushdown', 'skull-crusher'],
      },
      {
        name: 'Nohy',
        exerciseIds: ['squat', 'rdl', 'leg-press', 'leg-curl', 'leg-extension', 'calf-raise'],
      },
    ],
  },
  {
    name: 'Push / Pull',
    groupId: 'push-pull',
    splits: [
      {
        name: 'Push',
        exerciseIds: ['bench-barbell', 'overhead-press', 'bench-incline-db', 'lateral-raise', 'tricep-pushdown', 'cable-fly'],
      },
      {
        name: 'Pull',
        exerciseIds: ['deadlift', 'pullup', 'row-barbell', 'lat-pulldown', 'bicep-curl-db', 'face-pull'],
      },
    ],
  },
]

/** Všechny dostupné cviky (vestavěné + vlastní). */
export function allExercises(customExercises: Exercise[]): Exercise[] {
  return [...BUILTIN_EXERCISES, ...customExercises]
}

/** Najde cvik podle ID (hledá v obou zdrojích). */
export function findExercise(id: string, customExercises: Exercise[]): Exercise | undefined {
  return allExercises(customExercises).find((e) => e.id === id)
}
