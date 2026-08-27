import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import type { SetRole, WorkoutEntry, Exercise, Split } from '@/core'
import {
  allExercises,
  backoffWeight,
  createId,
  findExercise,
  lastPerformance,
  markPRs,
  recentWorkingSets,
  roundToIncrement,
  suggestWorkingSet,
} from '@/core'
import type { DraftSet, DraftEntry } from '@/lib/workoutDraft'
import { clearDraft, loadDraft, saveDraft } from '@/lib/workoutDraft'
import { choose, confirm } from '@/lib/platform'
import { useAppState } from '@/state/AppStateContext'
import { Button, cn } from '@/components/ui'
import { ExerciseImage } from '@/components/ExerciseImage'
import { ExercisePicker } from '@/components/ExercisePicker'
import { RestTimer } from '@/components/RestTimer'
import { PlateCalculator } from '@/components/PlateCalculator'
import { success, tapLight, tapMedium } from '@/lib/haptics'
import { colors } from '@/theme/colors'

function blankWarmup(): DraftSet {
  return { id: createId(), weight: '', reps: '', rpe: '', role: 'warmup', completed: false, isPR: false, skipped: false, suggestion: null, lastPerf: null }
}
function blankWorking(suggestion: DraftSet['suggestion'], lastPerf: DraftSet['lastPerf']): DraftSet {
  return { id: createId(), weight: '', reps: '', rpe: '', role: 'working', completed: false, isPR: false, skipped: false, suggestion, lastPerf }
}
function blankBackoff(workingWeight: number | null, lastPerf: DraftSet['lastPerf'], smallestPlateKg: number): DraftSet {
  const bw = workingWeight ? backoffWeight(workingWeight, { unit: 'kg', smallestPlateKg }) : null
  return {
    id: createId(), weight: bw ? String(bw) : '', reps: '', rpe: '',
    role: 'backoff', completed: false, isPR: false, skipped: false,
    suggestion: bw && lastPerf ? { weight: bw, reps: lastPerf.reps + 1, reason: '' } : null,
    lastPerf,
  }
}
function setToLog(s: DraftSet) {
  return {
    weight: parseFloat(s.weight) || 0,
    reps: parseInt(s.reps) || 0,
    rpe: s.rpe ? parseFloat(s.rpe) : null,
    completed: s.completed,
    role: s.role,
    isPR: s.isPR,
  }
}

/**
 * RIR = kolik opakování zbývalo do selhání. Ukládá se pořád jako RPE
 * (RIR = 10 − RPE), takže historie i export zůstávají beze změny.
 * Tohle je vstup, na kterém stojí celý motor progrese — proto chipy
 * s popiskem místo tlačítka, které cyklovalo šesti čísly bez vysvětlení.
 */
const RIR_OPTIONS: { rir: string; rpe: string; hint: string }[] = [
  { rir: '3+', rpe: '7', hint: 'Easy' },
  { rir: '2', rpe: '8', hint: 'On track' },
  { rir: '1', rpe: '9', hint: 'Hard' },
  { rir: '0', rpe: '10', hint: 'Failure' },
]

function rirLabel(rpe: string): string {
  if (!rpe) return '—'
  const value = 10 - parseFloat(rpe)
  return value >= 3 ? '3+' : String(value)
}
const ROLE_LABEL: Record<SetRole, string> = { warmup: 'W', working: '·', backoff: 'B' }

function SetRow({ set, onChange, onToggleComplete, onToggleSkip, onDelete, isWorking }: {
  set: DraftSet
  onChange: (patch: Partial<DraftSet>) => void
  onToggleComplete: () => void
  onToggleSkip: () => void
  onDelete: () => void
  isWorking?: boolean
}) {
  const accepted = set.completed && !set.skipped
  const [rirOpen, setRirOpen] = useState(false)
  function pickRir(rpe: string) {
    // Ťuknutí na už zvolený chip volbu zruší (zpět na nezadáno).
    onChange({ rpe: set.rpe === rpe ? '' : rpe })
    setRirOpen(false)
    tapLight()
  }
  return (
    <View className={cn('border-t border-white/10', set.skipped ? 'opacity-40' : '')}>
    <View
      className={cn(
        'flex-row items-center gap-1.5 px-3 py-1.5',
        set.skipped ? '' : isWorking && accepted ? 'bg-accent/10' : isWorking ? 'bg-accent/5' : '',
      )}
    >
      <Text className="w-4 text-center text-[10px] font-bold text-muted">{ROLE_LABEL[set.role]}</Text>
      <TextInput
        keyboardType="decimal-pad"
        placeholder={set.suggestion ? String(set.suggestion.weight) : '—'}
        placeholderTextColor={colors.muted + '60'}
        value={set.weight}
        editable={!set.skipped}
        onChangeText={(t) => onChange({ weight: t })}
        accessibilityLabel="Weight in kg"
        className="flex-1 min-w-0 h-9 rounded-2xl bg-panel px-1 text-center font-display text-sm text-white"
        style={{ fontVariant: ['tabular-nums'] }}
      />
      <TextInput
        keyboardType="number-pad"
        placeholder={set.suggestion ? String(set.suggestion.reps) : '—'}
        placeholderTextColor={colors.muted + '60'}
        value={set.reps}
        editable={!set.skipped}
        onChangeText={(t) => onChange({ reps: t })}
        accessibilityLabel="Reps"
        className="flex-1 min-w-0 h-9 rounded-2xl bg-panel px-1 text-center font-display text-sm text-white"
        style={{ fontVariant: ['tabular-nums'] }}
      />
      <Pressable
        onPress={() => setRirOpen((v) => !v)}
        disabled={set.skipped}
        accessibilityLabel={set.rpe ? `Reps in reserve: ${rirLabel(set.rpe)}` : 'Set reps in reserve'}
        className={cn('w-11 h-9 rounded-2xl items-center justify-center', rirOpen ? 'bg-panel2' : 'bg-panel')}
      >
        <Text className={cn('text-xs', set.rpe ? 'text-white' : 'text-muted')}>{rirLabel(set.rpe)}</Text>
      </Pressable>
      <Pressable
        onPress={onToggleSkip}
        accessibilityLabel={set.skipped ? 'Un-skip set' : 'Skip set'}
        className={cn('w-7 h-8 rounded-2xl bg-panel2 items-center justify-center')}
      >
        <Text className={cn('text-xs font-bold', set.skipped ? 'text-accent' : 'text-muted/40')}>—</Text>
      </Pressable>
      <Pressable
        onPress={onToggleComplete}
        disabled={set.skipped}
        accessibilityLabel={accepted ? 'Mark set as not done' : 'Mark set as done'}
        className={cn('w-8 h-8 rounded-xl items-center justify-center', accepted ? 'bg-accent' : 'bg-panel')}
      >
        <Text className={cn('text-sm font-bold', accepted ? 'text-black' : 'text-muted')}>{accepted ? '✓' : '○'}</Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={12} accessibilityLabel="Delete set" className="w-5 h-8 items-center justify-center">
        <Text className="text-muted/30 text-xs">✕</Text>
      </Pressable>
    </View>
    {rirOpen && !set.skipped ? (
      <View className="flex-row items-center gap-1.5 px-3 pb-2">
        <Text className="text-[10px] uppercase tracking-wider text-faint">Reps left</Text>
        {RIR_OPTIONS.map((o) => {
          const active = set.rpe === o.rpe
          return (
            <Pressable
              key={o.rpe}
              onPress={() => pickRir(o.rpe)}
              accessibilityLabel={`${o.hint} — ${o.rir} reps in reserve`}
              accessibilityState={{ selected: active }}
              className={cn('flex-1 h-11 rounded-2xl items-center justify-center', active ? 'bg-accent' : 'bg-panel')}
            >
              <Text className={cn('font-display text-sm', active ? 'text-black' : 'text-white')}>{o.rir}</Text>
              <Text className={cn('text-[9px]', active ? 'text-black/70' : 'text-faint')}>{o.hint}</Text>
            </Pressable>
          )
        })}
      </View>
    ) : null}
    </View>
  )
}

export default function Workout() {
  const params = useLocalSearchParams<{ splitId?: string; resume?: string }>()
  const splitId = params.splitId
  const isResume = params.resume === '1'
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
    return freshSplit.exerciseIds.map((exId) => {
      const exercise = findExercise(exId, data.customExercises)
      const { working: lastWorking, backoff: lastBackoff } = lastPerformance(data.sessions, exId)
      const lastW = lastWorking[0] ?? null
      // Starší tréninky (bez toho posledního) — motor z nich pozná stagnaci.
      const previous = recentWorkingSets(data.sessions, exId).slice(1)
      const sug = exercise ? suggestWorkingSet(lastW, exercise, { unit: 'kg', smallestPlateKg: plate }, previous) : null
      const workingSet = blankWorking(sug, lastW ? { weight: lastW.weight, reps: lastW.reps } : null)
      const lastB = lastBackoff[0] ?? null
      const backoff = blankBackoff(workingSet.suggestion?.weight ?? null, lastB ? { weight: lastB.weight, reps: lastB.reps } : null, plate)
      return { exerciseId: exId, sets: [blankWarmup(), blankWarmup(), workingSet, backoff] }
    })
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
  const [plateCalc, setPlateCalc] = useState<{ open: boolean; weight: number | null }>({ open: false, weight: null })

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
    return () => { mounted = false }
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
    }, 400)
    return () => { if (saveRef.current) clearTimeout(saveRef.current) }
  }, [entries, notes, ready, meta])

  function startRest() {
    setRest({ endsAt: Date.now() + restSec * 1000, total: restSec })
  }
  function adjustRest(delta: number) {
    setRest((r) => (r ? { endsAt: Math.max(Date.now(), r.endsAt + delta * 1000), total: Math.max(15, r.total + delta) } : r))
  }

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i))
  }
  function removeSet(ei: number, si: number) {
    setEntries((prev) => prev.map((e, idx) => (idx === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e)))
  }
  function autoWarmup(ei: number) {
    const entry = entries[ei]
    const w0 = entry.sets.find((s) => s.role === 'working')
    const ww = (w0?.weight ? parseFloat(w0.weight) : null) || w0?.suggestion?.weight || null
    if (!ww || ww <= 0) return
    tapLight()
    const r = (w: number) => roundToIncrement(w, plate)
    const warmups: DraftSet[] = [
      { ...blankWarmup(), weight: String(r(ww * 0.4)), reps: '10' },
      { ...blankWarmup(), weight: String(r(ww * 0.6)), reps: '5' },
      { ...blankWarmup(), weight: String(r(ww * 0.8)), reps: '3' },
    ]
    setEntries((prev) => prev.map((e, i) => (i === ei ? { ...e, sets: [...warmups, ...e.sets.filter((s) => s.role !== 'warmup')] } : e)))
  }
  function addEntry(exercise: Exercise) {
    if (entries.some((e) => e.exerciseId === exercise.id)) return
    const { working: lastWorking, backoff: lastBackoff } = lastPerformance(data.sessions, exercise.id)
    const lastW = lastWorking[0] ?? null
    const previous = recentWorkingSets(data.sessions, exercise.id).slice(1)
    const sug = suggestWorkingSet(lastW, exercise, { unit: 'kg', smallestPlateKg: plate }, previous)
    const workingSet = blankWorking(sug, lastW ? { weight: lastW.weight, reps: lastW.reps } : null)
    const lastB = lastBackoff[0] ?? null
    const backoff = blankBackoff(workingSet.suggestion?.weight ?? null, lastB ? { weight: lastB.weight, reps: lastB.reps } : null, plate)
    setEntries((prev) => [...prev, { exerciseId: exercise.id, sets: [blankWarmup(), blankWarmup(), workingSet, backoff] }])
    setPickerOpen(false)
  }
  const updateSet = useCallback((ei: number, si: number, patch: Partial<DraftSet>) => {
    setEntries((prev) =>
      prev.map((e, idx) => {
        if (idx !== ei) return e
        const sets = e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s))
        if (patch.weight !== undefined) {
          const ww = parseFloat(patch.weight) || null
          return {
            ...e,
            sets: sets.map((s) => {
              if (s.role !== 'backoff') return s
              const bw = ww ? backoffWeight(ww, { unit: 'kg', smallestPlateKg: plate }) : null
              return bw ? { ...s, weight: String(bw) } : s
            }),
          }
        }
        return { ...e, sets }
      }),
    )
  }, [plate])

  // Dokončení série: haptika + spuštění odpočinku (jen working/backoff).
  function toggleComplete(ei: number, si: number) {
    const current = entries[ei]?.sets[si]
    const willComplete = current ? !current.completed : false
    setEntries((prev) =>
      prev.map((e, idx) =>
        idx === ei ? { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, completed: !s.completed, skipped: false } : s)) } : e,
      ),
    )
    if (willComplete) {
      tapMedium()
      if (current && current.role !== 'warmup') startRest()
    }
  }
  function toggleSkip(ei: number, si: number) {
    tapLight()
    setEntries((prev) =>
      prev.map((e, idx) =>
        idx === ei ? { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, skipped: !s.skipped, completed: false } : s)) } : e,
      ),
    )
  }
  function addSet(ei: number, role: SetRole) {
    setEntries((prev) =>
      prev.map((e, idx) => {
        if (idx !== ei) return e
        if (role === 'warmup') return { ...e, sets: [blankWarmup(), ...e.sets] }
        return { ...e, sets: [...e.sets, role === 'working' ? blankWorking(null, null) : blankBackoff(null, null, plate)] }
      }),
    )
  }
  function openPlates(entry: DraftEntry) {
    const w0 = entry.sets.find((s) => s.role === 'working')
    const wkg = (w0?.weight ? parseFloat(w0.weight) : null) || w0?.suggestion?.weight || null
    tapLight()
    setPlateCalc({ open: true, weight: wkg })
  }

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

  function handleFinish() {
    const durationMinutes = Math.round((Date.now() - startTime.current) / 60_000)
    const rawEntries: WorkoutEntry[] = entries.map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: findExercise(e.exerciseId, data.customExercises)?.name ?? e.exerciseId,
      sets: e.sets.filter((s) => !s.skipped).map(setToLog),
    }))
    const rawSession = {
      id: createId(),
      date: new Date().toISOString(),
      splitId: meta.splitId === 'free' ? null : meta.splitId,
      splitName: meta.splitName === 'Session' ? '' : meta.splitName,
      entries: rawEntries,
      durationMinutes,
      notes,
    }
    const marked = markPRs(rawSession, data.sessions)
    addSession(marked)
    void clearDraft()
    success()
    router.replace({ pathname: '/workout-summary', params: { id: marked.id } })
  }

  if (!isFree && !isResume && !freshSplit) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-muted mb-3">Split nenalezen.</Text>
        <Button title="Leave and keep" onPress={() => router.replace('/')} />
      </SafeAreaView>
    )
  }

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <Text className="text-muted">Restoring session</Text>
      </SafeAreaView>
    )
  }

  const totalDone = entries.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0)

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-white/10 px-4 py-3">
        <Pressable onPress={leave} hitSlop={8} accessibilityLabel="Leave session">
          <Text className="text-muted text-lg">✕</Text>
        </Pressable>
        <Text className="flex-1 font-display text-lg text-white">{meta.splitName}</Text>
        <Text className="text-xs text-muted" style={{ fontVariant: ['tabular-nums'] }}>{totalDone} sets</Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="gap-6 py-4 pb-32"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        {entries.map((entry, ei) => {
          const exercise = findExercise(entry.exerciseId, data.customExercises)
          if (!exercise) return null
          const { working: lastWorking } = lastPerformance(data.sessions, exercise.id)
          const sug = entry.sets.find((s) => s.role === 'working')?.suggestion

          return (
            <Animated.View
              key={entry.exerciseId}
              entering={FadeInDown.delay(Math.min(ei, 6) * 50).springify().damping(18)}
              className="rounded-3xl bg-panel border border-white/[0.06] overflow-hidden"
            >
              <View className="flex-row items-center gap-3 px-3 py-2.5 border-b border-white/10">
                <ExerciseImage exercise={exercise} size={40} />
                <View className="flex-1">
                  <Text className="font-display text-base text-white" numberOfLines={1}>{exercise.name}</Text>
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {exercise.muscleGroup}
                    {lastWorking[0] ? ` · last: ${lastWorking[0].reps}×${lastWorking[0].weight} kg${lastWorking[0].rpe ? ` · RIR ${rirLabel(String(lastWorking[0].rpe))}` : ''}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => openPlates(entry)}
                  hitSlop={6}
                  accessibilityLabel="Plate calculator"
                  className="h-8 w-8 items-center justify-center rounded-2xl bg-panel2"
                >
                  <Text className="text-sm">🏋️</Text>
                </Pressable>
                {sug ? (
                  <View className="rounded-full bg-accent/15 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-accent" style={{ fontVariant: ['tabular-nums'] }}>🎯 {sug.weight}×{sug.reps}</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={async () => {
                    const yes = await confirm({
                      title: 'Remove exercise?',
                      message: exercise.name,
                      confirmLabel: 'Remove',
                      destructive: true,
                    })
                    if (yes) removeEntry(ei)
                  }}
                  hitSlop={6}
                  accessibilityLabel="Remove exercise"
                >
                  <Text className="text-muted/40 text-base">✕</Text>
                </Pressable>
              </View>

              {/* hlavička sloupců */}
              <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-panel2">
                <Text className="w-4" />
                <Text className="flex-1 text-center text-[9px] text-muted uppercase font-semibold">kg</Text>
                <Text className="flex-1 text-center text-[9px] text-muted uppercase font-semibold">rep</Text>
                <Text className="w-11 text-center text-[9px] text-muted uppercase font-semibold">RIR</Text>
                <View className="w-7" /><View className="w-8" /><View className="w-5" />
              </View>

              {entry.sets.map((s, si) =>
                s.role === 'warmup' ? (
                  <SetRow key={s.id} set={s} onChange={(p) => updateSet(ei, si, p)} onToggleComplete={() => toggleComplete(ei, si)} onToggleSkip={() => toggleSkip(ei, si)} onDelete={() => removeSet(ei, si)} />
                ) : null,
              )}

              <View className="flex-row items-center justify-between px-3 py-1 bg-accent/5 border-t border-white/10">
                <Text className="text-[9px] font-bold text-accent/60 uppercase tracking-widest">Working</Text>
                <Pressable onPress={() => autoWarmup(ei)} hitSlop={6} accessibilityLabel="Auto warm-up">
                  <Text className="text-[10px] text-accent/60">🔥 Auto warmup</Text>
                </Pressable>
              </View>
              {entry.sets.map((s, si) =>
                s.role === 'working' ? (
                  <SetRow key={s.id} set={s} onChange={(p) => updateSet(ei, si, p)} onToggleComplete={() => toggleComplete(ei, si)} onToggleSkip={() => toggleSkip(ei, si)} onDelete={() => removeSet(ei, si)} isWorking />
                ) : null,
              )}

              <View className="px-3 py-1 bg-accent/5 border-t border-white/10">
                <Text className="text-[9px] font-bold text-accent/60 uppercase tracking-widest">Back-off</Text>
              </View>
              {entry.sets.map((s, si) =>
                s.role === 'backoff' ? (
                  <SetRow key={s.id} set={s} onChange={(p) => updateSet(ei, si, p)} onToggleComplete={() => toggleComplete(ei, si)} onToggleSkip={() => toggleSkip(ei, si)} onDelete={() => removeSet(ei, si)} />
                ) : null,
              )}

              <View className="flex-row gap-2 px-3 py-2.5 border-t border-white/10">
                <Pressable onPress={() => addSet(ei, 'warmup')} accessibilityLabel="Add warm-up set" className="flex-1 border border-dashed border-white/15 rounded-xl py-1.5 items-center">
                  <Text className="text-xs text-muted/50">+ W</Text>
                </Pressable>
                <Pressable onPress={() => addSet(ei, 'working')} accessibilityLabel="Add working set" className="flex-[2] border border-dashed border-white/15 rounded-xl py-1.5 items-center">
                  <Text className="text-xs text-muted">+ Working</Text>
                </Pressable>
                <Pressable onPress={() => addSet(ei, 'backoff')} accessibilityLabel="Add back-off set" className="flex-1 border border-dashed border-accent/20 rounded-xl py-1.5 items-center">
                  <Text className="text-xs text-accent/50">+ B</Text>
                </Pressable>
              </View>
            </Animated.View>
          )
        })}

        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityLabel="Add exercise"
          className="flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 py-4"
        >
          <Text className="text-lg text-muted">+</Text>
          <Text className="text-sm text-muted">Add exercise</Text>
        </Pressable>

        <View>
          <Text className="text-xs font-semibold text-muted">Session note</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional note"
            placeholderTextColor={colors.muted}
            multiline
            className="mt-1 rounded-2xl bg-panel2 px-4 py-3 text-sm text-white min-h-16"
          />
        </View>
      </ScrollView>

      {/* Spodní lišta: odpočinek + dokončení */}
      <View className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-bg pt-2 pb-6">
        {rest ? (
          <RestTimer
            endsAt={rest.endsAt}
            totalSec={rest.total}
            onAdjust={adjustRest}
            onDone={() => setRest(null)}
            onSkip={() => setRest(null)}
          />
        ) : null}
        <View className="px-4">
          <Button title="Finish session" size="lg" onPress={handleFinish} />
        </View>
      </View>

      <ExercisePicker
        visible={pickerOpen}
        exercises={allExercises(data.customExercises)}
        selectedIds={entries.map((e) => e.exerciseId)}
        onToggle={addEntry}
        onClose={() => setPickerOpen(false)}
      />

      <PlateCalculator
        visible={plateCalc.open}
        initialWeight={plateCalc.weight}
        barWeightKg={settings.barWeightKg ?? 20}
        onClose={() => setPlateCalc({ open: false, weight: null })}
      />
    </SafeAreaView>
  )
}
