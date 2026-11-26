import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { Exercise } from '@/core'
import { allExercises, exerciseHistory, findExercise, lastPerformance, supersetLabel } from '@/core'
import { Button, Field, GUTTER, IconButton, Rule, Sheet, Title, tnum } from '@/components/ui'
import { ExercisePicker } from '@/components/ExercisePicker'
import { PlateCalculator } from '@/components/PlateCalculator'
import { ExerciseBlock } from '@/features/workout/ExerciseBlock'
import { ExerciseHistorySheet } from '@/features/workout/ExerciseHistorySheet'
import { WorkoutFooter } from '@/features/workout/WorkoutFooter'
import { useWorkoutSession } from '@/features/workout/useWorkoutSession'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'

/**
 * Obrazovka tréninku — jen skládá dohromady. Stav a pravidla jsou v
 * `useWorkoutSession`, vzhled jednotlivých částí ve `features/workout`.
 */
export default function Workout() {
  const params = useLocalSearchParams<{ splitId?: string; resume?: string }>()
  const router = useRouter()
  const t = tr()
  const w = t.workout
  const s = useWorkoutSession({ splitId: params.splitId, isResume: params.resume === '1' })
  const [historyFor, setHistoryFor] = useState<Exercise | null>(null)
  const [noteFor, setNoteFor] = useState<Exercise | null>(null)

  if (s.splitMissing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="mb-4 text-[16px] text-muted">{w.notFound}</Text>
        <Button title={w.backToToday} onPress={() => router.replace('/')} />
      </SafeAreaView>
    )
  }

  if (!s.ready) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg">
        <Text className="text-[16px] text-muted">{w.restoring}</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center" style={{ paddingLeft: 6, paddingRight: GUTTER, height: 52 }}>
        <IconButton icon="close" label={w.leave} onPress={s.leave} />
        <Title size="sm" className="ml-1 flex-1">
          {s.meta.splitName === 'Session' ? w.freeName : s.meta.splitName}
        </Title>
        <Elapsed startedAt={s.startedAt} />
      </View>
      <Rule />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 190 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        {s.entries.map((entry, ei) => {
          const exercise = findExercise(entry.exerciseId, s.data.customExercises)
          if (!exercise) return null
          const { working } = lastPerformance(s.data.sessions, exercise.id)

          return (
            <View key={entry.exerciseId} style={{ marginBottom: 28 }}>
              <ExerciseBlock
                entry={entry}
                exercise={exercise}
                lastWorking={working[0] ?? null}
                onUpdateSet={(si, patch) => s.updateSet(ei, si, patch)}
                onToggleComplete={(si) => s.toggleComplete(ei, si)}
                onToggleSkip={(si) => s.toggleSkip(ei, si)}
                onDeleteSet={(si) => s.removeSet(ei, si)}
                onAddSet={(role) => s.addSet(ei, role)}
                onAutoWarmup={() => s.autoWarmup(ei)}
                onOpenPlates={() => s.openPlates(entry)}
                onOpenHistory={() => setHistoryFor(exercise)}
                onOpenNote={() => setNoteFor(exercise)}
                onRemove={() => s.removeEntry(ei)}
                supersetLabel={supersetLabel(s.entries, ei)}
                onToggleSuperset={() => s.toggleSuperset(ei)}
                substitutes={s.substitutesFor(exercise)}
                onReplace={(replacement) => s.replaceEntry(ei, replacement)}
                note={s.noteFor(entry.exerciseId)}
              />
            </View>
          )
        })}

        <Pressable
          onPress={() => s.setPickerOpen(true)}
          accessibilityRole="button"
          className="h-[52px] flex-row items-center justify-center rounded-[10px] bg-panel2 active:opacity-70"
          style={{ gap: 6 }}
        >
          <Ionicons name="add" size={20} color={colors.text} />
          <Text className="text-[16px] font-semibold text-white">{w.addExercise}</Text>
        </Pressable>

        <Field
          className="mt-6"
          label={w.sessionNote}
          value={s.notes}
          onChangeText={s.setNotes}
          placeholder={w.sessionNotePlaceholder}
          multiline
        />
      </ScrollView>

      <WorkoutFooter
        rest={s.rest}
        allDone={s.allDone}
        onAdjustRest={s.adjustRest}
        onStopRest={s.stopRest}
        onFinish={s.finish}
      />

      <ExercisePicker
        visible={s.pickerOpen}
        exercises={allExercises(s.data.customExercises)}
        selectedIds={s.entries.map((e) => e.exerciseId)}
        onToggle={s.addEntry}
        onClose={() => s.setPickerOpen(false)}
      />

      <ExerciseHistorySheet
        exercise={historyFor}
        history={historyFor ? exerciseHistory(s.data.sessions, historyFor.id) : null}
        onClose={() => setHistoryFor(null)}
      />

      <Sheet visible={noteFor !== null} onClose={() => setNoteFor(null)} title={w.menuNote}>
        <Field
          value={noteFor ? s.noteFor(noteFor.id) : ''}
          onChangeText={(v) => noteFor && s.setNoteFor(noteFor.id, v)}
          placeholder={w.notePlaceholder}
          multiline
          autoFocus
        />
        <Text className="mt-2 text-[14px] text-muted">{w.noteHint}</Text>
        <Button className="mt-4" title={t.common.done} variant="secondary" onPress={() => setNoteFor(null)} />
      </Sheet>

      <PlateCalculator
        visible={s.plateCalc.open}
        initialWeight={s.plateCalc.weight}
        barWeightKg={s.settings.barWeightKg ?? 20}
        onClose={s.closePlates}
      />
    </SafeAreaView>
  )
}

/** Čas od začátku tréninku v minutách. Stačí přepočet jednou za 20 s. */
function Elapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20_000)
    return () => clearInterval(id)
  }, [])
  const min = Math.max(0, Math.floor((now - startedAt) / 60_000))
  return (
    <Text className="text-[16px] text-muted" style={tnum}>
      {min} min
    </Text>
  )
}
