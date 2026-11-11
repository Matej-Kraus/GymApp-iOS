import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useAppState } from '@/state/AppStateContext'
import {
  Banner,
  Button,
  EmptyState,
  GUTTER,
  IconButton,
  Num,
  Row,
  Rule,
  Screen,
  SectionTitle,
  Sheet,
  Title,
  cn,
  tnum,
} from '@/components/ui'
import { Onboarding } from '@/components/Onboarding'
import { VolumeBar } from '@/components/VolumeBar'
import { daysSince, fmtNum, fmtSet, formatLong, formatShort, isThisWeek } from '@/lib/format'
import { loadDraft, type WorkoutDraft } from '@/lib/workoutDraft'
import { exportBackup } from '@/lib/backups'
import { colors } from '@/theme/colors'
import { getLang, localeTag, tr } from '@/i18n'
import {
  countScoringSets,
  currentWeek,
  deloadSignals,
  isDeloadWeek,
  localDateISO,
  mondayOf,
  offPhoneBackupStatus,
  planDelta,
  planPreview,
  recommendNextSplit,
  sessionVolume,
  showBackupReminder,
  snoozeBackupReminder,
  weeklyVolumeReport,
  workoutStreakWeeks,
  type PlanRow,
  type Split,
  type WorkoutSession,
} from '@/core'

/** Sedm dní aktuálního týdne (Po–Ne) a jestli se v nich cvičilo. */
function weekDays(sessions: WorkoutSession[]) {
  const trained = new Set(sessions.map((s) => localDateISO(s.date)))
  const today = localDateISO()
  const [y, m, d] = mondayOf(new Date()).split('-').map(Number)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(y, m - 1, d + i)
    const iso = localDateISO(date)
    return {
      iso,
      label: date.toLocaleDateString(localeTag(), { weekday: 'short' }),
      trained: trained.has(iso),
      isToday: iso === today,
      isFuture: iso > today,
    }
  })
}

export default function Today() {
  const { data, updateSettings } = useAppState()
  const router = useRouter()
  const t = tr()
  const { splits, sessions, settings } = data
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draft, setDraft] = useState<WorkoutDraft | null>(null)

  // Rozdělaný trénink se kontroluje při každém návratu na obrazovku.
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

  // Doporučení jde spočítat ze všech splitů — aktivní program je jen zúžení.
  const programSplits = useMemo(
    () =>
      settings.activeProgramId
        ? splits.filter((s) => s.groupId === settings.activeProgramId)
        : splits,
    [splits, settings.activeProgramId],
  )
  const next = useMemo(() => {
    const id = recommendNextSplit(programSplits, sessions)
    return programSplits.find((s) => s.id === id) ?? null
  }, [programSplits, sessions])

  const plan = useMemo(
    () => (next ? planPreview(next, sessions, data.customExercises, settings) : []),
    [next, sessions, data.customExercises, settings],
  )
  const week = useMemo(() => {
    const thisWeek = sessions.filter((s) => isThisWeek(s.date))
    return {
      days: weekDays(thisWeek),
      count: thisWeek.length,
      volume: Math.round(thisWeek.reduce((sum, s) => sum + sessionVolume(s), 0)),
      streak: workoutStreakWeeks(sessions),
    }
  }, [sessions])
  const volumeRows = useMemo(
    () => weeklyVolumeReport(sessions, data.customExercises),
    [sessions, data.customExercises],
  )
  const meso = settings.mesocycle ?? null
  const deload = useMemo(
    () => deloadSignals(sessions, data.customExercises, meso),
    [sessions, data.customExercises, meso],
  )
  const lastSession = useMemo(
    () =>
      sessions.length > 0 ? [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0] : null,
    [sessions],
  )
  const nextLastDone = useMemo(() => {
    if (!next) return null
    const dates = sessions.filter((s) => s.splitId === next.id).map((s) => s.date)
    return dates.length > 0 ? dates.sort().at(-1)! : null
  }, [next, sessions])

  function startWorkout(splitIdOrFree: string) {
    setPickerOpen(false)
    router.push({ pathname: '/workout', params: { splitId: splitIdOrFree } })
  }

  const hasSplits = splits.length > 0
  const hasDraft = !!draft && draft.entries.length > 0
  const backup = offPhoneBackupStatus(data, new Date())

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 40 }}>
        <View className="flex-row items-center justify-between" style={{ marginRight: -10 }}>
          <Text className="text-[15px] text-muted">{formatLong(new Date().toISOString())}</Text>
          <IconButton
            icon="settings-outline"
            label={t.today.openSettings}
            onPress={() => router.push('/settings')}
          />
        </View>

        {!hasSplits ? (
          <EmptyState
            title={t.today.emptyTitle}
            description={t.today.emptyText}
            action={<Button title={t.today.emptyAction} onPress={() => router.push('/splits')} />}
          />
        ) : (
          <>
            {/* Co je na řadě a jedno tlačítko. Rozdělaný trénink má přednost. */}
            <View className="mt-3">
              <Title>{hasDraft ? draft.splitName || t.workout.freeName : next ? next.name : t.today.pickSession}</Title>
              <Text className="mt-2 text-[16px] text-muted">
                {hasDraft
                  ? t.today.resumeText(t.count.exercises(draft.entries.length))
                  : next
                    ? `${t.count.exercises(next.exerciseIds.length)}, ${
                        nextLastDone
                          ? t.today.lastDone(t.count.daysAgo(daysSince(nextLastDone)))
                          : t.today.neverDone
                      }`
                    : t.today.freeText}
              </Text>
              <Button
                className="mt-5"
                size="lg"
                title={hasDraft ? t.today.resumeTitle : t.today.start}
                onPress={() =>
                  hasDraft
                    ? router.push({ pathname: '/workout', params: { resume: '1' } })
                    : next
                      ? startWorkout(next.id)
                      : setPickerOpen(true)
                }
              />
              {!hasDraft && next ? (
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  accessibilityRole="button"
                  className="h-11 items-center justify-center active:opacity-60"
                >
                  <Text className="text-[15px] text-muted">{t.today.otherSession}</Text>
                </Pressable>
              ) : (
                <View className="h-6" />
              )}
            </View>

            {deload.shouldDeload ? (
              <View className="mb-3">
                <Banner
                  tone={deload.scheduled ? 'warn' : 'over'}
                  title={deload.scheduled ? t.today.deloadPlanned : t.today.deloadNeeded}
                  // Důvody skládá jádro zatím jen anglicky.
                  description={getLang() === 'en' ? deload.reasons[0] : undefined}
                />
              </View>
            ) : null}

            {showBackupReminder(data, new Date()) ? (
              <View className="mb-3">
                <Banner
                  tone="warn"
                  title={t.today.backupTitle}
                  description={
                    backup.daysAgo === null
                      ? t.today.backupNever
                      : t.today.backupOld(t.count.daysAgo(backup.daysAgo))
                  }
                  action={
                    <View className="items-end">
                      <Button
                        title={t.common.save}
                        size="sm"
                        variant="secondary"
                        onPress={async () => {
                          try {
                            await exportBackup(data)
                            updateSettings({ lastExportAt: new Date().toISOString() })
                          } catch {
                            // Share sheet selhal — připomínka zůstane, zkusí se příště.
                          }
                        }}
                      />
                      <Pressable
                        onPress={() =>
                          updateSettings({ backupReminderSnoozedUntil: snoozeBackupReminder(new Date()) })
                        }
                        accessibilityRole="button"
                        className="h-9 justify-center active:opacity-60"
                      >
                        <Text className="text-[14px] text-muted">{t.common.later}</Text>
                      </Pressable>
                    </View>
                  }
                />
              </View>
            ) : null}

            {/* Týden: sedm dní a tři čísla. */}
            <View className="mt-4">
              <SectionTitle>{t.today.week}</SectionTitle>
              <View className="flex-row" style={{ gap: 6 }}>
                {week.days.map((day) => (
                  <View key={day.iso} className="flex-1" accessibilityLabel={day.label}>
                    <View
                      style={{
                        height: 6,
                        borderRadius: 2,
                        backgroundColor: day.trained ? colors.text : colors.panel2,
                        opacity: day.isFuture ? 0.5 : 1,
                      }}
                    />
                    <Text
                      className={cn(
                        'mt-1.5 text-[13px]',
                        day.isToday ? 'font-semibold text-white' : 'text-faint',
                      )}
                    >
                      {day.label}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="mt-5 flex-row">
                <WeekStat value={String(week.count)} label={t.today.statSessions} />
                <WeekStat grow={1.5} value={fmtNum(week.volume, 0)} unit={t.common.kg} label={t.today.statVolume} />
                <WeekStat grow={1.2} value={String(week.streak)} label={t.today.statStreak} />
              </View>
            </View>

            {/* Plán na dnešek: minulý výkon a cíl z motoru progrese. */}
            {!hasDraft && plan.length > 0 ? (
              <View className="mt-9">
                <SectionTitle>{t.today.plan}</SectionTitle>
                <Rule />
                {plan.map((row) => (
                  <View key={row.exercise.id}>
                    <PlanLine row={row} />
                    <Rule />
                  </View>
                ))}
              </View>
            ) : null}

            {sessions.length > 0 ? (
              <View className="mt-9">
                <SectionTitle
                  action={
                    meso ? (
                      <Text className="text-[14px] text-muted">
                        {t.today.mesoWeek(currentWeek(meso), meso.lengthWeeks)}
                        {isDeloadWeek(meso) ? `, ${t.today.deloadTag}` : ''}
                      </Text>
                    ) : undefined
                  }
                >
                  {t.today.volume}
                </SectionTitle>
                <View style={{ gap: 9 }}>
                  {volumeRows.map((row) => (
                    <VolumeBar key={row.muscle} row={row} />
                  ))}
                </View>
                <Text className="mt-3 text-[13px] leading-[18px] text-faint">{t.today.volumeLegend}</Text>
              </View>
            ) : null}

            {lastSession ? (
              <View className="mt-9">
                <SectionTitle>{t.today.lastSession}</SectionTitle>
                <Rule />
                <Row>
                  <View className="flex-1">
                    <Text className="text-[16px] font-medium text-white">
                      {lastSession.splitName || t.workout.freeName}
                    </Text>
                    <Text className="mt-0.5 text-[14px] text-muted">{formatShort(lastSession.date)}</Text>
                  </View>
                  <View className="items-end">
                    <Num className="text-[22px] leading-[24px]">
                      {fmtNum(Math.round(sessionVolume(lastSession)), 0)} {t.common.kg}
                    </Num>
                    <Text className="mt-0.5 text-[14px] text-muted">
                      {t.count.sets(countScoringSets(lastSession))}
                    </Text>
                  </View>
                </Row>
                <Rule />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <SessionPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        splits={splits}
        recommendedId={next?.id ?? null}
        onStart={startWorkout}
      />

      <Onboarding visible={!settings.onboarded && !hasSplits} />
    </Screen>
  )
}

function WeekStat({
  value,
  unit,
  label,
  grow = 1,
}: {
  value: string
  unit?: string
  label: string
  /** Poměr šířky sloupce — objem je delší číslo než počet tréninků. */
  grow?: number
}) {
  return (
    <View style={{ flex: grow }}>
      <View className="flex-row items-baseline">
        <Num className="text-[34px] leading-[36px]">{value}</Num>
        {unit ? <Text className="ml-1 text-[15px] text-muted">{unit}</Text> : null}
      </View>
      <Text className="text-[14px] text-muted">{label}</Text>
    </View>
  )
}

/** Řádek plánu: vlevo cvik a minulý výkon, vpravo dnešní cíl a rozdíl. */
function PlanLine({ row }: { row: PlanRow }) {
  const t = tr()
  const delta = planDelta(row)
  const deltaText =
    delta === null
      ? null
      : delta.kind === 'weight'
        ? `${delta.kg > 0 ? '+' : '−'}${fmtNum(Math.abs(delta.kg), 2)} ${t.common.kg}`
        : delta.kind === 'reps'
          ? t.today.plusReps(delta.reps)
          : t.today.same
  // Oranžová jen když jde výkon nahoru — to je postup.
  const up = delta !== null && delta.kind !== 'same' && (delta.kind === 'weight' ? delta.kg > 0 : delta.reps > 0)

  return (
    <Row>
      <View className="flex-1">
        <Text className="text-[16px] font-medium text-white" numberOfLines={1}>
          {row.exercise.name}
        </Text>
        <Text className="mt-0.5 text-[14px] text-muted" style={tnum}>
          {row.last ? `${t.today.planLast} ${fmtSet(row.last.weight, row.last.reps)}` : t.today.planFirst}
        </Text>
      </View>
      {row.target ? (
        <View className="items-end">
          <Num className="text-[22px] leading-[24px]">{fmtSet(row.target.weight, row.target.reps)}</Num>
          {deltaText ? (
            <Text className={cn('mt-0.5 text-[14px]', up ? 'text-accent' : 'text-muted')} style={tnum}>
              {deltaText}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Row>
  )
}

/** Výběr tréninku: všechny plány po skupinách v jednom seznamu. */
function SessionPicker({
  visible,
  onClose,
  splits,
  recommendedId,
  onStart,
}: {
  visible: boolean
  onClose: () => void
  splits: Split[]
  recommendedId: string | null
  onStart: (splitIdOrFree: string) => void
}) {
  const t = tr()
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; splits: Split[] }>()
    for (const split of splits) {
      const key = split.groupId ?? '__custom__'
      if (!map.has(key)) map.set(key, { name: split.groupName ?? t.today.customGroup, splits: [] })
      map.get(key)!.splits.push(split)
    }
    return [...map.entries()]
  }, [splits, t])

  return (
    <Sheet visible={visible} onClose={onClose} title={t.today.pickerAll} scroll>
      {groups.map(([key, group]) => (
        <View key={key} className="mb-4">
          <Text className="pb-1.5 text-[14px] text-muted">{group.name}</Text>
          <Rule />
          {group.splits.map((split) => (
            <View key={split.id}>
              <Row onPress={() => onStart(split.id)}>
                <View className="flex-1">
                  <Text className="text-[17px] font-medium text-white">{split.name}</Text>
                  <Text className="mt-0.5 text-[14px] text-muted">
                    {t.count.exercises(split.exerciseIds.length)}
                  </Text>
                </View>
                {split.id === recommendedId ? (
                  <Text className="text-[14px] font-medium text-accent">{t.today.pickerToday}</Text>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Row>
              <Rule />
            </View>
          ))}
        </View>
      ))}
      <Rule />
      <Row onPress={() => onStart('free')}>
        <View className="flex-1">
          <Text className="text-[17px] font-medium text-white">{t.today.free}</Text>
          <Text className="mt-0.5 text-[14px] text-muted">{t.today.freeText}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Row>
      <Rule />
      <View className="h-4" />
    </Sheet>
  )
}
