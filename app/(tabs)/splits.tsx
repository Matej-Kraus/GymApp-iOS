import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { createId, SPLIT_TEMPLATES, findExercise } from '@/core'
import { useAppState } from '@/state/AppStateContext'
import { Button, Card, EmptyState, PageHeader, cn } from '@/components/ui'
import { colors } from '@/theme/colors'

export default function Splits() {
  const { data, deleteSplit, duplicateSplit, addSplit } = useAppState()
  const { splits } = data
  const router = useRouter()
  const [templatesOpen, setTemplatesOpen] = useState(false)

  function applyTemplate(tpl: (typeof SPLIT_TEMPLATES)[number]) {
    tpl.splits.forEach((s) => {
      addSplit({
        id: createId(),
        name: s.name,
        exerciseIds: s.exerciseIds,
        groupId: tpl.groupId,
        groupName: tpl.name,
      })
    })
    setTemplatesOpen(false)
  }

  function confirmDelete(id: string) {
    Alert.alert('Smazat split?', 'Tuto akci nelze vrátit.', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => deleteSplit(id) },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-6 pb-8">
        <View className="mt-2">
          <PageHeader
            title="Splity"
            subtitle="Tréninkové plány"
            action={<Button title="+ Nový" size="sm" onPress={() => router.push('/split-form')} />}
          />
        </View>

        {splits.length === 0 ? (
          <EmptyState
            title="Zatím žádné splity"
            description="Vyber si šablonu PPL / Upper-Lower / Full Body níže — vytvoří se ti splity na jeden ťuk."
            action={<Button title="Zobrazit šablony" onPress={() => setTemplatesOpen(true)} />}
          />
        ) : (
          <View className="gap-2">
            {splits.map((split) => {
              const count = split.exerciseIds.length
              const preview = split.exerciseIds
                .slice(0, 3)
                .map((id) => findExercise(id, data.customExercises)?.name ?? '?')
                .join(', ')
              return (
                <Card key={split.id} className="gap-2">
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1">
                      <Text className="font-display text-lg font-bold text-white">{split.name}</Text>
                      <Text className="text-xs text-muted" numberOfLines={1}>
                        {count} cviků · {preview}{count > 3 ? '…' : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </View>
                  <View className="flex-row gap-1.5">
                    <Pressable
                      onPress={() => router.push({ pathname: '/split-form', params: { id: split.id } })}
                      className="rounded-md border border-white/15 px-3 py-1.5"
                    >
                      <Text className="text-xs text-muted">Upravit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => duplicateSplit(split.id)}
                      className="rounded-md border border-white/15 px-3 py-1.5"
                    >
                      <Text className="text-xs text-muted">Duplikovat</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(split.id)}
                      className="rounded-md border border-danger/30 px-3 py-1.5"
                    >
                      <Text className="text-xs text-danger/80">Smazat</Text>
                    </Pressable>
                  </View>
                </Card>
              )
            })}
          </View>
        )}

        {/* Šablony */}
        <View className="gap-2">
          <Pressable
            onPress={() => setTemplatesOpen((o) => !o)}
            className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-card px-4 py-3"
          >
            <Text className="text-sm font-semibold text-white">Šablony (PPL, Upper-Lower, Full Body)</Text>
            <Text className={cn('text-muted', templatesOpen && 'rotate-180')}>▾</Text>
          </Pressable>
          {templatesOpen &&
            SPLIT_TEMPLATES.map((tpl) => (
              <Card key={tpl.name} className="gap-2">
                <Text className="font-semibold text-sm text-white">{tpl.name}</Text>
                <Text className="text-xs text-muted">
                  {tpl.splits.map((s) => `${s.name} (${s.exerciseIds.length})`).join(' · ')}
                </Text>
                <Button title="Přidat šablonu" variant="secondary" size="sm" onPress={() => applyTemplate(tpl)} />
              </Card>
            ))}
        </View>

        {/* Vlastní cviky (zatím jen vstupní bod) */}
        <Pressable
          onPress={() => router.push('/custom-exercise')}
          className="flex-row items-center gap-3 rounded-2xl border border-dashed border-white/15 px-4 py-3"
        >
          <Ionicons name="add" size={18} color={colors.muted} />
          <Text className="text-sm text-muted">Přidat vlastní cvik</Text>
        </Pressable>

        {data.customExercises.length > 0 && (
          <View className="gap-1">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide">Vlastní cviky</Text>
            {data.customExercises.map((e) => (
              <View
                key={e.id}
                className="flex-row items-center gap-2 rounded-2xl border border-white/10 bg-card px-3 py-2"
              >
                <Text className="text-sm font-semibold text-white flex-1">{e.name}</Text>
                <Text className="text-xs text-muted">{e.muscleGroup}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
