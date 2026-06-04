import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAppState } from '@/state/AppStateContext'
import { Button, Card, EmptyState, PageHeader, Stat, cn } from '@/components/ui'
import { TrainingHeatmap } from '@/components/TrainingHeatmap'
import { formatLongCZ, isThisMonth, isThisWeek } from '@/lib/format'
import {
  sessionVolume,
  countScoringSets,
  workoutStreakWeeks,
  volumeLast30Days,
  topMuscleGroup,
} from '@/core'

const MUSCLE_CZ: Record<string, string> = {
  Chest: 'Hrudník', Back: 'Záda', Legs: 'Nohy',
  Shoulders: 'Ramena', Arms: 'Paže', Core: 'Core',
}

export default function Dashboard() {
  const { data } = useAppState()
  const router = useRouter()
  const { splits, sessions } = data
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerStep, setPickerStep] = useState<string>('groups')

  const hasSplits = splits.length > 0
  const lastSession =
    sessions.length > 0 ? [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0] : null

  const weekCount = sessions.filter((s) => isThisWeek(s.date)).length
  const monthCount = sessions.filter((s) => isThisMonth(s.date)).length
  const streakWeeks = workoutStreakWeeks(sessions)
  const vol30 = Math.round(volumeLast30Days(sessions))
  const topMuscle = topMuscleGroup(sessions, data.customExercises)

  const todayRaw = formatLongCZ(new Date().toISOString())
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1)

  // Splity seskupené podle groupId (PPL, Upper/Lower, vlastní…).
  type GroupEntry = { groupName: string; splits: typeof splits }
  const groupMap = new Map<string, GroupEntry>()
  for (const split of splits) {
    const key = split.groupId ?? '__custom__'
    const name = split.groupName ?? 'Vlastní splity'
    if (!groupMap.has(key)) groupMap.set(key, { groupName: name, splits: [] })
    groupMap.get(key)!.splits.push(split)
  }
  const groups = [...groupMap.entries()]

  function closePicker() {
    setPickerOpen(false)
    setPickerStep('groups')
  }

  function startWorkout(splitIdOrFree: string) {
    closePicker()
    router.push({ pathname: '/workout', params: { splitId: splitIdOrFree } })
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-6 pb-8">
        <View className="mt-2">
          <PageHeader title="Workout" subtitle={today} />
        </View>

        <Button title="Spustit trénink" size="lg" disabled={!hasSplits} onPress={() => setPickerOpen(true)} />

        {!hasSplits ? (
          <EmptyState
            title="Začni prvním splitem"
            description="Vytvoř si tréninkový split (třeba Push / Pull / Legs) a můžeš začít trénovat."
            action={<Button title="Vytvořit split" onPress={() => router.push('/splits')} />}
          />
        ) : (
          <>
            <View className="flex-row gap-3">
              <Stat label="Tréninky tento týden" value={weekCount} />
              <Stat label="Tento měsíc" value={monthCount} />
            </View>

            {sessions.length > 0 && (
              <>
                <View className="flex-row gap-3">
                  <Stat
                    label="Streak"
                    value={streakWeeks}
                    unit={streakWeeks === 1 ? 'týden' : streakWeeks < 5 ? 'týdny' : 'týdnů'}
                  />
                  <Stat label="Objem 30 dní" value={vol30.toLocaleString('cs-CZ')} unit="kg" />
                </View>
                {topMuscle && (
                  <Stat label="Nejčastěji trénováno" value={MUSCLE_CZ[topMuscle] ?? topMuscle} />
                )}
                <TrainingHeatmap sessions={sessions} />
              </>
            )}

            {lastSession && (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-muted">Poslední trénink</Text>
                <Card className="gap-3">
                  <View>
                    <Text className="font-display text-lg font-bold text-white">{lastSession.splitName}</Text>
                    <Text className="text-xs text-muted">{formatLongCZ(lastSession.date)}</Text>
                  </View>
                  <View className="flex-row gap-8">
                    <View>
                      <View className="flex-row items-baseline">
                        <Text className="font-display text-xl font-bold text-white">
                          {Math.round(sessionVolume(lastSession)).toLocaleString('cs-CZ')}
                        </Text>
                        <Text className="ml-1 text-xs font-medium text-muted">kg</Text>
                      </View>
                      <Text className="mt-1 text-xs text-muted">Objem</Text>
                    </View>
                    <View>
                      <Text className="font-display text-xl font-bold text-white">{countScoringSets(lastSession)}</Text>
                      <Text className="mt-1 text-xs text-muted">Sérií</Text>
                    </View>
                  </View>
                </Card>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Výběr splitu */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={closePicker}>
        <SafeAreaView className="flex-1 bg-bg/95">
          <View className="flex-1 px-4 pt-4">
            {pickerStep === 'groups' ? (
              <>
                <View className="flex-row items-center justify-between mb-5">
                  <Text className="font-display text-xl font-bold text-white">Vyber trénink</Text>
                  <Pressable onPress={closePicker} hitSlop={12}>
                    <Text className="text-muted text-xl">✕</Text>
                  </Pressable>
                </View>
                <PickerRow
                  title="Volný trénink"
                  subtitle="Bez splitu — přidáš cviky sám"
                  dashed
                  onPress={() => startWorkout('free')}
                />
                {groups.map(([groupId, group]) => {
                  const one = group.splits.length === 1
                  const n = group.splits.length
                  return (
                    <PickerRow
                      key={groupId}
                      title={group.groupName}
                      subtitle={`${n} ${n === 1 ? 'den' : n < 5 ? 'dny' : 'dní'}`}
                      chevron={!one}
                      onPress={() => (one ? startWorkout(group.splits[0].id) : setPickerStep(groupId))}
                    />
                  )
                })}
              </>
            ) : (
              <>
                <View className="flex-row items-center gap-3 mb-5">
                  <Pressable onPress={() => setPickerStep('groups')} hitSlop={12}>
                    <Text className="text-muted text-2xl">‹</Text>
                  </Pressable>
                  <Text className="font-display text-xl font-bold text-white flex-1">
                    {groupMap.get(pickerStep)?.groupName}
                  </Text>
                  <Pressable onPress={closePicker} hitSlop={12}>
                    <Text className="text-muted text-xl">✕</Text>
                  </Pressable>
                </View>
                {(groupMap.get(pickerStep)?.splits ?? []).map((split) => (
                  <PickerRow
                    key={split.id}
                    title={split.name}
                    subtitle={`${split.exerciseIds.length} cviků`}
                    chevron
                    onPress={() => startWorkout(split.id)}
                  />
                ))}
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function PickerRow({
  title,
  subtitle,
  onPress,
  chevron,
  dashed,
}: {
  title: string
  subtitle: string
  onPress: () => void
  chevron?: boolean
  dashed?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-between rounded-2xl bg-card px-4 py-4 mb-2 active:opacity-80',
        dashed ? 'border border-dashed border-white/20' : 'border border-white/10',
      )}
    >
      <View>
        <Text className="font-display text-lg font-bold text-white">{title}</Text>
        <Text className="text-xs text-muted mt-0.5">{subtitle}</Text>
      </View>
      {chevron ? <Text className="text-muted text-lg">›</Text> : null}
    </Pressable>
  )
}
