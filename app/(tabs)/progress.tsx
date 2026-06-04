import { useMemo, useState } from 'react'
import { Dimensions, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LineChart } from 'react-native-gifted-charts'
import { useAppState } from '@/state/AppStateContext'
import { epley1RM, countsTowardProgress, findExercise, allExercises, createId } from '@/core'
import type { WorkoutSession } from '@/core'
import { PageHeader, Card, Button, cn } from '@/components/ui'
import { formatDateCZ } from '@/lib/format'
import { colors } from '@/theme/colors'

type Metric = 'maxWeight' | 'e1rm' | 'volume'
const METRIC_LABELS: Record<Metric, string> = { maxWeight: 'Max váha (kg)', e1rm: 'Odh. 1RM (kg)', volume: 'Objem (kg)' }
const CHART_WIDTH = Dimensions.get('window').width - 80

function getDataPoints(sessions: WorkoutSession[], exerciseId: string, metric: Metric) {
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
      return { value: Math.round(value * 10) / 10, label: formatDateCZ(session.date).slice(0, 5) }
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

function PRList({ sessions }: { sessions: WorkoutSession[] }) {
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
            <Text className="font-display font-bold text-white">{pr.reps}×{pr.weight} kg</Text>
            <Text className="text-xs text-muted">1RM≈{Math.round(pr.e1rm)} kg</Text>
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
  const { data, logBodyWeight, deleteBodyWeightEntry, addGoal, deleteGoal, logMeasurement } = useAppState()
  const exercises = allExercises(data.customExercises)

  const loggedIds = useMemo(() => {
    const ids = new Set<string>()
    data.sessions.forEach((s) => s.entries.forEach((e) => ids.add(e.exerciseId)))
    return [...ids]
  }, [data.sessions])

  const [selectedId, setSelectedId] = useState<string>(loggedIds[0] ?? '')
  const [metric, setMetric] = useState<Metric>('maxWeight')
  const selId = selectedId || loggedIds[0] || ''
  const chartData = useMemo(() => (selId ? getDataPoints(data.sessions, selId, metric) : []), [data.sessions, selId, metric])
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
      targetE1RM: target,
      deadline: deadlineInput || undefined,
      createdAt: new Date().toISOString(),
    })
    setGoalInput('')
    setDeadlineInput('')
  }

  const today = new Date().toISOString().slice(0, 10)
  const todayEntry = data.bodyWeightLog.find((e) => e.date === today)
  const lastWeightEntry = data.bodyWeightLog.length > 0 ? [...data.bodyWeightLog].sort((a, b) => b.date.localeCompare(a.date))[0] : null
  const [weightInput, setWeightInput] = useState(todayEntry ? String(todayEntry.kg) : '')
  const weightChartData = useMemo(
    () => [...data.bodyWeightLog].sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({ value: e.kg, label: formatDateCZ(e.date + 'T12:00:00').slice(0, 5) })),
    [data.bodyWeightLog],
  )
  function handleSaveWeight() {
    const kg = parseFloat(weightInput)
    if (isNaN(kg) || kg < 20 || kg > 300) return
    logBodyWeight({ date: today, kg })
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
              <Text className="text-xs text-muted">Naposledy: {lastWeightEntry.kg} kg</Text>
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
            <Text className="text-sm text-muted">kg</Text>
            <Button title={todayEntry ? 'Aktualizovat' : 'Uložit'} size="sm" disabled={!weightInput} onPress={handleSaveWeight} />
          </View>
        </Card>

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
              <Text className="text-xs text-muted mb-2">{METRIC_LABELS[metric]}</Text>
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
                        {currentE1RM >= currentGoal.targetE1RM ? '🏆 Dosaženo!' : `${currentE1RM} / ${currentGoal.targetE1RM} kg 1RM`}
                      </Text>
                      <Text className="text-xs text-muted">{goalPct} %</Text>
                    </View>
                    <View className="h-2 w-full rounded-full bg-card2 overflow-hidden">
                      <View className="h-full rounded-full bg-accent" style={{ width: `${goalPct}%` }} />
                    </View>
                    {currentGoal.deadline ? <Text className="text-xs text-muted">Deadline: {currentGoal.deadline}</Text> : null}
                    <Button title="Smazat cíl" variant="danger" size="sm" onPress={() => deleteGoal(currentGoal.id)} />
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
                      <Text className="text-sm text-muted">kg 1RM</Text>
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
          <PRList sessions={data.sessions} />
        </View>

        {/* Tělesná váha — graf */}
        {data.bodyWeightLog.length >= 2 && (
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Tělesná váha</Text>
            <Card>
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <Text className="font-display text-sm font-bold text-white">{lastWeightEntry?.kg} kg</Text>
                  <Text className="text-xs text-muted">Aktuální váha</Text>
                </View>
                {lastWeightEntry ? (
                  <Pressable onPress={() => deleteBodyWeightEntry(lastWeightEntry.date)} hitSlop={6}>
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
