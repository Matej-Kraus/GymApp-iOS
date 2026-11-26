import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import type { Equipment, Exercise, MuscleGroup } from '@/core'
import { categoryOfMuscle, createId, MUSCLE_GROUPS } from '@/core'
import { useAppState } from '@/state/AppStateContext'
import { Button, Chip, Field, GUTTER, IconButton, Rule, Screen, Title, Toggle } from '@/components/ui'
import { confirm } from '@/lib/platform'
import { tr } from '@/i18n'

const EQUIPMENTS: Equipment[] = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Other']

/** Vlastní cvik: nový, nebo úprava existujícího (`?id=`). */
export default function CustomExerciseScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { data, addCustomExercise, updateCustomExercise, deleteCustomExercise } = useAppState()
  const t = tr()
  const x = t.exercises
  const editing = id ? data.customExercises.find((e) => e.id === id) : undefined

  const [name, setName] = useState(editing?.name ?? '')
  const [muscle, setMuscle] = useState<MuscleGroup>(editing?.muscleGroup ?? 'Chest')
  const [secondary, setSecondary] = useState<MuscleGroup[]>(editing?.secondaryMuscles ?? [])
  const [equipment, setEquipment] = useState<Equipment>(editing?.equipment ?? 'Barbell')
  const [isBodyweight, setIsBodyweight] = useState(editing?.isBodyweight ?? false)
  const [error, setError] = useState('')

  function handleSave() {
    if (!name.trim()) return setError(x.nameMissing)
    const exercise: Exercise = {
      id: editing?.id ?? createId(),
      name: name.trim(),
      muscleGroup: muscle,
      // Hlavní sval nesmí být zároveň vedlejší — počítal by se 1,5×.
      secondaryMuscles: secondary.filter((m) => m !== muscle),
      // Kategorie plyne ze svalu; ptát se na ni zvlášť nemá smysl.
      category: categoryOfMuscle(muscle),
      equipment,
      isBodyweight: isBodyweight || equipment === 'Bodyweight',
      imageUrl: null,
      isCustom: true,
      defaultRepRange: editing?.defaultRepRange ?? [5, 9],
      defaultSets: editing?.defaultSets ?? 3,
    }
    if (editing) updateCustomExercise(exercise)
    else addCustomExercise(exercise)
    router.back()
  }

  async function handleDelete() {
    if (!editing) return
    const yes = await confirm({
      title: x.deleteTitle,
      message: x.deleteText,
      confirmLabel: t.common.delete,
      destructive: true,
    })
    if (!yes) return
    deleteCustomExercise(editing.id)
    router.back()
  }

  return (
    <Screen>
      <View className="flex-row items-center" style={{ paddingLeft: 6, paddingRight: GUTTER, height: 52 }}>
        <IconButton icon="close" label={t.common.close} onPress={() => router.back()} />
        <Title size="sm" className="ml-1 flex-1">
          {editing ? x.editTitle : x.newTitle}
        </Title>
        <Button title={editing ? t.common.save : x.add} size="sm" onPress={handleSave} />
      </View>
      <Rule />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Field
          label={x.name}
          value={name}
          onChangeText={(v) => {
            setName(v)
            setError('')
          }}
          placeholder={x.namePlaceholder}
        />
        {error ? <Text className="mt-2 text-[15px] text-danger">{error}</Text> : null}

        <Text className="mb-2 mt-6 text-[15px] font-semibold text-white">{x.main}</Text>
        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {MUSCLE_GROUPS.map((m) => (
            <Chip key={m} label={t.muscle[m]} active={muscle === m} onPress={() => setMuscle(m)} />
          ))}
        </View>

        <Text className="mt-6 text-[15px] font-semibold text-white">{x.alsoWorks}</Text>
        <Text className="mb-2 mt-0.5 text-[14px] text-muted">{x.alsoWorksHint}</Text>
        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {MUSCLE_GROUPS.filter((m) => m !== muscle).map((m) => (
            <Chip
              key={m}
              label={t.muscle[m]}
              active={secondary.includes(m)}
              onPress={() =>
                setSecondary((prev) => (prev.includes(m) ? prev.filter((v) => v !== m) : [...prev, m]))
              }
            />
          ))}
        </View>

        <Text className="mb-2 mt-6 text-[15px] font-semibold text-white">{x.gear}</Text>
        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {EQUIPMENTS.map((eq) => (
            <Chip key={eq} label={t.equipment[eq]} active={equipment === eq} onPress={() => setEquipment(eq)} />
          ))}
        </View>

        <Pressable
          onPress={() => setIsBodyweight((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: isBodyweight }}
          className="mt-6 flex-row items-center"
          style={{ gap: 12 }}
        >
          <View className="flex-1">
            <Text className="text-[16px] text-white">{x.bodyweight}</Text>
            <Text className="mt-0.5 text-[14px] text-muted">{x.bodyweightHint}</Text>
          </View>
          <Toggle value={isBodyweight} onChange={setIsBodyweight} />
        </Pressable>

        {editing ? (
          <Button className="mt-10" variant="danger" title={t.common.delete} onPress={handleDelete} />
        ) : null}
      </ScrollView>
    </Screen>
  )
}
