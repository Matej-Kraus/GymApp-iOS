import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, Vibration, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import type { SetLog, SetRole, WorkoutEntry, Exercise, Split, Unit } from '@/core'
import {
  allExercises,
  backoffWeight,
  createId,
  findExercise,
  fromDisplayWeight,
  lastPerformance,
  markPRs,
  roundToIncrement,
  suggestWorkingSet,
  toDisplayWeight,
} from '@/core'
import { useAppState } from '@/state/AppStateContext'
import { Button, cn } from '@/components/ui'
import { ExerciseImage } from '@/components/ExerciseImage'
import { ExercisePicker } from '@/components/ExercisePicker'
import { colors } from '@/theme/colors'

interface DraftSet {
  id: string
  weight: string
  reps: string
  rpe: string
  role: SetRole
  completed: boolean
  isPR: boolean
  skipped: boolean
  suggestion: { weight: number; reps: number; reason: string } | null
  lastPerf: { weight: number; reps: number } | null
}
interface DraftEntry {
  exerciseId: string
  sets: DraftSet[]
}

function blankWarmup(): DraftSet {
  return { id: createId(), weight: '', reps: '', rpe: '', role: 'warmup', completed: false, isPR: false, skipped: false, suggestion: null, lastPerf: null }
}
function blankWorking(suggestion: DraftSet['suggestion'], lastPerf: DraftSet['lastPerf']): DraftSet {
  return { id: createId(), weight: '', reps: '', rpe: '', role: 'working', completed: false, isPR: false, skipped: false, suggestion, lastPerf }
}
function blankBackoff(workingWeightKg: number | null, lastPerf: DraftSet['lastPerf'], smallestPlateKg: number, unit: Unit): DraftSet {
  const bw = workingWeightKg ? backoffWeight(workingWeightKg, { unit: 'kg', smallestPlateKg }) : null
  return {
    id: createId(), weight: bw != null ? String(toDisplayWeight(bw, unit)) : '', reps: '', rpe: '',
    role: 'backoff', completed: false, isPR: false, skipped: false,
    suggestion: bw != null && lastPerf ? { weight: bw, reps: lastPerf.reps + 1, reason: '' } : null,
    lastPerf,
  }
}
function setToLog(s: DraftSet, unit: Unit): SetLog {
  return {
    weight: fromDisplayWeight(parseFloat(s.weight) || 0, unit),
    reps: parseInt(s.reps) || 0,
    rpe: s.rpe ? parseFloat(s.rpe) : null,
    completed: s.completed,
    role: s.role,
    isPR: s.isPR,
  }
}

/** Kalkulátor kotoučů — samostatná sada pro kg (20kg tyč) a lb (45lb tyč). */
const PLATE_SETS: Record<Unit, { bar: number; plates: number[] }> = {
  kg: { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] },
  lb: { bar: 45, plates: [45, 35, 25, 10, 5, 2.5] },
}

function calcPlates(total: number, unit: Unit): number[] {
  const { bar, plates: set } = PLATE_SETS[unit]
  const perSide = (total - bar) / 2
  if (perSide <= 0) return []
  let rem = perSide
  const result: number[] = []
  for (const p of set) {
    while (rem >= p - 0.001) { result.push(p); rem -= p }
  }
  return result
}

function PlateCalc({ weightStr, unit }: { weightStr: string; unit: Unit }) {
  const w = parseFloat(weightStr)
  const bar = PLATE_SETS[unit].bar
  if (!w || w <= bar) return null
  const plates = calcPlates(w, unit)
  if (plates.length === 0) return null
  return (
    <View className="flex-row items-center gap-1.5 px-3 py-1.5 flex-wrap">
      <Text className="text-[10px] text-muted/60">🏋️</Text>
      {plates.map((p, i) => (
        <View key={i} className="rounded bg-card2 px-1.5 py-0.5">
          <Text className="text-[10px] font-semibold text-muted">{p}</Text>
        </View>
      ))}
      <Text className="text-[10px] text-muted/50">{unit} / strana</Text>
    </View>
  )
}

const RPE_CYCLE = ['', '6', '7', '8', '9', '10']
const ROLE_LABEL: Record<SetRole, string> = { warmup: 'W', working: '·', backoff: 'B' }

function formatRestTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function SetRow({ set, unit, onChange, onDelete, isWorking, onComplete }: {
  set: DraftSet
  unit: Unit
  onChange: (patch: Partial<DraftSet>) => void
  onDelete: () => void
  isWorking?: boolean
  onComplete?: () => void
}) {
  const accepted = set.completed && !set.skipped
  function cycleRpe() {
    const i = RPE_CYCLE.indexOf(set.rpe)
    onChange({ rpe: RPE_CYCLE[(i + 1) % RPE_CYCLE.length] })
  }
  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 px-3 py-1.5 border-t border-white/10',
        set.skipped ? 'opacity-40' : isWorking && accepted ? 'bg-accent/10' : isWorking ? 'bg-accent/5' : '',
      )}
    >
      <Text className="w-4 text-center text-[10px] font-bold text-muted">{ROLE_LABEL[set.role]}</Text>
      <TextInput
        keyboardType="decimal-pad"
        placeholder={set.suggestion ? String(toDisplayWeight(set.suggestion.weight, unit)) : '—'}
        placeholderTextColor={colors.muted + '60'}
        value={set.weight}
        editable={!set.skipped}
        onChangeText={(t) => onChange({ weight: t })}
        className="flex-1 h-9 rounded-lg bg-card px-1 text-center font-display text-sm font-bold text-white"
      />
      <TextInput
        keyboardType="number-pad"
        placeholder={set.suggestion ? String(set.suggestion.reps) : '—'}
        placeholderTextColor={colors.muted + '60'}
        value={set.reps}
        editable={!set.skipped}
        onChangeText={(t) => onChange({ reps: t })}
        className="flex-1 h-9 rounded-lg bg-card px-1 text-center font-display text-sm font-bold text-white"
      />
      <Pressable onPress={cycleRpe} disabled={set.skipped} className="w-11 h-9 rounded-lg bg-card items-center justify-center">
        <Text className="text-xs text-muted">{set.rpe ? `@${set.rpe}` : '—'}</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange({ skipped: !set.skipped, completed: false })}
        className={cn('w-7 h-8 rounded-lg bg-card2 items-center justify-center')}
      >
        <Text className={cn('text-xs font-bold', set.skipped ? 'text-accent' : 'text-muted/40')}>—</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          const completing = !set.completed
          onChange({ completed: completing, skipped: false })
          if (completing && !set.skipped) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            if (onComplete) onComplete()
          }
        }}
        disabled={set.skipped}
        className={cn('w-8 h-8 rounded-xl items-center justify-center', accepted ? 'bg-accent' : 'bg-card')}
      >
        <Text className={cn('text-sm font-bold', accepted ? 'text-black' : 'text-muted')}>{accepted ? '✓' : '○'}</Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={6} className="w-5 items-center">
        <Text className="text-muted/30 text-xs">✕</Text>
      </Pressable>
    </View>
  )
}

export default function Workout() {
  const { splitId } = useLocalSearchParams<{ splitId: string }>()
  const router = useRouter()
  const { data, addSession } = useAppState()
  const settings = data.settings
  const plate = settings.smallestPlateKg
  const unit = settings.unit

  const isFree = splitId === 'free'
  const split = isFree
    ? ({ id: 'free', name: 'Volný trénink', exerciseIds: [] } as Split)
    : data.splits.find((s) => s.id === splitId)
  const startTime = useRef(Date.now())

  const [elapsedSecs, setElapsedSecs] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsedSecs(Math.floor((Date.now() - startTime.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const [restActive, setRestActive] = useState(false)
  const [restSecsLeft, setRestSecsLeft] = useState(0)
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startRestTimer() {
    const secs = settings.restTimerSecs ?? 90
    if (secs <= 0) return
    if (restTimerRef.current) clearInterval(restTimerRef.current)
    setRestSecsLeft(secs)
    setRestActive(true)
    restTimerRef.current = setInterval(() => {
      setRestSecsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(restTimerRef.current!)
          restTimerRef.current = null
          setRestActive(false)
          Vibration.vibrate([0, 400, 200, 400])
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function stopRestTimer() {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current)
      restTimerRef.current = null
    }
    setRestActive(false)
    setRestSecsLeft(0)
  }

  useEffect(() => () => { if (restTimerRef.current) clearInterval(restTimerRef.current) }, [])

  const initialEntries = useMemo<DraftEntry[]>(() => {
    if (isFree || !split) return []
    return split.exerciseIds.map((exId) => {
      const exercise = findExercise(exId, data.customExercises)
      const { working: lastWorking, backoff: lastBackoff } = lastPerformance(data.sessions, exId)
      const lastW = lastWorking[0] ?? null
      const sug = exercise ? suggestWorkingSet(lastW, exercise, { unit: 'kg', smallestPlateKg: plate }) : null
      const workingSet = blankWorking(sug, lastW ? { weight: lastW.weight, reps: lastW.reps } : null)
      const lastB = lastBackoff[0] ?? null
      const backoff = blankBackoff(workingSet.suggestion?.weight ?? null, lastB ? { weight: lastB.weight, reps: lastB.reps } : null, plate, unit)
      return { exerciseId: exId, sets: [blankWarmup(), blankWarmup(), workingSet, backoff] }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [entries, setEntries] = useState<DraftEntry[]>(initialEntries)
  const [notes, setNotes] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i))
  }
  function removeSet(ei: number, si: number) {
    setEntries((prev) => prev.map((e, idx) => (idx === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e)))
  }
  function autoWarmup(ei: number) {
    const entry = entries[ei]
    const w0 = entry.sets.find((s) => s.role === 'working')
    const typedWeightKg = w0?.weight ? fromDisplayWeight(parseFloat(w0.weight) || 0, unit) : 0
    const ww = typedWeightKg || w0?.suggestion?.weight || null
    if (!ww || ww <= 0) return
    const r = (w: number) => roundToIncrement(w, plate)
    const warmups: DraftSet[] = [
      { ...blankWarmup(), weight: String(toDisplayWeight(r(ww * 0.4), unit)), reps: '10' },
      { ...blankWarmup(), weight: String(toDisplayWeight(r(ww * 0.6), unit)), reps: '5' },
      { ...blankWarmup(), weight: String(toDisplayWeight(r(ww * 0.8), unit)), reps: '3' },
    ]
    setEntries((prev) => prev.map((e, i) => (i === ei ? { ...e, sets: [...warmups, ...e.sets.filter((s) => s.role !== 'warmup')] } : e)))
  }
  function addEntry(exercise: Exercise) {
    if (entries.some((e) => e.exerciseId === exercise.id)) return
    const { working: lastWorking, backoff: lastBackoff } = lastPerformance(data.sessions, exercise.id)
    const lastW = lastWorking[0] ?? null
    const sug = suggestWorkingSet(lastW, exercise, { unit: 'kg', smallestPlateKg: plate })
    const workingSet = blankWorking(sug, lastW ? { weight: lastW.weight, reps: lastW.reps } : null)
    const lastB = lastBackoff[0] ?? null
    const backoff = blankBackoff(workingSet.suggestion?.weight ?? null, lastB ? { weight: lastB.weight, reps: lastB.reps } : null, plate, unit)
    setEntries((prev) => [...prev, { exerciseId: exercise.id, sets: [blankWarmup(), blankWarmup(), workingSet, backoff] }])
    setPickerOpen(false)
  }
  const updateSet = useCallback((ei: number, si: number, patch: Partial<DraftSet>) => {
    setEntries((prev) =>
      prev.map((e, idx) => {
        if (idx !== ei) return e
        const sets = e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s))
        if (patch.weight !== undefined) {
          const wwRaw = parseFloat(patch.weight) || null
          const wwKg = wwRaw != null ? fromDisplayWeight(wwRaw, unit) : null
          return {
            ...e,
            sets: sets.map((s) => {
              if (s.role !== 'backoff') return s
              const bw = wwKg ? backoffWeight(wwKg, { unit: 'kg', smallestPlateKg: plate }) : null
              return bw != null ? { ...s, weight: String(toDisplayWeight(bw, unit)) } : s
            }),
          }
        }
        return { ...e, sets }
      }),
    )
  }, [plate, unit])
  function addSet(ei: number, role: SetRole) {
    setEntries((prev) =>
      prev.map((e, idx) => {
        if (idx !== ei) return e
        if (role === 'warmup') return { ...e, sets: [blankWarmup(), ...e.sets] }
        return { ...e, sets: [...e.sets, role === 'working' ? blankWorking(null, null) : blankBackoff(null, null, plate, unit)] }
      }),
    )
  }

  function leave() {
    Alert.alert('Opustit trénink?', 'Neuložený trénink se ztratí.', [
      { text: 'Zůstat', style: 'cancel' },
      { text: 'Opustit', style: 'destructive', onPress: () => router.back() },
    ])
  }

  function handleFinish() {
    const durationMinutes = Math.round((Date.now() - startTime.current) / 60_000)
    const rawEntries: WorkoutEntry[] = entries.map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: findExercise(e.exerciseId, data.customExercises)?.name ?? e.exerciseId,
      sets: e.sets.filter((s) => !s.skipped).map((s) => setToLog(s, unit)),
    }))
    const rawSession = {
      id: createId(),
      date: new Date().toISOString(),
      splitId: split?.id ?? null,
      splitName: split?.name ?? '',
      entries: rawEntries,
      durationMinutes,
      notes,
    }
    const marked = markPRs(rawSession, data.sessions)
    addSession(marked)
    router.replace({ pathname: '/workout-summary', params: { id: marked.id } })
  }

  if (!isFree && !split) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-muted mb-3">Split nenalezen.</Text>
        <Button title="Zpět domů" onPress={() => router.replace('/')} />
      </SafeAreaView>
    )
  }

  const totalDone = entries.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0)
  const { bottom: bottomInset } = useSafeAreaInsets()
  // Výška spodního pruhu: pt-3 (12) + tlačítko h-14 (56) + spodní safe area
  const barHeight = 12 + 56 + bottomInset + 12

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-white/10 px-4 py-3">
        <Pressable onPress={leave} hitSlop={8}>
          <Text className="text-muted text-lg">✕</Text>
        </Pressable>
        <Text className="flex-1 font-display text-lg font-bold text-white">{split!.name}</Text>
        <Text className="text-xs text-muted">{totalDone} sérií · {formatElapsed(elapsedSecs)}</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-6 py-4 pb-32">
        {entries.map((entry, ei) => {
          const exercise = findExercise(entry.exerciseId, data.customExercises)
          if (!exercise) return null
          const { working: lastWorking } = lastPerformance(data.sessions, exercise.id)
          const sug = entry.sets.find((s) => s.role === 'working')?.suggestion

          return (
            <View key={entry.exerciseId} className="rounded-2xl bg-card border border-white/10 overflow-hidden">
              <View className="flex-row items-center gap-3 px-3 py-2.5 border-b border-white/10">
                <ExerciseImage exercise={exercise} size={40} />
                <View className="flex-1">
                  <Text className="font-display text-base font-bold text-white" numberOfLines={1}>{exercise.name}</Text>
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {exercise.muscleGroup}
                    {lastWorking[0] ? ` · minule: ${lastWorking[0].reps}×${toDisplayWeight(lastWorking[0].weight, unit)} ${unit}${lastWorking[0].rpe ? ` @${lastWorking[0].rpe}` : ''}` : ''}
                  </Text>
                </View>
                {sug ? (
                  <View className="rounded-full bg-accent/15 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-accent">🎯 {toDisplayWeight(sug.weight, unit)}×{sug.reps}</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => Alert.alert('Odebrat cvik?', exercise.name, [{ text: 'Zrušit', style: 'cancel' }, { text: 'Odebrat', style: 'destructive', onPress: () => removeEntry(ei) }])}
                  hitSlop={6}
                >
                  <Text className="text-muted/40 text-base">✕</Text>
                </Pressable>
              </View>

              {/* hlavička sloupců */}
              <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-card2">
                <Text className="w-4" />
                <Text className="flex-1 text-center text-[9px] text-muted uppercase font-semibold">{unit}</Text>
                <Text className="flex-1 text-center text-[9px] text-muted uppercase font-semibold">rep</Text>
                <Text className="w-11 text-center text-[9px] text-muted uppercase font-semibold">RPE</Text>
                <View className="w-7" /><View className="w-8" /><View className="w-5" />
              </View>

              {entry.sets.map((s, si) =>
                s.role === 'warmup' ? (
                  <SetRow key={s.id} set={s} unit={unit} onChange={(p) => updateSet(ei, si, p)} onDelete={() => removeSet(ei, si)} />
                ) : null,
              )}

              <View className="flex-row items-center justify-between px-3 py-1 bg-accent/5 border-t border-white/10">
                <Text className="text-[9px] font-bold text-accent/60 uppercase tracking-widest">Working</Text>
                <Pressable onPress={() => autoWarmup(ei)} hitSlop={6}>
                  <Text className="text-[10px] text-accent/60">🔥 Auto warmup</Text>
                </Pressable>
              </View>
              {entry.sets.map((s, si) =>
                s.role === 'working' ? (
                  <SetRow key={s.id} set={s} unit={unit} onChange={(p) => updateSet(ei, si, p)} onDelete={() => removeSet(ei, si)} isWorking onComplete={startRestTimer} />
                ) : null,
              )}

              {settings.showPlateCalc && (
                <PlateCalc weightStr={entry.sets.find((s) => s.role === 'working' && s.weight)?.weight ?? ''} unit={unit} />
              )}

              <View className="px-3 py-1 bg-accent/5 border-t border-white/10">
                <Text className="text-[9px] font-bold text-accent/60 uppercase tracking-widest">Back-off</Text>
              </View>
              {entry.sets.map((s, si) =>
                s.role === 'backoff' ? (
                  <SetRow key={s.id} set={s} unit={unit} onChange={(p) => updateSet(ei, si, p)} onDelete={() => removeSet(ei, si)} onComplete={startRestTimer} />
                ) : null,
              )}

              <View className="flex-row gap-2 px-3 py-2.5 border-t border-white/10">
                <Pressable onPress={() => addSet(ei, 'warmup')} className="flex-1 border border-dashed border-white/15 rounded-md py-1.5 items-center">
                  <Text className="text-xs text-muted/50">+ W</Text>
                </Pressable>
                <Pressable onPress={() => addSet(ei, 'working')} className="flex-[2] border border-dashed border-white/15 rounded-md py-1.5 items-center">
                  <Text className="text-xs text-muted">+ Working</Text>
                </Pressable>
                <Pressable onPress={() => addSet(ei, 'backoff')} className="flex-1 border border-dashed border-accent/20 rounded-md py-1.5 items-center">
                  <Text className="text-xs text-accent/50">+ B</Text>
                </Pressable>
              </View>
            </View>
          )
        })}

        <Pressable
          onPress={() => setPickerOpen(true)}
          className="flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 py-4"
        >
          <Text className="text-lg text-muted">+</Text>
          <Text className="text-sm text-muted">Přidat cvik</Text>
        </Pressable>

        <View>
          <Text className="text-xs font-semibold text-muted">Poznámka k tréninku</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Volitelná poznámka…"
            placeholderTextColor={colors.muted}
            multiline
            className="mt-1 rounded-2xl bg-card2 px-4 py-3 text-sm text-white min-h-16"
          />
        </View>
      </ScrollView>

      {restActive && (
        <View style={{ bottom: barHeight + 8 }} className="absolute inset-x-0 px-4">
          <View className="flex-row items-center rounded-2xl border border-accent/40 bg-card px-4 py-3">
            <Text className="font-display text-2xl font-bold text-accent w-16">{formatRestTime(restSecsLeft)}</Text>
            <Text className="flex-1 text-xs text-muted">Odpočinek</Text>
            <Pressable
              onPress={() => setRestSecsLeft((s) => Math.min(s + 30, 599))}
              className="rounded-xl bg-card2 px-3 py-1.5 mr-2"
            >
              <Text className="text-xs text-white">+30s</Text>
            </Pressable>
            <Pressable onPress={stopRestTimer} className="rounded-xl bg-card2 px-3 py-1.5">
              <Text className="text-xs text-muted">Skip</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View
        style={{ paddingBottom: bottomInset + 12 }}
        className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-bg px-4 pt-3"
      >
        <Button title="Dokončit trénink" size="lg" onPress={handleFinish} />
      </View>

      <ExercisePicker
        visible={pickerOpen}
        exercises={allExercises(data.customExercises)}
        selectedIds={entries.map((e) => e.exerciseId)}
        onToggle={addEntry}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  )
}
