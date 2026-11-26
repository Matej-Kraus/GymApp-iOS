import { useEffect, useMemo, useState } from 'react'
import { Alert, Dimensions, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LineChart } from 'react-native-gifted-charts'
import { useAppState } from '@/state/AppStateContext'
import { epley1RM, countsTowardProgress, findExercise, allExercises, createId, formatWeight, toDisplayWeight, fromDisplayWeight, kgToLb } from '@/core'
import type { WorkoutSession, Unit } from '@/core'
import { PageHeader, Card, Button, cn } from '@/components/ui'
import { formatDateCZ } from '@/lib/format'
import { colors } from '@/theme/colors'
import {
  isHealthAvailable,
  requestHealthAccess,
  readBodyMetrics,
  readRecentWorkouts,
  readWeightHistory,
  readBodyFatHistory,
} from '@/lib/health'
import type { BodyMetrics, HealthWorkout } from '@/lib/health'
import { toImportableSessions, dedupeAgainstExisting } from '@/lib/healthImport'

type HealthMetric = 'weight' | 'fat' | 'kcal' | 'duration'
type HealthRange = 7 | 30 | 90 | 180 | 0

const HEALTH_METRICS_STATIC: { key: HealthMetric; label: string; unit: string }[] = [
  { key: 'weight',   label: 'Váha',     unit: 'kg'  },
  { key: 'fat',      label: 'Tuk',      unit: '%'   },
  { key: 'kcal',     label: 'Kalorie',  unit: 'kcal'},
  { key: 'duration', label: 'Délka',    unit: 'min' },
]
function healthMetricsFor(unit: Unit): typeof HEALTH_METRICS_STATIC {
  return HEALTH_METRICS_STATIC.map((m) => (m.key === 'weight' ? { ...m, unit } : m))
}
const HEALTH_RANGES: { key: HealthRange; label: string }[] = [
  { key: 7,   label: '7D'  },
  { key: 30,  label: '30D' },
  { key: 90,  label: '90D' },
  { key: 180, label: '6M'  },
  { key: 0,   label: 'Max' },
]

type Metric = 'maxWeight' | 'e1rm' | 'volume'
const METRIC_LABELS: Record<Metric, string> = { maxWeight: 'Max váha', e1rm: 'Odh. 1RM', volume: 'Objem' }
const CHART_WIDTH = Dimensions.get('window').width - 80

function getDataPoints(sessions: WorkoutSession[], exerciseId: string, metric: Metric, unit: Unit) {
  return sessions
    .filter((s) => s.entries.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((session) => {
      const entry = session.entries.find((e) => e.exerciseId === exerciseId)!
      const scoringSets = entry.sets.filter(countsTowardProgress)
      let value = 0
      if (metric === 'maxWeight') value = Math.max(0, ...scoringSets.map((s) => s.weight))
      else if (metric === 'e1rm') value = Math.max(0, ...scoringSets.map((s) => epley1RM(s.weight, s.reps)))
      else value = scoringSets.reduce((sum, s) => sum + s.weight * s.reps, 0)
      const display = unit === 'lb' ? kgToLb(value) : value
      return { value: Math.round(display * 10) / 10, label: formatDateCZ(session.date).slice(0, 5) }
    })
}

function Chart({ data }: { data: { value: number; label: string }[] }) {
  return (
    <LineChart
      data={data}
      areaChart
      curved
      width={CHART_WIDTH}
      height={180}
      thickness={2}
      color={colors.accent}
      startFillColor={colors.accent}
      endFillColor={colors.accent}
      startOpacity={0.25}
      endOpacity={0.02}
      dataPointsColor={colors.accent}
      xAxisColor="#2a2a2e"
      yAxisColor="#2a2a2e"
      yAxisTextStyle={{ color: colors.muted, fontSize: 9 }}
      xAxisLabelTextStyle={{ color: colors.muted, fontSize: 8 }}
      rulesColor="#2a2a2e"
      noOfSections={4}
    />
  )
}

function PRList({ sessions, unit }: { sessions: WorkoutSession[]; unit: Unit }) {
  const prs = useMemo(() => {
    const map = new Map<string, { name: string; weight: number; reps: number; date: string; e1rm: number }>()
    for (const session of sessions) {
      for (const entry of session.entries) {
        for (const set of entry.sets) {
          if (!set.isPR) continue
          const e1rm = epley1RM(set.weight, set.reps)
          const existing = map.get(entry.exerciseId)
          if (!existing || e1rm > existing.e1rm) {
            map.set(entry.exerciseId, { name: entry.exerciseName, weight: set.weight, reps: set.reps, date: session.date, e1rm })
          }
        }
      }
    }
    return [...map.values()].sort((a, b) => b.e1rm - a.e1rm)
  }, [sessions])

  if (!prs.length) return <Text className="text-sm text-muted text-center py-4">Zatím žádné PR. Odtrénuj první trénink!</Text>
  return (
    <View className="gap-1.5">
      {prs.map((pr, i) => (
        <View key={i} className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-card px-3 py-2">
          <Text className="font-display text-lg font-bold text-accent w-7 text-center">{i + 1}</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-white" numberOfLines={1}>{pr.name}</Text>
            <Text className="text-xs text-muted">{formatDateCZ(pr.date)}</Text>
          </View>
          <View className="items-end">
            <Text className="font-display font-bold text-white">{pr.reps}×{formatWeight(pr.weight, unit)}</Text>
            <Text className="text-xs text-muted">1RM≈{formatWeight(pr.e1rm, unit)}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const MEASURE_FIELDS: { key: 'waist' | 'chest' | 'arms' | 'thighs'; label: string }[] = [
  { key: 'waist', label: 'Pas' },
  { key: 'chest', label: 'Hrudník' },
  { key: 'arms', label: 'Paže' },
  { key: 'thighs', label: 'Stehno' },
]

export default function Progress() {
  const { data, logBodyWeight, deleteBodyWeightEntry, addGoal, deleteGoal, logMeasurement, deleteMeasurement, addSession } = useAppState()
  const exercises = allExercises(data.customExercises)
  const unit = data.settings.unit
  const HEALTH_METRICS = healthMetricsFor(unit)

  const loggedIds = useMemo(() => {
    const ids = new Set<string>()
    data.sessions.forEach((s) => s.entries.forEach((e) => ids.add(e.exerciseId)))
    return [...ids]
  }, [data.sessions])

  const [selectedId, setSelectedId] = useState<string>(loggedIds[0] ?? '')
  const [metric, setMetric] = useState<Metric>('maxWeight')
  const selId = selectedId || loggedIds[0] || ''
  const chartData = useMemo(() => (selId ? getDataPoints(data.sessions, selId, metric, unit) : []), [data.sessions, selId, metric, unit])
  const exercise = exercises.find((e) => e.id === selId)

  const currentGoal = data.goals.find((g) => g.exerciseId === selId)
  const [goalInput, setGoalInput] = useState('')
  const [deadlineInput, setDeadlineInput] = useState('')

  const currentE1RM = useMemo(() => {
    if (!selId) return 0
    const rel = data.sessions.filter((s) => s.entries.some((e) => e.exerciseId === selId)).sort((a, b) => b.date.localeCompare(a.date))
    if (rel.length === 0) return 0
    const entry = rel[0].entries.find((e) => e.exerciseId === selId)!
    const scoringSets = entry.sets.filter(countsTowardProgress)
    if (scoringSets.length === 0) return 0
    return Math.max(...scoringSets.map((s) => Math.round(epley1RM(s.weight, s.reps))))
  }, [data.sessions, selId])

  function handleAddGoal() {
    const target = parseFloat(goalInput)
    if (!selId || isNaN(target) || target <= 0 || !exercise) return
    if (currentGoal) deleteGoal(currentGoal.id)
    addGoal({
      id: createId(),
      exerciseId: selId,
      exerciseName: exercise.name,
      targetE1RM: fromDisplayWeight(target, unit),
      deadline: deadlineInput || undefined,
      createdAt: new Date().toISOString(),
    })
    setGoalInput('')
    setDeadlineInput('')
  }

  function confirmDeleteGoal() {
    if (!currentGoal) return
    Alert.alert('Smazat cíl?', currentGoal.exerciseName, [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => deleteGoal(currentGoal.id) },
    ])
  }

  // Apple Health
  const [healthAvail, setHealthAvail] = useState<boolean | null>(null)
  const [healthConnected, setHealthConnected] = useState(false)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthMetrics, setHealthMetrics] = useState<BodyMetrics | null>(null)
  const [healthWorkouts, setHealthWorkouts] = useState<HealthWorkout[]>([])
  const [healthWeightHistory, setHealthWeightHistory] = useState<{ date: string; kg: number }[]>([])
  const [healthFatHistory, setHealthFatHistory] = useState<{ date: string; pct: number }[]>([])
  const [healthChartMetric, setHealthChartMetric] = useState<HealthMetric>('weight')
  const [healthChartRange, setHealthChartRange] = useState<HealthRange>(90)

  useEffect(() => {
    isHealthAvailable().then(setHealthAvail)
  }, [])

  async function connectHealth() {
    setHealthLoading(true)
    const ok = await requestHealthAccess()
    if (ok) {
      const [metrics, workouts, weightHistory, fatHistory] = await Promise.all([
        readBodyMetrics(),
        readRecentWorkouts(180),
        readWeightHistory(),
        readBodyFatHistory(),
      ])
      setHealthMetrics(metrics)
      setHealthWorkouts(workouts)
      setHealthWeightHistory(weightHistory)
      setHealthFatHistory(fatHistory)
      setHealthConnected(true)

      const importable = dedupeAgainstExisting(toImportableSessions(workouts), data.sessions)
      importable.forEach(addSession)
    }
    setHealthLoading(false)
  }

  const healthChartData = useMemo(() => {
    const cutoff = healthChartRange > 0
      ? new Date(Date.now() - healthChartRange * 86400000).toISOString().slice(0, 10)
      : '2000-01-01'
    const lbl = (date: string) => formatDateCZ(date + 'T12:00:00').slice(0, 5)
    switch (healthChartMetric) {
      case 'weight':
        return healthWeightHistory.filter(e => e.date >= cutoff).map(e => ({ value: toDisplayWeight(e.kg, unit), label: lbl(e.date) }))
      case 'fat':
        return healthFatHistory.filter(e => e.date >= cutoff).map(e => ({ value: e.pct, label: lbl(e.date) }))
      case 'kcal': {
        const byDay = new Map<string, number>()
        healthWorkouts.filter(w => w.date >= cutoff && w.energyKcal != null)
          .forEach(w => byDay.set(w.date, (byDay.get(w.date) ?? 0) + w.energyKcal!))
        return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, v]) => ({ value: v, label: lbl(d) }))
      }
      case 'duration': {
        const byDay = new Map<string, number>()
        healthWorkouts.filter(w => w.date >= cutoff)
          .forEach(w => byDay.set(w.date, (byDay.get(w.date) ?? 0) + w.durationMin))
        return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, v]) => ({ value: v, label: lbl(d) }))
      }
    }
  }, [healthChartMetric, healthChartRange, healthWeightHistory, healthFatHistory, healthWorkouts, unit])

  const today = new Date().toISOString().slice(0, 10)
  const todayEntry = data.bodyWeightLog.find((e) => e.date === today)
  const lastWeightEntry = data.bodyWeightLog.length > 0 ? [...data.bodyWeightLog].sort((a, b) => b.date.localeCompare(a.date))[0] : null
  const [weightInput, setWeightInput] = useState(todayEntry ? String(toDisplayWeight(todayEntry.kg, unit)) : '')
  const weightChartData = useMemo(
    () => [...data.bodyWeightLog].sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({ value: toDisplayWeight(e.kg, unit), label: formatDateCZ(e.date + 'T12:00:00').slice(0, 5) })),
    [data.bodyWeightLog, unit],
  )
  function handleSaveWeight() {
    const raw = parseFloat(weightInput)
    if (isNaN(raw)) return
    const kg = fromDisplayWeight(raw, unit)
    if (kg < 20 || kg > 300) return
    logBodyWeight({ date: today, kg })
  }
  function confirmDeleteWeight() {
    if (!lastWeightEntry) return
    Alert.alert('Smazat poslední záznam váhy?', formatWeight(lastWeightEntry.kg, unit), [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => deleteBodyWeightEntry(lastWeightEntry.date) },
    ])
  }

  // Tělesné míry (obvody v cm)
  const todayMeasure = data.measurements.find((m) => m.date === today)
  const [measureInputs, setMeasureInputs] = useState<Record<string, string>>({
    waist: todayMeasure?.waist ? String(todayMeasure.waist) : '',
    chest: todayMeasure?.chest ? String(todayMeasure.chest) : '',
    arms: todayMeasure?.arms ? String(todayMeasure.arms) : '',
    thighs: todayMeasure?.thighs ? String(todayMeasure.thighs) : '',
  })
  function handleSaveMeasure() {
    const entry: { date: string; waist?: number; chest?: number; arms?: number; thighs?: number } = { date: today }
    let any = false
    for (const { key } of MEASURE_FIELDS) {
      const v = parseFloat(measureInputs[key])
      if (!isNaN(v) && v > 0) { entry[key] = v; any = true }
    }
    if (any) logMeasurement(entry)
  }
  function measureSeries(key: 'waist' | 'chest' | 'arms' | 'thighs') {
    return [...data.measurements]
      .filter((m) => typeof m[key] === 'number')
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({ value: m[key] as number, label: formatDateCZ(m.date + 'T12:00:00').slice(0, 5) }))
  }
  const recentMeasurements = [...data.measurements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  function confirmDeleteMeasurement(date: string) {
    Alert.alert('Smazat záznam měr?', formatDateCZ(date + 'T12:00:00'), [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => deleteMeasurement(date) },
    ])
  }

  const goalPct = currentGoal ? Math.min(100, Math.round((currentE1RM / currentGoal.targetE1RM) * 100)) : 0

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-5 pb-8">
        <View className="mt-2"><PageHeader title="Progres" subtitle="Grafy a rekordy" /></View>

        {/* Tělesná váha — quick input */}
        <Card className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-white">Dnešní váha</Text>
            {lastWeightEntry && lastWeightEntry.date !== today ? (
              <Text className="text-xs text-muted">Naposledy: {formatWeight(lastWeightEntry.kg, unit)}</Text>
            ) : null}
          </View>
          <View className="flex-row gap-2 items-center">
            <TextInput
              keyboardType="decimal-pad"
              placeholder="75.5"
              placeholderTextColor={colors.muted}
              value={weightInput}
              onChangeText={setWeightInput}
              className="h-11 flex-1 rounded-2xl bg-card2 px-4 text-sm text-white"
            />
            <Text className="text-sm text-muted">{unit}</Text>
            <Button title={todayEntry ? 'Aktualizovat' : 'Uložit'} size="sm" disabled={!weightInput} onPress={handleSaveWeight} />
          </View>
        </Card>

        {/* Apple Health */}
        {healthAvail !== false && (
          <Card className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-white">Apple Health</Text>
              {healthConnected && <Text className="text-xs text-accent">Připojeno</Text>}
            </View>

            {!healthConnected ? (
              <Button
                title={healthLoading ? 'Připojuji…' : 'Propojit Apple Health'}
                size="sm"
                disabled={healthLoading}
                onPress={connectHealth}
              />
            ) : (
              <>
                {healthMetrics && (
                  <View className="flex-row gap-4">
                    {healthMetrics.weightKg != null && (
                      <View className="flex-1">
                        <Text className="font-display text-lg font-bold text-white">
                          {formatWeight(healthMetrics.weightKg, unit)}
                        </Text>
                        <Text className="text-xs text-muted">Váha (Health)</Text>
                      </View>
                    )}
                    {healthMetrics.bodyFatPct != null && (
                      <View className="flex-1">
                        <Text className="font-display text-lg font-bold text-white">
                          {healthMetrics.bodyFatPct} %
                        </Text>
                        <Text className="text-xs text-muted">Tuk</Text>
                      </View>
                    )}
                    {healthMetrics.leanMassKg != null && (
                      <View className="flex-1">
                        <Text className="font-display text-lg font-bold text-white">
                          {formatWeight(healthMetrics.leanMassKg, unit)}
                        </Text>
                        <Text className="text-xs text-muted">Sval. hmota</Text>
                      </View>
                    )}
                  </View>
                )}
                {healthMetrics?.weightKg != null && !todayEntry && (
                  <Button
                    title="Importovat váhu z Health"
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      logBodyWeight({ date: today, kg: healthMetrics!.weightKg! })
                      setWeightInput(String(healthMetrics!.weightKg))
                    }}
                  />
                )}
                {/* Health Analytics — interaktivní graf */}
                <View className="gap-2">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Analytika</Text>

                  {/* Výběr metriky */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
                    {HEALTH_METRICS.map(({ key, label }) => (
                      <Pressable
                        key={key}
                        onPress={() => setHealthChartMetric(key)}
                        className={cn('rounded-full px-3 py-1.5', healthChartMetric === key ? 'bg-accent' : 'bg-card2')}
                      >
                        <Text className={cn('text-xs font-semibold', healthChartMetric === key ? 'text-black' : 'text-muted')}>{label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  {/* Výběr rozsahu */}
                  <View className="flex-row gap-1">
                    {HEALTH_RANGES.map(({ key, label }) => (
                      <Pressable
                        key={key}
                        onPress={() => setHealthChartRange(key)}
                        className={cn('flex-1 rounded-lg py-1.5 items-center', healthChartRange === key ? 'bg-accent/20' : '')}
                      >
                        <Text className={cn('text-[11px] font-semibold', healthChartRange === key ? 'text-accent' : 'text-muted')}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Graf */}
                  {healthChartData.length >= 2 ? (
                    <View>
                      <Chart data={healthChartData} />
                      <View className="flex-row items-baseline justify-between mt-1">
                        <Text className="text-xs text-muted">
                          {HEALTH_METRICS.find(m => m.key === healthChartMetric)?.label}
                          {' — '}
                          {healthChartData.length} záznamů
                        </Text>
                        {healthChartData.length > 0 && (
                          <Text className="font-display text-sm font-bold text-accent">
                            {healthChartData[healthChartData.length - 1].value}{' '}
                            {HEALTH_METRICS.find(m => m.key === healthChartMetric)?.unit}
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <Text className="text-xs text-muted text-center py-4">
                      {healthChartData.length === 0
                        ? 'Žádná data pro vybraný rozsah — zkus Max'
                        : 'Potřebuješ aspoň 2 záznamy pro graf'}
                    </Text>
                  )}
                </View>
              </>
            )}
          </Card>
        )}

        {loggedIds.length === 0 ? (
          <Text className="text-center text-sm text-muted py-8">Zatím žádná data. Odtrénuj první trénink!</Text>
        ) : (
          <>
            {/* Výběr cviku */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
              {loggedIds.map((id) => {
                const ex = findExercise(id, data.customExercises) ?? exercises.find((e) => e.id === id)
                return (
                  <Pressable key={id} onPress={() => setSelectedId(id)} className={cn('rounded-full px-3 py-1.5', id === selId ? 'bg-accent' : 'bg-card2')}>
                    <Text className={cn('text-xs font-semibold', id === selId ? 'text-black' : 'text-muted')}>{ex?.name ?? id}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {/* Metriky */}
            <View className="flex-row gap-1 rounded-2xl bg-card2 p-1">
              {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
                <Pressable key={m} onPress={() => setMetric(m)} className={cn('flex-1 rounded-xl py-2 items-center', metric === m && 'bg-accent')}>
                  <Text className={cn('text-xs font-semibold', metric === m ? 'text-black' : 'text-muted')}>
                    {m === 'maxWeight' ? 'Váha' : m === 'e1rm' ? '1RM' : 'Objem'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Graf */}
            <Card>
              <Text className="font-display text-sm font-bold text-white">{exercise?.name ?? selId}</Text>
              <Text className="text-xs text-muted mb-2">{METRIC_LABELS[metric]} ({unit})</Text>
              {chartData.length < 2 ? (
                <Text className="text-center text-xs text-muted py-8">Potřebuješ aspoň 2 tréninky pro zobrazení trendu.</Text>
              ) : (
                <Chart data={chartData} />
              )}
            </Card>

            {/* Cíl pro cvik */}
            <View className="gap-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Cíl pro cvik</Text>
              <Card className="gap-3">
                {currentGoal ? (
                  <>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-white">
                        {currentE1RM >= currentGoal.targetE1RM
                          ? '🏆 Dosaženo!'
                          : `${toDisplayWeight(currentE1RM, unit)} / ${toDisplayWeight(currentGoal.targetE1RM, unit)} ${unit} 1RM`}
                      </Text>
                      <Text className="text-xs text-muted">{goalPct} %</Text>
                    </View>
                    <View className="h-2 w-full rounded-full bg-card2 overflow-hidden">
                      <View className="h-full rounded-full bg-accent" style={{ width: `${goalPct}%` }} />
                    </View>
                    {currentGoal.deadline ? <Text className="text-xs text-muted">Deadline: {currentGoal.deadline}</Text> : null}
                    <Button title="Smazat cíl" variant="danger" size="sm" onPress={confirmDeleteGoal} />
                  </>
                ) : (
                  <>
                    <Text className="text-xs text-muted">Nastav cílový odhadovaný 1RM pro {exercise?.name ?? 'tento cvik'}.</Text>
                    <View className="flex-row gap-2 items-center">
                      <TextInput
                        keyboardType="decimal-pad"
                        placeholder="120"
                        placeholderTextColor={colors.muted}
                        value={goalInput}
                        onChangeText={setGoalInput}
                        className="h-10 flex-1 rounded-2xl bg-card2 px-3 text-sm text-white"
                      />
                      <Text className="text-sm text-muted">{unit} 1RM</Text>
                    </View>
                    <TextInput
                      placeholder="Deadline YYYY-MM-DD (volitelné)"
                      placeholderTextColor={colors.muted}
                      value={deadlineInput}
                      onChangeText={setDeadlineInput}
                      className="h-10 rounded-2xl bg-card2 px-3 text-sm text-white"
                    />
                    <Button title="Nastavit cíl" size="sm" disabled={!goalInput} onPress={handleAddGoal} />
                  </>
                )}
              </Card>
            </View>
          </>
        )}

        {/* PR seznam */}
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Osobní rekordy</Text>
          <PRList sessions={data.sessions} unit={unit} />
        </View>

        {/* Tělesná váha — graf */}
        {data.bodyWeightLog.length >= 2 && (
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Tělesná váha</Text>
            <Card>
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <Text className="font-display text-sm font-bold text-white">{lastWeightEntry ? formatWeight(lastWeightEntry.kg, unit) : ''}</Text>
                  <Text className="text-xs text-muted">Aktuální váha</Text>
                </View>
                {lastWeightEntry ? (
                  <Pressable onPress={confirmDeleteWeight} hitSlop={6}>
                    <Text className="text-xs text-muted">Smazat poslední</Text>
                  </Pressable>
                ) : null}
              </View>
              <Chart data={weightChartData} />
            </Card>
          </View>
        )}

        {/* Tělesné míry */}
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Tělesné míry (cm)</Text>
          <Card className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              {MEASURE_FIELDS.map(({ key, label }) => (
                <View key={key} className="flex-1" style={{ minWidth: '45%' }}>
                  <Text className="text-xs text-muted mb-1">{label}</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colors.muted}
                    value={measureInputs[key]}
                    onChangeText={(t) => setMeasureInputs((p) => ({ ...p, [key]: t }))}
                    className="h-11 rounded-2xl bg-card2 px-3 text-sm text-white"
                  />
                </View>
              ))}
            </View>
            <Button title={todayMeasure ? 'Aktualizovat míry' : 'Uložit míry'} size="sm" onPress={handleSaveMeasure} />
          </Card>

          {recentMeasurements.length > 0 && (
            <View className="gap-1.5">
              {recentMeasurements.map((m) => (
                <View key={m.date} className="flex-row items-center justify-between rounded-xl bg-card2 px-3 py-2">
                  <Text className="text-xs text-white">{formatDateCZ(m.date + 'T12:00:00')}</Text>
                  <Pressable onPress={() => confirmDeleteMeasurement(m.date)} hitSlop={6}>
                    <Text className="text-xs text-danger/80">Smazat</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {MEASURE_FIELDS.map(({ key, label }) => {
            const series = measureSeries(key)
            if (series.length < 2) return null
            return (
              <Card key={key}>
                <Text className="font-display text-sm font-bold text-white mb-2">{label} — {series[series.length - 1].value} cm</Text>
                <Chart data={series} />
              </Card>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
