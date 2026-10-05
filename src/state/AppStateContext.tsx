import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppData, Exercise, ExerciseGoal, Settings, Split, WorkoutSession, BodyWeightEntry, MeasurementEntry } from '@/core'
import { createId, createRepository, emptyData, SAMPLE_SPLITS, SAMPLE_SESSIONS } from '@/core'
import { createAsyncStore } from '@/state/asyncStore'
import { maybeAutoSnapshot, safetySnapshot } from '@/lib/backups'

// Posluchač výsledku zápisu — store vzniká mimo React, provider se k němu přihlásí.
let onWriteResult: (ok: boolean) => void = () => {}
const store = createAsyncStore((ok) => onWriteResult(ok))
const repo = createRepository(store)

interface AppStateValue {
  data: AppData
  /** Poslední zápis na disk selhal — změny zatím žijí jen v paměti. */
  saveError: boolean
  dismissSaveError: () => void
  updateSettings: (patch: Partial<Settings>) => void
  addSplit: (split: Split) => void
  updateSplit: (split: Split) => void
  deleteSplit: (id: string) => void
  duplicateSplit: (id: string) => void
  addSession: (session: WorkoutSession) => void
  updateSession: (session: WorkoutSession) => void
  deleteSession: (id: string) => void
  addCustomExercise: (exercise: Exercise) => void
  updateCustomExercise: (exercise: Exercise) => void
  deleteCustomExercise: (id: string) => void
  replaceAllData: (data: AppData) => void
  resetAllData: () => void
  loadSampleData: () => void
  deleteSampleData: () => void
  logBodyWeight: (entry: BodyWeightEntry) => void
  deleteBodyWeightEntry: (date: string) => void
  addGoal: (goal: ExerciseGoal) => void
  deleteGoal: (id: string) => void
  logMeasurement: (entry: MeasurementEntry) => void
  deleteMeasurement: (date: string) => void
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [data, setData] = useState<AppData>(() => emptyData())
  const [saveError, setSaveError] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Pojistné snapshoty potřebují stav PŘED přepsáním, mimo setData updater
  // (ten může React zavolat dvakrát).
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    onWriteResult = (ok) => setSaveError(!ok)
    return () => { onWriteResult = () => {} }
  }, [])

  // Jednorázová hydratace z AsyncStorage do sync cache, pak načteme stav.
  useEffect(() => {
    let mounted = true
    store.hydrate().then(() => {
      if (!mounted) return
      setData(repo.load())
      setHydrated(true)
    })
    return () => { mounted = false }
  }, [])

  // Uložení debounced — max jednou za 300 ms, aby časté aktualizace (logování série)
  // nevytvářely zbytečný write pressure. Neukládáme prázdný stav před hydratací.
  useEffect(() => {
    if (!hydrated) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => repo.save(data), 300)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [data, hydrated])

  // Automatický snapshot — s delší prodlevou, ať se během tréninku nezálohuje
  // každá série. Rozhoduje jádro (core/backup.ts), většinou nic neudělá.
  useEffect(() => {
    if (!hydrated) return
    if (backupTimer.current) clearTimeout(backupTimer.current)
    backupTimer.current = setTimeout(() => void maybeAutoSnapshot(data), 5000)
    return () => { if (backupTimer.current) clearTimeout(backupTimer.current) }
  }, [data, hydrated])

  const value = useMemo<AppStateValue>(
    () => ({
      data,
      saveError,
      dismissSaveError: () => setSaveError(false),
      updateSettings: (patch) =>
        setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      addSplit: (s) => setData((d) => ({ ...d, splits: [...d.splits, s] })),
      updateSplit: (s) =>
        setData((d) => ({ ...d, splits: d.splits.map((x) => (x.id === s.id ? s : x)) })),
      deleteSplit: (id) =>
        setData((d) => ({ ...d, splits: d.splits.filter((s) => s.id !== id) })),
      duplicateSplit: (id) =>
        setData((d) => {
          const orig = d.splits.find((s) => s.id === id)
          if (!orig) return d
          return { ...d, splits: [...d.splits, { ...orig, id: createId(), name: `${orig.name} (copy)` }] }
        }),
      addSession: (s) => setData((d) => ({ ...d, sessions: [...d.sessions, s] })),
      updateSession: (s) =>
        setData((d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === s.id ? s : x)) })),
      deleteSession: (id) =>
        setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) })),
      addCustomExercise: (e) =>
        setData((d) => ({ ...d, customExercises: [...d.customExercises, e] })),
      updateCustomExercise: (e) =>
        setData((d) => ({
          ...d,
          customExercises: d.customExercises.map((x) => (x.id === e.id ? e : x)),
        })),
      deleteCustomExercise: (id) =>
        setData((d) => ({ ...d, customExercises: d.customExercises.filter((e) => e.id !== id) })),
      replaceAllData: (next) => {
        void safetySnapshot(dataRef.current, 'before-restore')
        setData(next)
      },
      resetAllData: () => {
        void safetySnapshot(dataRef.current, 'before-reset')
        setData(emptyData())
      },
      loadSampleData: () =>
        setData((d) => ({
          ...d,
          splits: [...d.splits.filter((s) => !s.isSample), ...SAMPLE_SPLITS],
          sessions: [...d.sessions.filter((s) => !s.isSample), ...SAMPLE_SESSIONS],
        })),
      deleteSampleData: () =>
        setData((d) => ({
          ...d,
          splits: d.splits.filter((s) => !s.isSample),
          sessions: d.sessions.filter((s) => !s.isSample),
        })),
      logBodyWeight: (entry) =>
        setData((d) => ({
          ...d,
          bodyWeightLog: [
            ...d.bodyWeightLog.filter((e) => e.date !== entry.date),
            entry,
          ].sort((a, b) => a.date.localeCompare(b.date)),
        })),
      deleteBodyWeightEntry: (date) =>
        setData((d) => ({
          ...d,
          bodyWeightLog: d.bodyWeightLog.filter((e) => e.date !== date),
        })),
      addGoal: (goal) => setData((d) => ({ ...d, goals: [...d.goals, goal] })),
      deleteGoal: (id) => setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) })),
      logMeasurement: (entry) =>
        setData((d) => ({
          ...d,
          measurements: [
            ...d.measurements.filter((e) => e.date !== entry.date),
            entry,
          ].sort((a, b) => a.date.localeCompare(b.date)),
        })),
      deleteMeasurement: (date) =>
        setData((d) => ({ ...d, measurements: d.measurements.filter((e) => e.date !== date) })),
    }),
    [data, saveError],
  )

  if (!hydrated) return null
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState() must be used inside <AppStateProvider>.')
  return ctx
}
