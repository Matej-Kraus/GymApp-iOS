import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { Exercise, Split } from '@/core'
import { createId, findExercise } from '@/core'
import { Button, Field, GUTTER, IconButton, Rule, SectionTitle } from '@/components/ui'
import { ExercisePicker } from '@/components/ExercisePicker'
import { useAppState } from '@/state/AppStateContext'
import { exName } from '@/lib/exerciseName'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'

interface Props {
  initial?: Split
  onSave: (split: Split) => void
}

/** Formulář plánu: název a cviky v pořadí, v jakém se budou cvičit. */
export function SplitForm({ initial, onSave }: Props) {
  const { data } = useAppState()
  const t = tr()
  const f = t.splitForm

  const [name, setName] = useState(initial?.name ?? '')
  const [ids, setIds] = useState<string[]>(initial?.exerciseIds ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState('')

  function toggleExercise(ex: Exercise) {
    setError('')
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
    if (!name.trim()) return setError(f.nameMissing)
    if (ids.length === 0) return setError(f.exercisesMissing)
    onSave({
      // Zbytek původního plánu (skupina, příznak ukázkových dat) zůstává.
      ...initial,
      id: initial?.id ?? createId(),
      name: name.trim(),
      exerciseIds: ids,
    })
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Field
          label={f.name}
          value={name}
          onChangeText={(v) => {
            setName(v)
            setError('')
          }}
          placeholder={f.namePlaceholder}
        />

        <View className="mt-7">
          <SectionTitle>{`${f.exercises} (${ids.length})`}</SectionTitle>
          <Rule />
          {ids.length === 0 ? (
            <Text className="py-5 text-[16px] text-muted">{f.empty}</Text>
          ) : (
            ids.map((id, i) => {
              const ex = findExercise(id, data.customExercises)
              if (!ex) return null
              return (
                <View key={id}>
                  <View className="min-h-[56px] flex-row items-center" style={{ marginRight: -10 }}>
                    <Text className="w-7 text-[15px] text-faint">{i + 1}</Text>
                    <View className="flex-1 py-2">
                      <Text className="text-[16px] font-medium text-white" numberOfLines={1}>
                        {exName(ex)}
                      </Text>
                      <Text className="mt-0.5 text-[14px] text-muted">{t.muscle[ex.muscleGroup]}</Text>
                    </View>
                    <IconButton
                      icon="chevron-up"
                      label={`${f.moveUp}: ${exName(ex)}`}
                      color={i === 0 ? colors.line : colors.muted}
                      onPress={() => move(i, -1)}
                    />
                    <IconButton
                      icon="chevron-down"
                      label={`${f.moveDown}: ${exName(ex)}`}
                      color={i === ids.length - 1 ? colors.line : colors.muted}
                      onPress={() => move(i, 1)}
                    />
                    <IconButton
                      icon="close"
                      label={`${t.common.remove}: ${exName(ex)}`}
                      onPress={() => toggleExercise(ex)}
                    />
                  </View>
                  <Rule />
                </View>
              )
            })
          )}
          <Button
            className="mt-4"
            variant="secondary"
            title={t.workout.addExercise}
            onPress={() => setPickerOpen(true)}
          />
        </View>

        {error ? <Text className="mt-4 text-[15px] text-danger">{error}</Text> : null}
        <Button className="mt-6" title={f.save} onPress={handleSave} />
      </ScrollView>

      <ExercisePicker
        visible={pickerOpen}
        selectedIds={ids}
        onToggle={toggleExercise}
        onClose={() => setPickerOpen(false)}
      />
    </>
  )
}
