import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { allExercises, createId, findExercise } from '@/core'
import type { SetLog, SetRole, WorkoutSession } from '@/core'
import type { DraftEntry, DraftSet } from '@/lib/workoutDraft'
import { Button, Field, GUTTER, IconButton, Rule, Title } from '@/components/ui'
import { ExercisePicker } from '@/components/ExercisePicker'
import { COL, SetRow } from '@/features/workout/SetRow'
import { setToLog } from '@/features/workout/draftFactories'
import { useAppState } from '@/state/AppStateContext'
import { choose } from '@/lib/platform'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'
import { exName } from '@/lib/exerciseName'

/**
 * Úprava odcvičeného tréninku a zpětné doplnění staršího.
 *
 * Série se editují stejným řádkem jako v tréninku (`SetRow`), jen nad
 * uloženými daty: SetLog se převede na draft a při uložení zpět. Rekordy
 * přepočítá `saveSession` v celé historii — úprava starého tréninku je umí
 * posunout na jiný den.
 */

function toDraft(set: SetLog): DraftSet {
  return {
    id: createId(),
    weight: String(set.weight),
    reps: String(set.reps),
    rpe: set.rpe ? String(set.rpe) : '',
    role: set.role,
    completed: set.completed,
    isPR: false,
    skipped: false,
    suggestion: null,
    lastPerf: null,
  }
}

function blankSet(role: SetRole): DraftSet {
  return {
    id: createId(), weight: '', reps: '', rpe: '', role,
    completed: true, isPR: false, skipped: false, suggestion: null, lastPerf: null,
  }
}

export default function SessionEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()
  const { data, saveSession } = useAppState()
  const t = tr()
  const e = t.edit
  const original = useMemo(() => data.sessions.find((s) => s.id === id) ?? null, [data.sessions, id])

  const start = original ? new Date(original.date) : new Date()
  const [day, setDay] = useState(String(start.getDate()))
  const [month, setMonth] = useState(String(start.getMonth() + 1))
  const [year, setYear] = useState(String(start.getFullYear()))
  const [name, setName] = useState(original?.splitName ?? '')
  const [duration, setDuration] = useState(original?.durationMinutes ? String(original.durationMinutes) : '')
  const [notes, setNotes] = useState(original?.notes ?? '')
  const [entries, setEntries] = useState<DraftEntry[]>(
    () =>
      original?.entries.map((en) => ({
        exerciseId: en.exerciseId,
        supersetGroup: en.supersetGroup ?? null,
        sets: en.sets.map(toDraft),
      })) ?? [],
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (id && !original) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="mb-4 text-[16px] text-muted">{e.notFound}</Text>
        <Button title={t.common.back} onPress={() => router.back()} />
      </SafeAreaView>
    )
  }

  const patchSets = (ei: number, fn: (sets: DraftSet[]) => DraftSet[]) =>
    setEntries((prev) => prev.map((en, i) => (i === ei ? { ...en, sets: fn(en.sets) } : en)))

  async function addSet(ei: number) {
    const w = t.workout
    const role = await choose<SetRole | 'cancel'>({
      title: w.addSetTitle,
      options: [
        { label: w.role.working, value: 'working', style: 'neutral' },
        { label: w.role.backoff, value: 'backoff', style: 'neutral' },
        { label: w.role.warmup, value: 'warmup', style: 'neutral' },
        { label: t.common.cancel, value: 'cancel', style: 'cancel' },
      ],
    })
    if (role && role !== 'cancel') patchSets(ei, (sets) => [...sets, blankSet(role)])
  }

  /** Den v místním poledni — půlnoc by při přechodu na letní čas mohla spadnout do vedlejšího dne. */
  function buildDate(): Date | null {
    const d = Number(day)
    const m = Number(month)
    const y = Number(year)
    if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return null
    const date = new Date(y, m - 1, d, 12, 0, 0)
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
    if (date.getTime() > Date.now() + 86_400_000) return null
    return date
  }

  function save() {
    const date = buildDate()
    if (!date) return setError(e.invalidDate)
    const logged = entries
      .map((en) => ({
        exerciseId: en.exerciseId,
        exerciseName:
          findExercise(en.exerciseId, data.customExercises)?.name ??
          original?.entries.find((o) => o.exerciseId === en.exerciseId)?.exerciseName ??
          en.exerciseId,
        sets: en.sets.filter((s) => !s.skipped).map(setToLog),
        supersetGroup: en.supersetGroup ?? null,
      }))
      .filter((en) => en.sets.length > 0)
    if (!logged.some((en) => en.sets.some((s) => s.completed))) return setError(e.noSets)

    // Původní čas tréninku zůstává, mění se jen den; nový trénink je v poledne.
    const iso = original ? new Date(original.date) : date
    iso.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
    const session: WorkoutSession = {
      id: original?.id ?? createId(),
      date: iso.toISOString(),
      splitId: original?.splitId ?? null,
      splitName: name.trim(),
      entries: logged,
      durationMinutes: parseInt(duration, 10) || null,
      notes,
      isSample: original?.isSample,
    }
    saveSession(session)
    router.back()
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center" style={{ paddingLeft: 6, paddingRight: GUTTER, height: 52 }}>
        <IconButton icon="close" label={t.common.close} onPress={() => router.back()} />
        <Title size="sm" className="ml-1 flex-1">
          {original ? e.titleEdit : e.titleAdd}
        </Title>
        <Button title={t.common.save} size="sm" onPress={save} />
      </View>
      <Rule />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View className="flex-row" style={{ gap: 8 }}>
          <Field className="flex-1" label={e.day} value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} />
          <Field className="flex-1" label={e.month} value={month} onChangeText={setMonth} keyboardType="number-pad" maxLength={2} />
          <Field className="flex-[1.4]" label={e.year} value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
        </View>
        <View className="mt-3 flex-row" style={{ gap: 8 }}>
          <Field className="flex-[2]" label={e.name} value={name} onChangeText={setName} placeholder={e.namePlaceholder} />
          <Field className="flex-1" label={e.duration} value={duration} onChangeText={setDuration} keyboardType="number-pad" maxLength={3} />
        </View>
        {error ? <Text className="mt-3 text-[15px] text-danger">{error}</Text> : null}

        {entries.map((entry, ei) => {
          const known = findExercise(entry.exerciseId, data.customExercises)
          const title = known
            ? exName(known)
            : (original?.entries.find((o) => o.exerciseId === entry.exerciseId)?.exerciseName ?? entry.exerciseId)
          let workingNo = 0
          return (
            <View key={entry.exerciseId} className="mt-8">
              <View className="flex-row items-center" style={{ marginRight: -10 }}>
                <Title size="md" className="flex-1">
                  {title}
                </Title>
                <IconButton
                  icon="trash-outline"
                  label={`${e.removeExercise}: ${title}`}
                  onPress={() => setEntries((prev) => prev.filter((_, i) => i !== ei))}
                />
              </View>
              <View className="mt-2 flex-row items-center pb-1.5" style={{ gap: COL.gap }}>
                <View style={{ width: COL.label }} />
                <Text className="flex-1 text-center text-[13px] text-faint">{t.common.kg}</Text>
                <Text className="flex-1 text-center text-[13px] text-faint">{t.common.reps}</Text>
                <Text className="text-center text-[13px] text-faint" style={{ width: COL.rir }}>
                  {t.workout.colRir}
                </Text>
                <View style={{ width: COL.done }} />
              </View>
              <Rule />
              <View style={{ paddingTop: 4 }}>
                {entry.sets.map((set, si) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    label={set.role === 'working' ? String(++workingNo) : t.workout.roleShort[set.role]}
                    onChange={(p) => patchSets(ei, (sets) => sets.map((s, j) => (j === si ? { ...s, ...p } : s)))}
                    onToggleComplete={() =>
                      patchSets(ei, (sets) =>
                        sets.map((s, j) => (j === si ? { ...s, completed: !s.completed, skipped: false } : s)),
                      )
                    }
                    onToggleSkip={() =>
                      patchSets(ei, (sets) =>
                        sets.map((s, j) => (j === si ? { ...s, skipped: !s.skipped, completed: false } : s)),
                      )
                    }
                    onDelete={() => patchSets(ei, (sets) => sets.filter((_, j) => j !== si))}
                  />
                ))}
              </View>
              <Pressable
                onPress={() => addSet(ei)}
                accessibilityRole="button"
                className="h-11 flex-row items-center active:opacity-60"
                style={{ gap: 6, paddingLeft: 6 }}
              >
                <Ionicons name="add" size={20} color={colors.muted} />
                <Text className="text-[15px] text-muted">{t.workout.addSet}</Text>
              </Pressable>
            </View>
          )
        })}

        <Button className="mt-8" variant="secondary" title={t.workout.addExercise} onPress={() => setPickerOpen(true)} />
        <Field
          className="mt-6"
          label={t.workout.sessionNote}
          value={notes}
          onChangeText={setNotes}
          placeholder={t.workout.sessionNotePlaceholder}
          multiline
        />
      </ScrollView>

      <ExercisePicker
        visible={pickerOpen}
        exercises={allExercises(data.customExercises)}
        selectedIds={entries.map((en) => en.exerciseId)}
        onToggle={(exercise) => {
          setEntries((prev) =>
            prev.some((en) => en.exerciseId === exercise.id)
              ? prev
              : [...prev, { exerciseId: exercise.id, sets: [blankSet('working')] }],
          )
          setPickerOpen(false)
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  )
}
