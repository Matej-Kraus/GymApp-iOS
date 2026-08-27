import { ScrollView, Text, TextInput, View, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { allExercises, findExercise, lastPerformance } from '@/core'
import { Button } from '@/components/ui'
import { ExercisePicker } from '@/components/ExercisePicker'
import { PlateCalculator } from '@/components/PlateCalculator'
import { ExerciseCard } from '@/features/workout/ExerciseCard'
import { WorkoutFooter } from '@/features/workout/WorkoutFooter'
import { useWorkoutSession } from '@/features/workout/useWorkoutSession'
import { colors } from '@/theme/colors'

/**
 * Obrazovka tréninku — jen skládá dohromady. Stav a pravidla jsou v
 * `useWorkoutSession`, vzhled jednotlivých částí ve `features/workout`.
 */
export default function Workout() {
  const params = useLocalSearchParams<{ splitId?: string; resume?: string }>()
  const router = useRouter()
  const s = useWorkoutSession({ splitId: params.splitId, isResume: params.resume === '1' })

  if (s.splitMissing) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-muted mb-3">Split not found.</Text>
        <Button title="Back to Today" onPress={() => router.replace('/')} />
      </SafeAreaView>
    )
  }

  if (!s.ready) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <Text className="text-muted">Restoring session</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-white/10 px-4 py-3">
        <Pressable onPress={s.leave} hitSlop={10} accessibilityLabel="Leave session">
          <Text className="text-muted text-lg">✕</Text>
        </Pressable>
        <Text className="flex-1 font-display text-lg text-white">{s.meta.splitName}</Text>
        <Text className="text-xs text-muted" style={{ fontVariant: ['tabular-nums'] }}>
          {s.totalDone} sets
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="gap-6 py-4 pb-32"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        {s.entries.map((entry, ei) => {
          const exercise = findExercise(entry.exerciseId, s.data.customExercises)
          if (!exercise) return null
          const { working } = lastPerformance(s.data.sessions, exercise.id)

          return (
            <ExerciseCard
              key={entry.exerciseId}
              entry={entry}
              exercise={exercise}
              index={ei}
              lastWorking={working[0] ?? null}
              onUpdateSet={(si, patch) => s.updateSet(ei, si, patch)}
              onToggleComplete={(si) => s.toggleComplete(ei, si)}
              onToggleSkip={(si) => s.toggleSkip(ei, si)}
              onDeleteSet={(si) => s.removeSet(ei, si)}
              onAddSet={(role) => s.addSet(ei, role)}
              onAutoWarmup={() => s.autoWarmup(ei)}
              onOpenPlates={() => s.openPlates(entry)}
              onRemove={() => s.removeEntry(ei)}
            />
          )
        })}

        <Pressable
          onPress={() => s.setPickerOpen(true)}
          accessibilityLabel="Add exercise"
          className="flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 py-4"
        >
          <Text className="text-lg text-muted">+</Text>
          <Text className="text-sm text-muted">Add exercise</Text>
        </Pressable>

        <View>
          <Text className="text-xs font-semibold text-muted">Session note</Text>
          <TextInput
            value={s.notes}
            onChangeText={s.setNotes}
            placeholder="Optional note"
            placeholderTextColor={colors.muted}
            multiline
            className="mt-1 rounded-2xl bg-panel2 px-4 py-3 text-sm text-white min-h-16"
          />
        </View>
      </ScrollView>

      <WorkoutFooter
        rest={s.rest}
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

      <PlateCalculator
        visible={s.plateCalc.open}
        initialWeight={s.plateCalc.weight}
        barWeightKg={s.settings.barWeightKg ?? 20}
        onClose={s.closePlates}
      />
    </SafeAreaView>
  )
}
