import { useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
  MUSCLE_REGIONS,
  allExercises,
  findExercise,
  recentExerciseIds,
  searchExercises,
  type Exercise,
  type MuscleRegion,
} from '@/core'
import { Chip, GUTTER, IconButton, Rule } from '@/components/ui'
import { useAppState } from '@/state/AppStateContext'
import { exName } from '@/lib/exerciseName'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'

/**
 * Procházení knihovny cviků: hledání, filtr podle části těla a seznam.
 * Sdílí ho výběr cviku (do tréninku, do plánu) i obrazovka knihovny.
 */

type Item =
  | { kind: 'heading'; key: string; title: string }
  | { kind: 'exercise'; key: string; exercise: Exercise }

export function ExerciseBrowser({
  selectedIds,
  onPress,
  onInfo,
}: {
  /** Vybrané cviky dostanou zatržítko. */
  selectedIds?: string[]
  onPress: (exercise: Exercise) => void
  /** Když je zadané, řádek má tlačítko s detailem cviku. */
  onInfo?: (exercise: Exercise) => void
}) {
  const { data } = useAppState()
  const t = tr()
  const x = t.exercises
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<MuscleRegion | null>(null)

  const all = useMemo(() => allExercises(data.customExercises), [data.customExercises])
  const items = useMemo<Item[]>(() => {
    const found = searchExercises(all, { query, region, altName: (e) => t.exerciseNames[e.id] })
    const rows: Item[] = []
    // Bez hledání a filtru: nejdřív to, co uživatel cvičil naposledy.
    if (!query.trim() && !region) {
      const recent = recentExerciseIds(data.sessions)
        .map((id) => findExercise(id, data.customExercises))
        .filter((e): e is Exercise => !!e)
      if (recent.length > 0) {
        rows.push({ kind: 'heading', key: 'h-recent', title: x.recent })
        recent.forEach((exercise) => rows.push({ kind: 'exercise', key: `r-${exercise.id}`, exercise }))
      }
    }
    rows.push({ kind: 'heading', key: 'h-all', title: x.results(found.length) })
    found.forEach((exercise) => rows.push({ kind: 'exercise', key: exercise.id, exercise }))
    return rows
  }, [all, query, region, data.sessions, data.customExercises, t, x])

  const selected = useMemo(() => new Set(selectedIds ?? []), [selectedIds])
  const nothing = items.length === 1 // jen nadpis s nulou

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: GUTTER }}>
        <View
          className="flex-row items-center rounded-[10px] bg-panel2"
          style={{ height: 46, paddingHorizontal: 12, gap: 8 }}
        >
          <Ionicons name="search" size={18} color={colors.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={x.search}
            placeholderTextColor={colors.faint}
            accessibilityLabel={x.search}
            autoCorrect={false}
            returnKeyType="search"
            className="h-full min-w-0 flex-1 text-[17px] text-white"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel={t.common.delete}>
              <Ionicons name="close-circle" size={18} color={colors.faint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 6, paddingHorizontal: GUTTER, paddingVertical: 10 }}
        >
          <Chip label={x.all} active={region === null} onPress={() => setRegion(null)} />
          {MUSCLE_REGIONS.map((r) => (
            <Chip key={r} label={t.region[r]} active={region === r} onPress={() => setRegion(r)} />
          ))}
        </ScrollView>
      </View>
      <Rule />

      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={18}
        windowSize={9}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 40 }}
        ListFooterComponent={
          nothing ? <Text className="py-6 text-[16px] leading-[23px] text-muted">{x.none}</Text> : null
        }
        renderItem={({ item }) =>
          item.kind === 'heading' ? (
            <Text className="pb-1.5 pt-5 text-[14px] text-muted">{item.title}</Text>
          ) : (
            <View>
              <View className="flex-row items-center" style={{ marginRight: onInfo ? -10 : 0 }}>
                <Pressable
                  onPress={() => onPress(item.exercise)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selected.has(item.exercise.id) }}
                  className="min-h-[56px] flex-1 flex-row items-center py-2 active:opacity-60"
                  style={{ gap: 10 }}
                >
                  <View className="flex-1">
                    <Text className="text-[16px] font-medium text-white" numberOfLines={1}>
                      {exName(item.exercise)}
                    </Text>
                    <Text className="mt-0.5 text-[14px] text-muted" numberOfLines={1}>
                      {t.muscle[item.exercise.muscleGroup]}, {t.equipment[item.exercise.equipment].toLowerCase()}
                      {item.exercise.isCustom ? `, ${x.custom}` : ''}
                    </Text>
                  </View>
                  {selected.has(item.exercise.id) ? (
                    <Ionicons name="checkmark" size={22} color={colors.text} accessibilityLabel={x.selected} />
                  ) : null}
                </Pressable>
                {onInfo ? (
                  <IconButton
                    icon="information-circle-outline"
                    label={`${x.info}: ${exName(item.exercise)}`}
                    onPress={() => onInfo(item.exercise)}
                  />
                ) : null}
              </View>
              <Rule />
            </View>
          )
        }
      />
    </View>
  )
}
