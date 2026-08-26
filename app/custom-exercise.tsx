import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import type { Category, Equipment, Exercise, MuscleGroup } from '@/core'
import { createId } from '@/core'
import { useAppState } from '@/state/AppStateContext'
import { Button, Card, cn } from '@/components/ui'
import { colors } from '@/theme/colors'

const MUSCLES: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
const CATEGORIES: Category[] = ['Push', 'Pull', 'Legs', 'Core']
const EQUIPMENTS: Equipment[] = ['Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable', 'Other']

const CZ: Record<MuscleGroup, string> = {
  Chest: 'Hrudník', Back: 'Záda', Legs: 'Nohy', Shoulders: 'Ramena', Arms: 'Paže', Core: 'Střed',
}

/** Mini „chip" tlačítko pro výběr z možností. */
function Chip({ label, active, onPress, flex }: { label: string; active: boolean; onPress: () => void; flex?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn('rounded-full px-3 py-1.5', flex && 'flex-1 items-center', active ? 'bg-accent' : 'bg-panel2')}
    >
      <Text className={cn('text-xs font-semibold', active ? 'text-black' : 'text-muted')}>{label}</Text>
    </Pressable>
  )
}

export default function CustomExerciseScreen() {
  const router = useRouter()
  const { addCustomExercise } = useAppState()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup>('Chest')
  const [category, setCategory] = useState<Category>('Push')
  const [equipment, setEquipment] = useState<Equipment>('Barbell')
  const [isBodyweight, setIsBodyweight] = useState(false)
  const [error, setError] = useState('')

  function handleSave() {
    if (!name.trim()) { setError('Zadej název cviku.'); return }
    const exercise: Exercise = {
      id: createId(),
      name: name.trim(),
      muscleGroup: muscle,
      category,
      equipment,
      isBodyweight: isBodyweight || equipment === 'Bodyweight',
      imageUrl: null,
      isCustom: true,
      defaultRepRange: [5, 9],
      defaultSets: 3,
    }
    addCustomExercise(exercise)
    router.back()
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-6 pb-8">
        <Text className="text-3xl font-display text-white mt-2">Vlastní cvik</Text>
        <Card className="gap-4">
          <View>
            <Text className="text-xs font-semibold text-muted">Název</Text>
            <TextInput
              value={name}
              onChangeText={(t) => { setName(t); setError('') }}
              placeholder="např. Paused Bench Press"
              placeholderTextColor={colors.muted}
              className="mt-1 h-12 rounded-2xl bg-panel2 px-4 text-base text-white"
            />
          </View>

          <View>
            <Text className="text-xs font-semibold text-muted mb-1">Svalová skupina</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {MUSCLES.map((m) => (
                <Chip key={m} label={CZ[m]} active={muscle === m} onPress={() => setMuscle(m)} />
              ))}
            </View>
          </View>

          <View>
            <Text className="text-xs font-semibold text-muted mb-1">Kategorie</Text>
            <View className="flex-row gap-1.5">
              {CATEGORIES.map((c) => (
                <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} flex />
              ))}
            </View>
          </View>

          <View>
            <Text className="text-xs font-semibold text-muted mb-1">Vybavení</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {EQUIPMENTS.map((eq) => (
                <Chip key={eq} label={eq} active={equipment === eq} onPress={() => setEquipment(eq)} />
              ))}
            </View>
          </View>

          <Pressable onPress={() => setIsBodyweight((v) => !v)} className="flex-row items-center gap-3">
            <View className={cn('h-6 w-11 rounded-full justify-center', isBodyweight ? 'bg-accent' : 'bg-panel2')}>
              <View className={cn('h-5 w-5 rounded-full bg-white', isBodyweight ? 'ml-5' : 'ml-0.5')} />
            </View>
            <Text className="text-sm text-white flex-1">Cvik s vlastní váhou (váha = přidané závaží)</Text>
          </Pressable>

          {error ? <Text className="text-sm text-danger">{error}</Text> : null}

          <View className="flex-row gap-3 pt-1">
            <Button title="Zrušit" variant="secondary" className="flex-1" onPress={() => router.back()} />
            <Button title="Přidat cvik" className="flex-1" onPress={handleSave} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
