import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { Category, Exercise, MuscleGroup } from '@/core'
import { cn } from '@/components/ui'
import { ExerciseImage } from '@/components/ExerciseImage'
import { colors } from '@/theme/colors'

const CATEGORIES: Array<{ value: Category | 'All'; label: string }> = [
  { value: 'All', label: 'Vše' },
  { value: 'Push', label: 'Push' },
  { value: 'Pull', label: 'Pull' },
  { value: 'Legs', label: 'Legs' },
  { value: 'Core', label: 'Core' },
]

const MUSCLE_CZ: Record<MuscleGroup, string> = {
  Chest: 'Hrudník', Back: 'Záda', Legs: 'Nohy', Shoulders: 'Ramena', Arms: 'Paže', Core: 'Střed',
}

interface Props {
  visible: boolean
  exercises: Exercise[]
  selectedIds: string[]
  onToggle: (exercise: Exercise) => void
  onClose: () => void
}

export function ExercisePicker({ visible, exercises, selectedIds, onToggle, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | 'All'>('All')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return exercises.filter((e) => {
      if (category !== 'All' && e.category !== category) return false
      if (q && !e.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [exercises, search, category])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        {/* Záhlaví */}
        <View className="flex-row items-center gap-3 border-b border-white/10 px-4 py-3">
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-muted text-sm font-medium">← Zpět</Text>
          </Pressable>
          <Text className="flex-1 text-base font-semibold text-white">Přidat cviky</Text>
          <Text className="text-xs text-muted">{selectedIds.length} vybráno</Text>
        </View>

        {/* Vyhledávání + filtr */}
        <View className="px-4 py-3 gap-2">
          <TextInput
            placeholder="Hledat cvik…"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            className="h-11 rounded-2xl bg-panel2 px-4 text-sm text-white"
          />
          <View className="flex-row gap-1.5">
            {CATEGORIES.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => setCategory(value)}
                className={cn(
                  'rounded-full px-3 py-1',
                  category === value ? 'bg-accent' : 'bg-panel2',
                )}
              >
                <Text className={cn('text-xs font-semibold', category === value ? 'text-black' : 'text-muted')}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Seznam */}
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          contentContainerClassName="px-4 gap-1.5 pb-6"
          ListEmptyComponent={<Text className="text-center text-sm text-muted py-8">Žádný cvik nenalezen.</Text>}
          renderItem={({ item }) => {
            const selected = selectedIds.includes(item.id)
            return (
              <Pressable
                onPress={() => onToggle(item)}
                className={cn(
                  'flex-row items-center gap-3 rounded-2xl border p-3',
                  selected ? 'border-accent bg-accent/10' : 'border-white/10 bg-panel',
                )}
              >
                <ExerciseImage exercise={item} size={48} />
                <View className="flex-1">
                  <Text className="font-semibold text-sm text-white" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-xs text-muted mt-0.5">
                    {MUSCLE_CZ[item.muscleGroup]} · {item.equipment}{item.isCustom ? ' · vlastní' : ''}
                  </Text>
                </View>
                {selected ? <Text className="text-accent text-lg">✓</Text> : null}
              </Pressable>
            )
          }}
        />
      </SafeAreaView>
    </Modal>
  )
}
