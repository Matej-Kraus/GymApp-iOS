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
  'bench-barbell': 'The main chest press. Lie flat, lower the bar to mid-chest, keep elbows under 45 degrees.',
  'bench-incline-db': 'Incline press biased to the upper chest. Set the bench to 30-45 degrees, dumbbells to shoulder level.',
  'overhead-press': 'Standing press overhead. Start at shoulder height and press straight up, ribs down.',
  'db-shoulder-press': 'Seated dumbbell press. Start level with your ears and press straight up.',
  'dips': 'Parallel-bar dips. Lean forward for chest, stay upright for triceps.',
  'tricep-pushdown': 'Cable triceps isolation. Elbows pinned to your sides, push down to a full lockout.',
  'cable-fly': 'Cable chest fly. Stand centred, soft elbows, bring your hands together in front of the chest.',
  'lateral-raise': 'Dumbbell lateral raise for side delts. Soft elbows, raise to shoulder height, no higher.',
  'skull-crusher': 'Lying triceps extension. Bar to forehead and back, elbows fixed and vertical.',
  'chest-dip': 'Dips angled for chest. Wider grip, more forward lean, sink into a chest stretch.',
  'deadlift': 'The full-body strength lift. Neutral spine, bar against your shins, push the floor away and lock the hips.',
  'pullup': 'Overhand pull-up. Full range, dead hang to chin over the bar. Add weight on a belt when it gets easy.',
  'chinup': 'Underhand pull-up with more biceps. Shoulder-width grip, lower all the way to a dead hang.',
  'row-barbell': 'Bent-over barbell row. Torso near parallel to the floor, pull the bar to your navel.',
  'row-cable': 'Seated cable row. Chest tall, squeeze the shoulder blades, pull to your waist.',
  'lat-pulldown': 'Lat pulldown. Lean back slightly and pull the bar to your upper chest.',
  'bicep-curl-db': 'Dumbbell curl. Alternate or together, full range, no swinging.',
  'bicep-curl-bb': 'Barbell curl. Elbows at your sides, curl to the collarbones, keep the torso still.',
  'face-pull': 'Rope face pull for rear delts and cuff. Cable at head height, pull towards your ears.',
  'hammer-curl': 'Neutral-grip curl that targets brachialis. Thumbs up, full range.',
  'shrug': 'Barbell shrug for traps. Lift straight up, no rolling.',
  'squat': 'Back squat, the foundation of lower-body strength. Sit deep, knees track your toes, chest up.',
  'front-squat': 'Front squat with the bar on the shoulders. More quads, elbows high, torso upright.',
  'leg-press': 'Leg press. Feet shoulder-width, lower to about 90 degrees at the knee.',
  'rdl': 'Romanian deadlift for hamstrings and glutes. Bar close, soft knees, hinge the hips back.',
  'leg-curl': 'Machine hamstring curl. Lie flat, pull your heels to your glutes, full range.',
  'leg-extension': 'Machine quad extension. Control the way down, pause briefly at the top.',
  'calf-raise': 'Calf raise. Full stretch at the bottom, full contraction at the top, no bouncing.',
  'lunge': 'Walking or reverse lunge. Long step, back knee towards the floor, torso upright.',
  'goblet-squat': 'Squat holding a dumbbell at the chest. Great for learning depth and position.',
  'hip-thrust': 'Barbell hip thrust for glutes. Shoulders on a bench, drive the hips to full lockout.',
  'plank': 'Front plank. Ribs down, glutes tight, hold a straight line from head to heels.',
  'cable-crunch': 'Kneeling cable crunch. Round the spine down, pull with the abs, not the arms.',
  'ab-wheel': 'Ab wheel rollout. Roll out only as far as you can hold the ribs down.',
  'hanging-leg-raise': 'Hanging leg raise. Control the swing, lift with the abs, not momentum.',
}

/**
 * Vedlejší svaly. Drženo zvlášť (jako `DESCRIPTIONS`), aby `ex()` nemusela
 * mít další poziční argument. Každý vedlejší sval se počítá jako půl série —
 * bench dělá i tricepsy, jen ne tolik jako prsa.
 */
const SECONDARY: Record<string, Exercise['secondaryMuscles']> = {
  'bench-barbell': ['Triceps', 'ShouldersFront'],
  'bench-incline-db': ['ShouldersFront', 'Triceps'],
  'overhead-press': ['Triceps', 'ShouldersSide'],
  'db-shoulder-press': ['Triceps', 'ShouldersSide'],
  'dips': ['Triceps', 'ShouldersFront'],
  'chest-dip': ['Triceps'],
  'deadlift': ['Hamstrings', 'Glutes', 'Traps'],
  'pullup': ['Biceps'],
  'chinup': ['Biceps'],
  'row-barbell': ['Biceps', 'ShouldersRear'],
  'row-cable': ['Biceps', 'ShouldersRear'],
  'lat-pulldown': ['Biceps'],
  'face-pull': ['Traps'],
  'squat': ['Glutes', 'Hamstrings'],
  'front-squat': ['Glutes', 'Abs'],
  'leg-press': ['Glutes'],
  'rdl': ['Glutes', 'Back'],
  'lunge': ['Glutes', 'Hamstrings'],
  'goblet-squat': ['Glutes'],
  'hip-thrust': ['Hamstrings'],
}

export const BUILTIN_EXERCISES: Exercise[] = [
  // ── PUSH ────────────────────────────────────────────────────────
  ex('bench-barbell', 'Bench Press', 'Chest', 'Push', 'Barbell', false, 'Barbell_Bench_Press_-_Medium_Grip'),
  ex('bench-incline-db', 'Incline Dumbbell Press', 'Chest', 'Push', 'Dumbbell', false, 'Dumbbell_Incline_Bench_Press'),
  ex('overhead-press', 'Overhead Press', 'ShouldersFront', 'Push', 'Barbell', false, 'Barbell_Shoulder_Press'),
  ex('db-shoulder-press', 'Dumbbell Shoulder Press', 'ShouldersFront', 'Push', 'Dumbbell', false, 'Dumbbell_Shoulder_Press'),
  ex('dips', 'Dips', 'Chest', 'Push', 'Bodyweight', true, 'Dips_-_Chest_Version', [5, 9]),
  ex('tricep-pushdown', 'Tricep Pushdown', 'Triceps', 'Push', 'Cable', false, 'Triceps_Pushdown'),
  ex('cable-fly', 'Cable Fly', 'Chest', 'Push', 'Cable', false, 'Cable_Fly', [10, 15]),
  ex('lateral-raise', 'Lateral Raise', 'ShouldersSide', 'Push', 'Dumbbell', false, 'Side_Lateral_Raise', [10, 15]),
  ex('skull-crusher', 'Skull Crusher', 'Triceps', 'Push', 'Barbell', false, 'EZ-Bar_Skullcrusher', [8, 12]),
  ex('chest-dip', 'Chest Dip', 'Chest', 'Push', 'Bodyweight', true, 'Chest_Dip', [5, 9]),

  // ── PULL ────────────────────────────────────────────────────────
  ex('deadlift', 'Deadlift', 'Back', 'Pull', 'Barbell', false, 'Barbell_Deadlift'),
  ex('pullup', 'Pull-up', 'Back', 'Pull', 'Bodyweight', true, 'Pull-up'),
  ex('chinup', 'Chin-up', 'Back', 'Pull', 'Bodyweight', true, 'Chin-up'),
  ex('row-barbell', 'Barbell Row', 'Back', 'Pull', 'Barbell', false, 'Barbell_Bent_Over_Row'),
  ex('row-cable', 'Seated Cable Row', 'Back', 'Pull', 'Cable', false, 'Seated_Cable_Rows'),
  ex('lat-pulldown', 'Lat Pulldown', 'Back', 'Pull', 'Cable', false, 'Wide-Grip_Lat_Pulldown'),
  ex('bicep-curl-db', 'Dumbbell Bicep Curl', 'Biceps', 'Pull', 'Dumbbell', false, 'Dumbbell_Alternate_Bicep_Curl', [8, 12]),
  ex('bicep-curl-bb', 'Barbell Bicep Curl', 'Biceps', 'Pull', 'Barbell', false, 'Barbell_Curl', [6, 10]),
  ex('face-pull', 'Face Pull', 'ShouldersRear', 'Pull', 'Cable', false, 'Face_Pull', [12, 20]),
  ex('hammer-curl', 'Hammer Curl', 'Biceps', 'Pull', 'Dumbbell', false, 'Dumbbell_Hammer_Curl', [8, 12]),
  ex('shrug', 'Barbell Shrug', 'Traps', 'Pull', 'Barbell', false, 'Barbell_Shrug', [8, 12]),

  // ── LEGS ────────────────────────────────────────────────────────
  ex('squat', 'Back Squat', 'Quads', 'Legs', 'Barbell', false, 'Barbell_Full_Squat'),
  ex('front-squat', 'Front Squat', 'Quads', 'Legs', 'Barbell', false, 'Barbell_Front_Squat'),
  ex('leg-press', 'Leg Press', 'Quads', 'Legs', 'Machine', false, 'Leg_Press', [8, 15]),
  ex('rdl', 'Romanian Deadlift', 'Hamstrings', 'Legs', 'Barbell', false, 'Romanian_Deadlift'),
  ex('leg-curl', 'Leg Curl', 'Hamstrings', 'Legs', 'Machine', false, 'Lying_Leg_Curls', [8, 15]),
  ex('leg-extension', 'Leg Extension', 'Quads', 'Legs', 'Machine', false, 'Leg_Extensions', [10, 15]),
  ex('calf-raise', 'Calf Raise', 'Calves', 'Legs', 'Machine', false, 'Standing_Calf_Raises', [12, 20]),
  ex('lunge', 'Barbell Lunge', 'Quads', 'Legs', 'Barbell', false, 'Barbell_Lunge', [8, 12]),
  ex('goblet-squat', 'Goblet Squat', 'Quads', 'Legs', 'Dumbbell', false, 'Dumbbell_Goblet_Squat', [8, 15]),
  ex('hip-thrust', 'Hip Thrust', 'Glutes', 'Legs', 'Barbell', false, 'Barbell_Hip_Thrust', [8, 15]),

  // ── CORE ────────────────────────────────────────────────────────
  ex('plank', 'Plank', 'Abs', 'Core', 'Bodyweight', true, null, [1, 1]),
  ex('cable-crunch', 'Cable Crunch', 'Abs', 'Core', 'Cable', false, 'Cable_Crunch', [12, 20]),
  ex('ab-wheel', 'Ab Wheel Rollout', 'Abs', 'Core', 'Bodyweight', true, 'Ab_Roller', [8, 15]),
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'Abs', 'Core', 'Bodyweight', true, 'Hanging_Leg_Raise', [10, 15]),
].map((e) => ({ ...e, description: DESCRIPTIONS[e.id], secondaryMuscles: SECONDARY[e.id] }))

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
        name: 'Chest & Back',
        exerciseIds: ['bench-barbell', 'bench-incline-db', 'row-barbell', 'pullup', 'cable-fly', 'lat-pulldown'],
      },
      {
        name: 'Shoulders & Arms',
        exerciseIds: ['overhead-press', 'lateral-raise', 'bicep-curl-bb', 'hammer-curl', 'tricep-pushdown', 'skull-crusher'],
      },
      {
        name: 'Legs',
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
