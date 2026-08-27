import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import {
  backoffWeight,
  createId,
  findExercise,
  markPRs,
  warmupSets,
} from '@/core'
import type { Exercise, SetRole, Split, WorkoutEntry } from '@/core'
import type { DraftEntry, DraftSet } from '@/lib/workoutDraft'
import { clearDraft, loadDraft, saveDraft } from '@/lib/workoutDraft'
import { choose } from '@/lib/platform'
import { success, tapLight, tapMedium } from '@/lib/haptics'
import { useAppState } from '@/state/AppStateContext'
import { blankBackoff, blankWarmup, blankWorking, buildEntry, setToLog } from './draftFactories'

/**
 * Všechen stav obrazovky tréninku: série, autosave, obnovení po pádu,
 * odpočinek mezi sériemi a dokončení. Obrazovka pak jen skládá komponenty.
 */

/** Jak dlouho se čeká, než se rozdělaný trénink uloží (ms). */
const AUTOSAVE_DEBOUNCE_MS = 400

export interface WorkoutSessionOptions {
  splitId?: string
  isResume: boolean
}

export function useWorkoutSession({ splitId, isResume }: WorkoutSessionOptions) {
  const router = useRouter()
  const { data, addSession } = useAppState()
  const settings = data.settings
  const plate = settings.smallestPlateKg
  const restSec = settings.restSeconds ?? 120

  const isFree = splitId === 'free'
  const freshSplit = isFree
    ? ({ id: 'free', name: 'Free session', exerciseIds: [] } as Split)
    : data.splits.find((s) => s.id === splitId)
  const startTime = useRef(Date.now())

  function buildInitial(): DraftEntry[] {
    if (isResume || isFree || !freshSplit) return []
    return freshSplit.exerciseIds
      .map((id) => findExercise(id, data.customExercises))
      .filter((e): e is Exercise => !!e)
      .map((exercise) => buildEntry(exercise, data.sessions, plate))
  }

  const [entries, setEntries] = useState<DraftEntry[]>(buildInitial)
  const [notes, setNotes] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [ready, setReady] = useState(!isResume)
  const [meta, setMeta] = useState(() => ({
    splitId: freshSplit?.id ?? 'free',
    splitName: freshSplit?.name ?? 'Session',
  }))
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null)
  const [plateCalc, setPlateCalc] = useState<{ open: boolean; weight: number | null }>({
    open: false,
    weight: null,
  })

  // OBNOVENÍ rozdělaného tréninku po návratu do appky.
  useEffect(() => {
    if (!isResume) return
    let mounted = true
    loadDraft().then((d) => {
      if (!mounted) return
      if (d) {
        setEntries(d.entries)
        setNotes(d.notes)
        startTime.current = d.startedAt
        setMeta({ splitId: d.splitId, splitName: d.splitName })
      }
      setReady(true)
    })
    return () => {
      mounted = false
    }
  }, [isResume])

  // AUTOSAVE draftu (debounced) — aby se rozdělaný trénink neztratil.
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!ready || entries.length === 0) return
    if (saveRef.current) clearTimeout(saveRef.current)
    saveRef.current = setTimeout(() => {
      void saveDraft({
        splitId: meta.splitId,
        splitName: meta.splitName,
        startedAt: startTime.current,
        notes,
        entries,
        savedAt: Date.now(),
      })
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (saveRef.current) clearTimeout(saveRef.current)
    }
  }, [entries, notes, ready, meta])

  function startRest() {
    setRest({ endsAt: Date.now() + restSec * 1000, total: restSec })
  }
  const adjustRest = useCallback((delta: number) => {
    setRest((r) =>
      r
        ? {
            endsAt: Math.max(Date.now(), r.endsAt + delta * 1000),
            total: Math.max(15, r.total + delta),
          }
        : r,
    )
  }, [])
  const stopRest = useCallback(() => setRest(null), [])

  const removeEntry = useCallback((i: number) => {
    setEntries((prev) => prev.filter((_, idx) => idx !== i))
  }, [])

  const removeSet = useCallback((ei: number, si: number) => {
    setEntries((prev) =>
      prev.map((e, idx) => (idx === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e)),
    )
  }, [])

  /** Pracovní váha položky: co je napsané, jinak co navrhl motor. */
  const workingWeightOf = useCallback((entry: DraftEntry): number | null => {
    const w0 = entry.sets.find((s) => s.role === 'working')
    return (w0?.weight ? parseFloat(w0.weight) : null) || w0?.suggestion?.weight || null
  }, [])

  const autoWarmup = useCallback(
    (ei: number) => {
      setEntries((prev) =>
        prev.map((e, i) => {
          if (i !== ei) return e
          const sets = warmupSets(workingWeightOf(e) ?? 0, plate)
          if (sets.length === 0) return e
          const warmups = sets.map((s) => ({
            ...blankWarmup(),
            weight: String(s.weight),
            reps: String(s.reps),
          }))
          return { ...e, sets: [...warmups, ...e.sets.filter((s) => s.role !== 'warmup')] }
        }),
      )
      tapLight()
    },
    [plate, workingWeightOf],
  )

  const addEntry = useCallback(
    (exercise: Exercise) => {
      setEntries((prev) =>
        prev.some((e) => e.exerciseId === exercise.id)
          ? prev
          : [...prev, buildEntry(exercise, data.sessions, plate)],
      )
      setPickerOpen(false)
    },
    [data.sessions, plate],
  )

  const updateSet = useCallback(
    (ei: number, si: number, patch: Partial<DraftSet>) => {
      setEntries((prev) =>
        prev.map((e, idx) => {
          if (idx !== ei) return e
          const sets = e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s))
          // Změna PRACOVNÍ váhy přepočítá back-off (−20 %), aby se
          // předvyplněná hodnota nerozešla se skutečností.
          //
          // Podmínka na roli je podstatná: bez ní se přepočet spustil i při
          // psaní do back-off pole a hodnotu rovnou přepsal na 80 % toho,
          // co uživatel zrovna napsal (50 → 40 pod rukama).
          const editedRole = e.sets[si]?.role
          if (patch.weight !== undefined && editedRole === 'working') {
            const ww = parseFloat(patch.weight) || null
            const bw = ww ? backoffWeight(ww, { unit: 'kg', smallestPlateKg: plate }) : null
            return {
              ...e,
              sets: sets.map((s) =>
                s.role === 'backoff' && bw ? { ...s, weight: String(bw) } : s,
              ),
            }
          }
          return { ...e, sets }
        }),
      )
    },
    [plate],
  )

  /** Dokončení série: haptika + spuštění odpočinku (jen working/backoff). */
  function toggleComplete(ei: number, si: number) {
    const current = entries[ei]?.sets[si]
    const willComplete = current ? !current.completed : false
    setEntries((prev) =>
      prev.map((e, idx) =>
        idx === ei
          ? {
              ...e,
              sets: e.sets.map((s, j) =>
                j === si ? { ...s, completed: !s.completed, skipped: false } : s,
              ),
            }
          : e,
      ),
    )
    if (willComplete) {
      tapMedium()
      if (current && current.role !== 'warmup') startRest()
    }
  }

  const toggleSkip = useCallback((ei: number, si: number) => {
    tapLight()
    setEntries((prev) =>
      prev.map((e, idx) =>
        idx === ei
          ? {
              ...e,
              sets: e.sets.map((s, j) =>
                j === si ? { ...s, skipped: !s.skipped, completed: false } : s,
              ),
            }
          : e,
      ),
    )
  }, [])

  const addSet = useCallback(
    (ei: number, role: SetRole) => {
      setEntries((prev) =>
        prev.map((e, idx) => {
          if (idx !== ei) return e
          if (role === 'warmup') return { ...e, sets: [blankWarmup(), ...e.sets] }
          const fresh =
            role === 'working' ? blankWorking(null, null) : blankBackoff(null, null, plate)
          return { ...e, sets: [...e.sets, fresh] }
        }),
      )
    },
    [plate],
  )

  const openPlates = useCallback(
    (entry: DraftEntry) => {
      tapLight()
      setPlateCalc({ open: true, weight: workingWeightOf(entry) })
    },
    [workingWeightOf],
  )
  const closePlates = useCallback(() => setPlateCalc({ open: false, weight: null }), [])

  async function leave() {
    // Tři možnosti — přesně proto nestačí window.confirm.
    const answer = await choose<'stay' | 'keep' | 'discard'>({
      title: 'Leave this session?',
      message: 'It stays saved. You can pick it up again from Today.',
      options: [
        { label: 'Stay', value: 'stay', style: 'cancel' },
        { label: 'Leave and keep', value: 'keep' },
        { label: 'Discard', value: 'discard', style: 'destructive' },
      ],
    })
    if (answer === 'stay' || answer === null) return
    if (answer === 'discard') void clearDraft()
    router.back()
  }

  function finish() {
    const durationMinutes = Math.round((Date.now() - startTime.current) / 60_000)
    const rawEntries: WorkoutEntry[] = entries.map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: findExercise(e.exerciseId, data.customExercises)?.name ?? e.exerciseId,
      sets: e.sets.filter((s) => !s.skipped).map(setToLog),
    }))
    const marked = markPRs(
      {
        id: createId(),
        date: new Date().toISOString(),
        splitId: meta.splitId === 'free' ? null : meta.splitId,
        splitName: meta.splitName === 'Session' ? '' : meta.splitName,
        entries: rawEntries,
        durationMinutes,
        notes,
      },
      data.sessions,
    )
    addSession(marked)
    void clearDraft()
    success()
    router.replace({ pathname: '/workout-summary', params: { id: marked.id } })
  }

  const totalDone = useMemo(
    () => entries.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0),
    [entries],
  )

  return {
    // stav
    data,
    settings,
    plate,
    entries,
    notes,
    setNotes,
    meta,
    ready,
    rest,
    plateCalc,
    pickerOpen,
    setPickerOpen,
    totalDone,
    splitMissing: !isFree && !isResume && !freshSplit,
    // akce
    addEntry,
    removeEntry,
    addSet,
    removeSet,
    updateSet,
    toggleComplete,
    toggleSkip,
    autoWarmup,
    adjustRest,
    stopRest,
    openPlates,
    closePlates,
    leave,
    finish,
  }
}
