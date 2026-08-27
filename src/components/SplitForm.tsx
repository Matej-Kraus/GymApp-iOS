import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import type { Exercise, Split } from '@/core'
import { createId, allExercises } from '@/core'
import { Button, Card, cn } from '@/components/ui'
import { ExercisePicker } from '@/components/ExercisePicker'
import { ExerciseImage } from '@/components/ExerciseImage'
import { useAppState } from '@/state/AppStateContext'
import { colors } from '@/theme/colors'
import { MUSCLE_LABEL } from '@/core'

interface Props {
  initial?: Split
  onSave: (split: Split) => void
  onCancel: () => void
}

/** Formulář pro vytvoření / editaci splitu. */
export function SplitForm({ initial, onSave, onCancel }: Props) {
  const { data } = useAppState()
  const exercises = allExercises(data.customExercises)

  const [name, setName] = useState(initial?.name ?? '')
  const [ids, setIds] = useState<string[]>(initial?.exerciseIds ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState('')

  function toggleExercise(ex: Exercise) {
    setIds((prev) => (prev.includes(ex.id) ? prev.filter((id) => id !== ex.id) : [...prev, ex.id]))
  }
  function move(index: number, dir: -1 | 1) {
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[index], next[j]] = [next[j], next[index]]
    setIds(next)
  }
  function handleSave() {
    if (!name.trim()) { setError('Give the split a name.'); return }
    if (ids.length === 0) { setError('Add at least one exercise.'); return }
    onSave({
      id: initial?.id ?? createId(),
      name: name.trim(),
      exerciseIds: ids,
      groupId: initial?.groupId,
      groupName: initial?.groupName,
    })
  }

  return (
    <>
      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="gap-4 pb-8"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <View>
          <Text className="text-xs font-semibold text-muted">Split name</Text>
          <TextInput
            placeholder="e.g. Push, Legs, Upper A"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={(t) => { setName(t); setError('') }}
            className="mt-1 h-12 rounded-2xl bg-panel2 px-4 text-base text-white"
          />
        </View>

        <View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-semibold text-muted">Cviky ({ids.length})</Text>
            <Pressable onPress={() => setPickerOpen(true)} hitSlop={8}>
              <Text className="text-accent text-xs font-semibold">+ Add exercise</Text>
            </Pressable>
          </View>

          {ids.length === 0 ? (
            <Card className="border-dashed">
              <Text className="text-center text-sm text-muted py-2">No exercises yet. Tap “+ Add exercise”.</Text>
            </Card>
          ) : (
            <View className="gap-1.5">
              {ids.map((id, i) => {
                const ex = exercises.find((e) => e.id === id)
                if (!ex) return null
                return (
                  <View key={id} className="flex-row items-center gap-2 rounded-2xl border border-white/10 bg-panel p-2">
                    <ExerciseImage exercise={ex} size={40} />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-white" numberOfLines={1}>{ex.name}</Text>
                      <Text className="text-xs text-muted">{MUSCLE_LABEL[ex.muscleGroup]}</Text>
                    </View>
                    <Pressable onPress={() => move(i, -1)} disabled={i === 0} className="w-8 h-8 items-center justify-center" hitSlop={4}>
                      <Text className={cn('text-base', i === 0 ? 'text-muted/30' : 'text-muted')}>↑</Text>
                    </Pressable>
                    <Pressable onPress={() => move(i, 1)} disabled={i === ids.length - 1} className="w-8 h-8 items-center justify-center" hitSlop={4}>
                      <Text className={cn('text-base', i === ids.length - 1 ? 'text-muted/30' : 'text-muted')}>↓</Text>
                    </Pressable>
                    <Pressable onPress={() => toggleExercise(ex)} className="w-8 h-8 items-center justify-center" hitSlop={4}>
                      <Text className="text-danger/80 text-base">✕</Text>
                    </Pressable>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {error ? <Text className="text-sm text-danger">{error}</Text> : null}

        <View className="flex-row gap-3 pt-2">
          <Button title="Cancel" variant="secondary" className="flex-1" onPress={onCancel} />
          <Button title="Save split" className="flex-1" onPress={handleSave} />
        </View>
      </ScrollView>

      <ExercisePicker
        visible={pickerOpen}
        exercises={exercises}
        selectedIds={ids}
        onToggle={toggleExercise}
        onClose={() => setPickerOpen(false)}
      />
    </>
  )
}
