/**
 * DATOVÝ MODEL APLIKACE — jádro ("mozek").
 *
 * Tahle složka /src/core NESMÍ importovat React ani nic z prohlížeče.
 * Je to schválně: stejný model + logiku chceme později použít beze změny
 * v nativní mobilní verzi (React Native + Expo). Měnit se budou jen obrazovky.
 */

/**
 * Svalová skupina cviku. Třináct skupin, ne šest — „Arms 18 sérií" neřekne,
 * jestli je to 14 na bicepsy a 4 na tricepsy, a bez toho nejde měřit objem
 * proti landmarkům. Popisky a pomocníci jsou v `muscles.ts`.
 */
export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Traps'
  | 'ShouldersFront'
  | 'ShouldersSide'
  | 'ShouldersRear'
  | 'Biceps'
  | 'Triceps'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Abs'

/** Kategorie cviku pro splity (Push / Pull / Legs / Core). */
export type Category = 'Push' | 'Pull' | 'Legs' | 'Core'

/** Druh vybavení. */
export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Bodyweight'
  | 'Cable'
  | 'Other'

/** Jednotky váhy. Default kg. */
export type Unit = 'kg' | 'lb'

/**
 * Role série:
 *  - 'warmup'  = rozcvička, NEPOČÍTÁ se do progrese ani PR
 *  - 'working' = pracovní (těžká) série — málo opakování, strop 9
 *  - 'backoff' = odlehčená série (−20 % váhy) — cíl co nejvíc opakování
 */
export type SetRole = 'warmup' | 'working' | 'backoff'

/** Jeden cvik v knihovně cviků. */
export interface Exercise {
  id: string
  name: string // např. "Bench Press"
  /** Hlavní zatěžovaný sval — počítá se jako celá série. */
  muscleGroup: MuscleGroup
  /** Vedlejší svaly — každý se počítá jako půl série. */
  secondaryMuscles?: MuscleGroup[]
  category: Category // pro zařazení do splitů
  equipment: Equipment
  /** Cvik s vlastní vahou (shyby, dipy): váha = PŘIDANÁ (0 = jen tělo). */
  isBodyweight: boolean
  imageUrl: string | null
  /** true = vytvořil ho uživatel (ne z databáze cviků). */
  isCustom: boolean
  /** Doporučený rozsah opakování, např. [5, 9]. */
  defaultRepRange: [number, number]
  /** Doporučený počet pracovních sérií, např. 3. */
  defaultSets: number
  /** 1–2 věty: na co je cvik a jak se provádí. */
  description?: string
}

/** Tréninkový split = pojmenovaná sada cviků (např. "Push"). */
export interface Split {
  id: string
  name: string
  /** ID cviků v pořadí, v jakém se mají v tréninku cvičit. */
  exerciseIds: string[]
  /** ID skupiny šablony (např. "ppl", "bro-split"). Splity bez groupId = vlastní. */
  groupId?: string
  /** Zobrazovaný název skupiny (např. "Push / Pull / Legs"). */
  groupName?: string
  /** true = vytvořeno jako ukázková data (lze hromadně smazat). */
  isSample?: boolean
}

/** Jedna odcvičená série. */
export interface SetLog {
  /** Váha v kg. U bodyweight cviků = PŘIDANÁ váha (0 = jen tělo). */
  weight: number
  reps: number
  /** RPE 1–10 (jak blízko selhání). null = nezadáno. */
  rpe: number | null
  completed: boolean
  /** Role série (warmup/working/backoff). */
  role: SetRole
  /** Osobní rekord — počítá se automaticky (jen working/backoff). */
  isPR: boolean
}

/** Jeden cvik v rámci tréninku + jeho série. */
export interface WorkoutEntry {
  exerciseId: string
  /** Název ukládáme i textem — kdyby se cvik z knihovny smazal. */
  exerciseName: string
  sets: SetLog[]
  /**
   * Klíč supersetu (A, B, …). Cviky se stejným klíčem se cvičí hned po sobě
   * bez pauzy. Volitelné, takže starší tréninky nepotřebují migraci.
   */
  supersetGroup?: string | null
}

/** Celý jeden odtrénovaný trénink. */
export interface WorkoutSession {
  id: string
  /** ISO řetězec, např. "2026-06-01T18:30:00.000Z". */
  date: string
  splitId: string | null
  /** Název splitu ukládáme i textem (kdyby se split smazal). */
  splitName: string
  entries: WorkoutEntry[]
  durationMinutes: number | null
  notes: string
  /** true = součást ukázkových dat. */
  isSample?: boolean
}

/** Jeden záznam tělesné váhy. */
export interface BodyWeightEntry {
  /** Datum ve formátu "YYYY-MM-DD". */
  date: string
  kg: number
}

/** Uživatelská nastavení. */
export interface Settings {
  /** Zobrazované jednotky (default kg). Interně počítáme vždy v kg. */
  unit: Unit
  /** Nejmenší dostupný kotouč v kg → na něj zaokrouhlujeme přírůstky. */
  smallestPlateKg: number
  /** Aktivní tréninkový program = groupId (např. "ppl"). Řídí doporučení dalšího tréninku. */
  activeProgramId?: string
  /** Připomínka tréninku (lokální notifikace). */
  reminder?: ReminderConfig
  /** Výchozí délka odpočinku mezi sériemi (s). Default 120. */
  restSeconds?: number
  /** Hmotnost osy (kg) pro kalkulačku kotoučů. Default 20. */
  barWeightKg?: number
  /** true = uživatel prošel úvodním onboardingem (nezobrazovat znovu). */
  onboarded?: boolean
  /** Mezocyklus (týdny akumulace + deload). Nenastaveno = neřeší se. */
  mesocycle?: MesocycleConfig
  /** Kolik rozcvičovacích sérií nabídnout. Default 'standard'. */
  warmupScheme?: 'short' | 'standard' | 'thorough'
  /**
   * Vlastní poznámky ke cvikům podle `exerciseId` — výška sedačky, úchop.
   * Volitelná mapa v nastavení, takže žádná nová entita ani migrace.
   */
  exerciseNotes?: Record<string, string>
}

/**
 * Mezocyklus. Schválně jen konfigurace v `Settings`, ne vlastní entita —
 * díky tomu nepotřebuje migraci ani nemění tvar exportu.
 */
export interface MesocycleConfig {
  /** ISO datum (YYYY-MM-DD), odkdy se cyklus počítá. */
  startDate: string
  /** Celková délka cyklu v týdnech včetně deloadu. */
  lengthWeeks: number
  /** true = poslední týden je deload. */
  deloadWeek: boolean
}

/** Nastavení připomínky tréninku. `days`: 1 = pondělí … 7 = neděle. */
export interface ReminderConfig {
  enabled: boolean
  /** Hodina (0–23), minuta vždy 0. */
  hour: number
  /** Dny v týdnu (1 = Po … 7 = Ne). */
  days: number[]
}

/** Jeden záznam tělesných měr (obvody v cm). Všechny míry volitelné. */
export interface MeasurementEntry {
  /** Datum ve formátu "YYYY-MM-DD". */
  date: string
  /** Pas (cm). */
  waist?: number
  /** Hrudník (cm). */
  chest?: number
  /** Paže (cm). */
  arms?: number
  /** Stehno (cm). */
  thighs?: number
}

/** Cíl pro konkrétní cvik — cílový odhadovaný 1RM. */
export interface ExerciseGoal {
  id: string
  exerciseId: string
  exerciseName: string
  targetE1RM: number
  deadline?: string
  createdAt: string
}

/**
 * Kompletní stav aplikace tak, jak ho ukládáme i exportujeme (záloha).
 */
export interface AppData {
  /** Verze formátu dat — kvůli budoucím migracím. */
  version: number
  /** Vlastní cviky vytvořené uživatelem. */
  customExercises: Exercise[]
  splits: Split[]
  sessions: WorkoutSession[]
  settings: Settings
  /** Log tělesné váhy — jeden záznam na den. */
  bodyWeightLog: BodyWeightEntry[]
  /** Cíle pro jednotlivé cviky (cílový 1RM). */
  goals: ExerciseGoal[]
  /** Log tělesných měr (obvody) — jeden záznam na den. */
  measurements: MeasurementEntry[]
}
