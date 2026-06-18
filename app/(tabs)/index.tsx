import { useCallback, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect, useRouter } from 'expo-router'
import { useAppState } from '@/state/AppStateContext'
import { Button, Card, EmptyState, PageHeader, Stat, cn } from '@/components/ui'
import { TrainingHeatmap } from '@/components/TrainingHeatmap'
import { Onboarding } from '@/components/Onboarding'
import { formatLongCZ, isThisMonth, isThisWeek } from '@/lib/format'
import { loadDraft, type WorkoutDraft } from '@/lib/workoutDraft'
import {
  sessionVolume,
  countScoringSets,
  workoutStreakWeeks,
  volumeLast30Days,
  topMuscleGroup,
  weeklySetsByMuscle,
  recommendNextSplit,
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
  const [draft, setDraft] = useState<WorkoutDraft | null>(null)

  // Po každém návratu na plochu zkontroluj rozdělaný trénink.
  useFocusEffect(
    useCallback(() => {
      let active = true
      loadDraft().then((d) => { if (active) setDraft(d) })
      return () => { active = false }
    }, []),
  )

  const weeklyMuscles = weeklySetsByMuscle(sessions, data.customExercises)
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

  // Aktivní program a doporučený další trénink (rotace).
  const activeProgramId = data.settings.activeProgramId
  const programSplits = activeProgramId ? splits.filter((s) => s.groupId === activeProgramId) : []
  const recommendedId = recommendNextSplit(programSplits, sessions)
  const recommendedSplit = programSplits.find((s) => s.id === recommendedId) ?? null

  function openPicker() {
    setPickerStep(programSplits.length > 0 ? 'program' : 'groups')
    setPickerOpen(true)
  }
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

        {draft && draft.entries.length > 0 ? (
          <Animated.View entering={FadeInDown.springify().damping(18)}>
            <Pressable
              onPress={() => router.push({ pathname: '/workout', params: { resume: '1' } })}
              accessibilityLabel="Pokračovat v rozdělaném tréninku"
              className="flex-row items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 active:opacity-80"
            >
              <Text className="text-xl">⏳</Text>
              <View className="flex-1">
                <Text className="text-sm font-bold text-accent">Pokračovat v tréninku</Text>
                <Text className="text-xs text-muted">{draft.splitName} · {draft.entries.length} cviků rozdělaných</Text>
              </View>
              <Text className="text-accent text-lg">›</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        <View className="gap-1.5">
          <Button title="Spustit trénink" size="lg" disabled={!hasSplits} onPress={openPicker} />
          {recommendedSplit ? (
            <Text className="text-center text-xs text-accent">🎯 Dnes doporučeno: {recommendedSplit.name}</Text>
          ) : null}
        </View>

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

                {weeklyMuscles.length > 0 && (
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-muted">Sérií na partii (7 dní)</Text>
                    <Card className="gap-2.5">
                      {weeklyMuscles.map(({ muscle, sets }) => {
                        const max = weeklyMuscles[0].sets || 1
                        return (
                          <View key={muscle} className="flex-row items-center gap-3">
                            <Text className="w-16 text-xs text-muted">{MUSCLE_CZ[muscle] ?? muscle}</Text>
                            <View className="flex-1 h-2 rounded-full bg-card2 overflow-hidden">
                              <View className="h-full rounded-full bg-accent" style={{ width: `${Math.max(8, (sets / max) * 100)}%` }} />
                            </View>
                            <Text className="w-6 text-right font-display text-sm text-white" style={{ fontVariant: ['tabular-nums'] }}>{sets}</Text>
                          </View>
                        )
                      })}
                    </Card>
                  </View>
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
            {pickerStep === 'program' ? (
              <>
                <View className="flex-row items-center justify-between mb-5">
                  <Text className="font-display text-xl font-bold text-white">Tvůj program</Text>
                  <Pressable onPress={closePicker} hitSlop={12}>
                    <Text className="text-muted text-xl">✕</Text>
                  </Pressable>
                </View>
                {programSplits.map((split) => {
                  const isRec = split.id === recommendedId
                  return (
                    <Pressable
                      key={split.id}
                      onPress={() => startWorkout(split.id)}
                      className={cn(
                        'flex-row items-center justify-between rounded-2xl px-4 py-4 mb-2 active:opacity-80',
                        isRec ? 'bg-accent/15 border border-accent/50' : 'bg-card border border-white/10',
                      )}
                    >
                      <View>
                        <Text className={cn('font-display text-lg font-bold', isRec ? 'text-accent' : 'text-white')}>{split.name}</Text>
                        <Text className="text-xs text-muted mt-0.5">{split.exerciseIds.length} cviků</Text>
                      </View>
                      {isRec ? <Text className="text-xs font-bold text-accent">🎯 Dnes</Text> : <Text className="text-muted text-lg">›</Text>}
                    </Pressable>
                  )
                })}
                <PickerRow title="Volný trénink" subtitle="Bez splitu — přidáš cviky sám" dashed onPress={() => startWorkout('free')} />
                {groups.length > 1 || (groups.length === 1 && groups[0][0] !== activeProgramId) ? (
                  <Pressable onPress={() => setPickerStep('groups')} className="py-3 items-center">
                    <Text className="text-sm text-muted">Jiný split…</Text>
                  </Pressable>
                ) : null}
              </>
            ) : pickerStep === 'groups' ? (
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

      <Onboarding visible={!data.settings.onboarded && !hasSplits} />
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
