import { useCallback, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useAppState } from '@/state/AppStateContext'
import { Button, Card, EmptyState, PageHeader, SectionTitle, cn, tnum } from '@/components/ui'
import { LoadedBar } from '@/components/LoadedBar'
import { TrainingHeatmap } from '@/components/TrainingHeatmap'
import { Onboarding } from '@/components/Onboarding'
import { formatLong, formatShort, isThisMonth, isThisWeek } from '@/lib/format'
import { loadDraft, type WorkoutDraft } from '@/lib/workoutDraft'
import { colors } from '@/theme/colors'
import {
  sessionVolume,
  countScoringSets,
  workoutStreakWeeks,
  volumeLast30Days,
  weeklySetsByMuscle,
  recommendNextSplit,
  countsTowardProgress,
  type WorkoutSession,
} from '@/core'

/** Heaviest working set of a session — what the loaded bar renders. */
function topSet(session: WorkoutSession): { name: string; weight: number; reps: number } | null {
  let best: { name: string; weight: number; reps: number } | null = null
  for (const entry of session.entries) {
    for (const set of entry.sets) {
      if (!countsTowardProgress(set)) continue
      if (!best || set.weight > best.weight) {
        best = { name: entry.exerciseName, weight: set.weight, reps: set.reps }
      }
    }
  }
  return best
}

export default function Dashboard() {
  const { data } = useAppState()
  const router = useRouter()
  const { splits, sessions } = data
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerStep, setPickerStep] = useState<string>('groups')
  const [draft, setDraft] = useState<WorkoutDraft | null>(null)

  // Check for an unfinished session every time we come back to the dashboard.
  useFocusEffect(
    useCallback(() => {
      let active = true
      loadDraft().then((d) => {
        if (active) setDraft(d)
      })
      return () => {
        active = false
      }
    }, []),
  )

  const weeklyMuscles = weeklySetsByMuscle(sessions, data.customExercises)
  const hasSplits = splits.length > 0
  const lastSession = useMemo(
    () => (sessions.length > 0 ? [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0] : null),
    [sessions],
  )
  const lastTop = lastSession ? topSet(lastSession) : null

  const weekCount = sessions.filter((s) => isThisWeek(s.date)).length
  const monthCount = sessions.filter((s) => isThisMonth(s.date)).length
  const streakWeeks = workoutStreakWeeks(sessions)
  const vol30 = Math.round(volumeLast30Days(sessions))

  const today = formatLong(new Date().toISOString())

  // Splits grouped by programme (PPL, Upper/Lower, custom…).
  type GroupEntry = { groupName: string; splits: typeof splits }
  const groupMap = new Map<string, GroupEntry>()
  for (const split of splits) {
    const key = split.groupId ?? '__custom__'
    const name = split.groupName ?? 'Custom splits'
    if (!groupMap.has(key)) groupMap.set(key, { groupName: name, splits: [] })
    groupMap.get(key)!.splits.push(split)
  }
  const groups = [...groupMap.entries()]

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

  // Staged entrance — each block lands a beat after the one above it.
  const stage = (i: number) => FadeInDown.delay(60 * i).springify().damping(20).stiffness(180)

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-6 pb-8">
        <Animated.View entering={stage(0)} className="mt-2">
          <PageHeader title="Workout" subtitle={today} />
        </Animated.View>

        {draft && draft.entries.length > 0 ? (
          <Animated.View entering={stage(1)}>
            <Pressable
              onPress={() => router.push({ pathname: '/workout', params: { resume: '1' } })}
              accessibilityLabel="Resume unfinished session"
              className="flex-row items-center gap-3 rounded-2xl border border-accent bg-accent/10 px-4 py-3.5 active:opacity-80"
            >
              <Ionicons name="play-circle" size={22} color={colors.accent} />
              <View className="flex-1">
                <Text className="font-display text-[13px] tracking-[1px] text-accent">
                  Resume session
                </Text>
                <Text className="mt-0.5 font-mono text-[11px] text-muted">
                  {draft.splitName} · {draft.entries.length} exercises in progress
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.accent} />
            </Pressable>
          </Animated.View>
        ) : null}

        {!hasSplits ? (
          <Animated.View entering={stage(2)}>
            <EmptyState
              title="Build your first split"
              description="Set up a training split — Push / Pull / Legs is a good start — and you're ready to train."
              action={<Button title="Create split" onPress={() => router.push('/splits')} />}
            />
          </Animated.View>
        ) : (
          <>
            {/* HERO — what you're lifting next, and what it looked like last time. */}
            <Animated.View entering={stage(2)}>
              <Card className="gap-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-mono text-[10px] uppercase tracking-[1.6px] text-accent">
                      {recommendedSplit ? 'Next up' : 'Ready when you are'}
                    </Text>
                    <Text className="mt-1.5 font-display text-2xl leading-7 text-white">
                      {recommendedSplit ? recommendedSplit.name : 'Pick a session'}
                    </Text>
                    {recommendedSplit ? (
                      <Text className="mt-1 font-mono text-[11px] text-muted">
                        {recommendedSplit.exerciseIds.length} exercises
                      </Text>
                    ) : null}
                  </View>
                </View>

                {lastTop ? (
                  <View className="gap-2 rounded-2xl border border-line bg-bg px-3 py-3">
                    <Text className="font-mono text-[10px] uppercase tracking-[1.2px] text-faint">
                      Last top set · {lastTop.name}
                    </Text>
                    <LoadedBar
                      weightKg={lastTop.weight}
                      barKg={data.settings.barWeightKg ?? 20}
                      smallestPlateKg={data.settings.smallestPlateKg ?? 1.25}
                      height={52}
                    />
                    <View className="mt-1 flex-row items-baseline justify-center gap-2">
                      <Text className="font-mono-semibold text-xl text-white" style={tnum}>
                        {lastTop.weight}
                      </Text>
                      <Text className="font-mono text-xs text-muted">kg</Text>
                      <Text className="font-mono text-xs text-faint">×</Text>
                      <Text className="font-mono-semibold text-xl text-white" style={tnum}>
                        {lastTop.reps}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <Button title="Start session" size="lg" onPress={openPicker} />
              </Card>
            </Animated.View>

            {/* Compact metric strip — data, not decoration. */}
            <Animated.View entering={stage(3)}>
              <SectionTitle>This week</SectionTitle>
              <View className="flex-row rounded-2xl border border-line bg-panel">
                <Metric value={weekCount} label="sessions" />
                <Divider />
                <Metric value={monthCount} label="this month" />
                <Divider />
                <Metric value={streakWeeks} label={streakWeeks === 1 ? 'week streak' : 'weeks streak'} />
                <Divider />
                <Metric value={vol30.toLocaleString('en-GB')} label="kg · 30d" />
              </View>
            </Animated.View>

            {sessions.length > 0 && weeklyMuscles.length > 0 && (
              <Animated.View entering={stage(4)}>
                <SectionTitle>Weekly sets by muscle</SectionTitle>
                <Card className="gap-2.5">
                  {weeklyMuscles.map(({ muscle, sets }) => {
                    const max = weeklyMuscles[0].sets || 1
                    return (
                      <View key={muscle} className="flex-row items-center gap-3">
                        <Text className="w-20 font-mono text-[11px] uppercase tracking-[0.5px] text-muted">
                          {muscle}
                        </Text>
                        <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
                          <View
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${Math.max(8, (sets / max) * 100)}%` }}
                          />
                        </View>
                        <Text
                          className="w-6 text-right font-mono-semibold text-sm text-white"
                          style={tnum}
                        >
                          {sets}
                        </Text>
                      </View>
                    )
                  })}
                </Card>
              </Animated.View>
            )}

            {sessions.length > 0 && (
              <Animated.View entering={stage(5)}>
                <TrainingHeatmap sessions={sessions} />
              </Animated.View>
            )}

            {lastSession && (
              <Animated.View entering={stage(6)}>
                <SectionTitle>Last session</SectionTitle>
                <Card className="gap-3">
                  <View>
                    <Text className="font-display text-base tracking-wide text-white">
                      {lastSession.splitName}
                    </Text>
                    <Text className="mt-0.5 font-mono text-[11px] text-muted">
                      {formatShort(lastSession.date)}
                    </Text>
                  </View>
                  <View className="flex-row gap-8">
                    <View>
                      <View className="flex-row items-baseline">
                        <Text className="font-mono-semibold text-lg text-white" style={tnum}>
                          {Math.round(sessionVolume(lastSession)).toLocaleString('en-GB')}
                        </Text>
                        <Text className="ml-1 font-mono text-[11px] text-muted">kg</Text>
                      </View>
                      <Text className="mt-1 font-mono text-[10px] uppercase tracking-[1.2px] text-faint">
                        Volume
                      </Text>
                    </View>
                    <View>
                      <Text className="font-mono-semibold text-lg text-white" style={tnum}>
                        {countScoringSets(lastSession)}
                      </Text>
                      <Text className="mt-1 font-mono text-[10px] uppercase tracking-[1.2px] text-faint">
                        Sets
                      </Text>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      {/* Session picker */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={closePicker}>
        <SafeAreaView className="flex-1 bg-bg/95">
          <View className="flex-1 px-4 pt-4">
            {pickerStep === 'program' ? (
              <>
                <PickerHeader title="Your programme" onClose={closePicker} />
                {programSplits.map((split) => {
                  const isRec = split.id === recommendedId
                  return (
                    <Pressable
                      key={split.id}
                      onPress={() => startWorkout(split.id)}
                      className={cn(
                        'mb-2 flex-row items-center justify-between rounded-2xl px-4 py-4 active:opacity-80',
                        isRec ? 'border border-accent bg-accent/10' : 'border border-line bg-panel',
                      )}
                    >
                      <View>
                        <Text
                          className={cn(
                            'font-display text-base tracking-wide',
                            isRec ? 'text-accent' : 'text-white',
                          )}
                        >
                          {split.name}
                        </Text>
                        <Text className="mt-0.5 font-mono text-[11px] text-muted">
                          {split.exerciseIds.length} exercises
                        </Text>
                      </View>
                      {isRec ? (
                        <Text className="font-mono text-[10px] uppercase tracking-[1.2px] text-accent">
                          Today
                        </Text>
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                      )}
                    </Pressable>
                  )
                })}
                <PickerRow
                  title="Free session"
                  subtitle="No split — add exercises as you go"
                  dashed
                  onPress={() => startWorkout('free')}
                />
                {groups.length > 1 || (groups.length === 1 && groups[0][0] !== activeProgramId) ? (
                  <Pressable onPress={() => setPickerStep('groups')} className="items-center py-3">
                    <Text className="font-mono text-[11px] uppercase tracking-[1.2px] text-muted">
                      Other splits
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : pickerStep === 'groups' ? (
              <>
                <PickerHeader title="Choose a session" onClose={closePicker} />
                <PickerRow
                  title="Free session"
                  subtitle="No split — add exercises as you go"
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
                      subtitle={`${n} ${n === 1 ? 'day' : 'days'}`}
                      chevron={!one}
                      onPress={() => (one ? startWorkout(group.splits[0].id) : setPickerStep(groupId))}
                    />
                  )
                })}
              </>
            ) : (
              <>
                <View className="mb-5 flex-row items-center gap-3">
                  <Pressable onPress={() => setPickerStep('groups')} hitSlop={12}>
                    <Ionicons name="chevron-back" size={22} color={colors.muted} />
                  </Pressable>
                  <Text className="flex-1 font-display text-lg tracking-wide text-white">
                    {groupMap.get(pickerStep)?.groupName}
                  </Text>
                  <Pressable onPress={closePicker} hitSlop={12}>
                    <Ionicons name="close" size={22} color={colors.muted} />
                  </Pressable>
                </View>
                {(groupMap.get(pickerStep)?.splits ?? []).map((split) => (
                  <PickerRow
                    key={split.id}
                    title={split.name}
                    subtitle={`${split.exerciseIds.length} exercises`}
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

function Metric({ value, label }: { value: number | string; label: string }) {
  return (
    <View className="flex-1 px-2 py-3">
      <Text className="text-center font-mono-semibold text-base text-white" style={tnum}>
        {value}
      </Text>
      <Text className="mt-1 text-center font-mono text-[9px] uppercase tracking-[1px] text-faint">
        {label}
      </Text>
    </View>
  )
}

function Divider() {
  return <View className="my-3 w-px bg-line" />
}

function PickerHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View className="mb-5 flex-row items-center justify-between">
      <Text className="font-display text-lg tracking-wide text-white">{title}</Text>
      <Pressable onPress={onClose} hitSlop={12}>
        <Ionicons name="close" size={22} color={colors.muted} />
      </Pressable>
    </View>
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
        'mb-2 flex-row items-center justify-between rounded-2xl bg-panel px-4 py-4 active:opacity-80',
        dashed ? 'border border-dashed border-line' : 'border border-line',
      )}
    >
      <View>
        <Text className="font-display text-base tracking-wide text-white">{title}</Text>
        <Text className="mt-0.5 font-mono text-[11px] text-muted">{subtitle}</Text>
      </View>
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Pressable>
  )
}
