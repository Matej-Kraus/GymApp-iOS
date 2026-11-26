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
import { createId, createRepository, emptyData, SAMPLE_SPLITS, SAMPLE_SESSIONS, serialize } from '@/core'
import { createAsyncStore } from '@/state/asyncStore'
import * as FileSystem from 'expo-file-system/legacy'

interface AppStateValue {
  data: AppData
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
  saveError: boolean
  dismissSaveError: () => void
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [data, setData] = useState<AppData>(() => emptyData())
  const [saveError, setSaveError] = useState(false)
  const [store] = useState(() => createAsyncStore(() => setSaveError(true)))
  const [repo] = useState(() => createRepository(store))
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Jednorázová hydratace z AsyncStorage. Pokud je prázdný, zkusí načíst
  // zálohu z iCloud Documents (přeinstalace, nový telefon).
  useEffect(() => {
    let mounted = true
    store.hydrate().then(async () => {
      if (!mounted) return
      const loaded = repo.load()
      if (loaded.sessions.length === 0 && loaded.splits.length === 0) {
        try {
          const path = FileSystem.documentDirectory + 'workout-backup.json'
          const info = await FileSystem.getInfoAsync(path)
          if (info.exists) {
            const { deserialize } = await import('@/core')
            const raw = await FileSystem.readAsStringAsync(path)
            const restored = deserialize(raw)
            if (restored.sessions.length > 0 || restored.splits.length > 0) {
              setData(restored)
              setHydrated(true)
              return
            }
          }
        } catch {
          // žádná záloha — pokračujeme s prázdným stavem
        }
      }
      setData(loaded)
      setHydrated(true)
    })
    return () => { mounted = false }
  }, [])

  // Uložení debounced — max jednou za 300 ms, aby časté aktualizace (logování série)
  // nevytvářely zbytečný write pressure. Neukládáme prázdný stav před hydratací.
  useEffect(() => {
    if (!hydrated) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const ok = repo.save(data)
      setSaveError((prev) => (ok ? false : prev || true))
      // Automatická záloha do iCloud Drive (Documents/workout-backup.json).
      // iOS zálohuje Documents do iCloudu — data přežijí přeinstalaci.
      // Best-effort, chyba se uživateli nezobrazuje (jen doplňková záloha).
      const path = FileSystem.documentDirectory + 'workout-backup.json'
      FileSystem.writeAsStringAsync(path, serialize(data)).catch(() => {})
    }, 300)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [data, hydrated])

  const value = useMemo<AppStateValue>(
    () => ({
      data,
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
          return { ...d, splits: [...d.splits, { ...orig, id: createId(), name: `${orig.name} (kopie)` }] }
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
      replaceAllData: (next) => setData(next),
      resetAllData: () => setData(emptyData()),
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
      saveError,
      dismissSaveError: () => setSaveError(false),
    }),
    [data, saveError],
  )

  if (!hydrated) return null
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState() musí být uvnitř <AppStateProvider>.')
  return ctx
}
