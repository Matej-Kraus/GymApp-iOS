import { useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { countsTowardProgress, createId, epley1RM, findExercise } from '@/core'
import type { WorkoutSession } from '@/core'
import { Button, Chip, Field, GUTTER, Segmented, SectionTitle, tnum } from '@/components/ui'
import { AreaChart } from '@/components/charts/AreaChart'
import { useAppState } from '@/state/AppStateContext'
import { exName } from '@/lib/exerciseName'
import { fmtNum } from '@/lib/format'
import { colors } from '@/theme/colors'
import { localeTag, tr } from '@/i18n'

type Metric = 'maxWeight' | 'e1rm' | 'volume'

/** Krátké datum na osu X: „10. 11." / „10/11". */
export function axisDate(iso: string): string {
  return new Date(iso).toLocaleDateString(localeTag(), { day: 'numeric', month: 'numeric' })
}

function dataPoints(sessions: WorkoutSession[], exerciseId: string, metric: Metric) {
  return sessions
    .filter((s) => s.entries.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((session) => {
      const sets = session.entries
        .filter((e) => e.exerciseId === exerciseId)
        .flatMap((e) => e.sets.filter(countsTowardProgress))
      const value =
        metric === 'maxWeight'
          ? Math.max(0, ...sets.map((s) => s.weight))
          : metric === 'e1rm'
            ? Math.max(0, ...sets.map((s) => epley1RM(s.weight, s.reps)))
            : sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
      return { value: Math.round(value * 10) / 10, label: axisDate(session.date) }
    })
}

/** Vývoj jednoho cviku v čase a cíl pro jeho odhadované 1RM. */
export function ExerciseTrend() {
  const { data, addGoal, deleteGoal } = useAppState()
  const t = tr()
  const p = t.progress

  // Cviky od naposledy cvičeného — ten, na který se člověk nejspíš ptá, je první.
  const logged = useMemo(() => {
    const ids: string[] = []
    const seen = new Set<string>()
    for (const s of [...data.sessions].sort((a, b) => b.date.localeCompare(a.date))) {
      for (const e of s.entries) {
        if (!seen.has(e.exerciseId)) {
          seen.add(e.exerciseId)
          ids.push(e.exerciseId)
        }
      }
    }
    return ids
  }, [data.sessions])

  const [selectedId, setSelectedId] = useState('')
  const [metric, setMetric] = useState<Metric>('e1rm')
  const [goalInput, setGoalInput] = useState('')
  const [deadlineInput, setDeadlineInput] = useState('')
  const selId = logged.includes(selectedId) ? selectedId : (logged[0] ?? '')

  const chartData = useMemo(
    () => (selId ? dataPoints(data.sessions, selId, metric) : []),
    [data.sessions, selId, metric],
  )
  const currentE1RM = useMemo(() => {
    const pts = selId ? dataPoints(data.sessions, selId, 'e1rm') : []
    return pts.length > 0 ? Math.round(pts[pts.length - 1].value) : 0
  }, [data.sessions, selId])

  if (logged.length === 0) {
    return <Text className="py-6 text-[16px] leading-[23px] text-muted">{p.noData}</Text>
  }

  const nameOf = (id: string) => {
    const known = findExercise(id, data.customExercises)
    if (known) return exName(known)
    for (const s of data.sessions) {
      const entry = s.entries.find((e) => e.exerciseId === id)
      if (entry) return entry.exerciseName
    }
    return id
  }
  const goal = data.goals.find((g) => g.exerciseId === selId)
  const goalPct = goal ? Math.min(100, Math.round((currentE1RM / goal.targetE1RM) * 100)) : 0

  function handleAddGoal() {
    const target = parseFloat(goalInput.replace(',', '.'))
    if (!selId || isNaN(target) || target <= 0) return
    if (goal) deleteGoal(goal.id)
    addGoal({
      id: createId(),
      exerciseId: selId,
      exerciseName: nameOf(selId),
      targetE1RM: target,
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadlineInput) ? deadlineInput : undefined,
      createdAt: new Date().toISOString(),
    })
    setGoalInput('')
    setDeadlineInput('')
  }

  return (
    <View>
      <SectionTitle>{p.trend}</SectionTitle>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -GUTTER }}
        contentContainerStyle={{ gap: 6, paddingHorizontal: GUTTER }}
      >
        {logged.map((id) => (
          <Chip key={id} label={nameOf(id)} active={id === selId} onPress={() => setSelectedId(id)} />
        ))}
      </ScrollView>

      <Segmented<Metric>
        className="mt-3"
        options={(['e1rm', 'maxWeight', 'volume'] as const).map((m) => ({ value: m, label: p.metric[m] }))}
        value={metric}
        onChange={setMetric}
      />
      <Text className="mb-2 mt-2 text-[14px] text-muted">{p.metricHint[metric]}</Text>
      <AreaChart data={chartData} unit={t.common.kg} height={190} color={colors.accent} />

      <View className="mt-5">
        <Text className="mb-2 text-[15px] font-semibold text-white">{p.goal}</Text>
        {goal ? (
          <View>
            <Text className="text-[15px] text-white" style={tnum}>
              {currentE1RM >= goal.targetE1RM
                ? p.goalReached
                : p.goalProgress(fmtNum(currentE1RM, 0), fmtNum(goal.targetE1RM, 1))}
            </Text>
            <View className="mt-2 bg-panel2" style={{ height: 8, borderRadius: 2 }}>
              <View style={{ height: 8, borderRadius: 2, width: `${goalPct}%`, backgroundColor: colors.accent }} />
            </View>
            {goal.deadline ? (
              <Text className="mt-2 text-[14px] text-muted">{p.goalDeadline(goal.deadline)}</Text>
            ) : null}
            <Button className="mt-3" title={p.goalRemove} variant="secondary" size="sm" onPress={() => deleteGoal(goal.id)} />
          </View>
        ) : (
          <View>
            <Text className="mb-2 text-[14px] text-muted">{p.goalHint(nameOf(selId))}</Text>
            <Field
              label={p.goalTarget}
              keyboardType="decimal-pad"
              value={goalInput}
              onChangeText={setGoalInput}
            />
            <Field
              className="mt-3"
              label={p.goalDate}
              value={deadlineInput}
              onChangeText={setDeadlineInput}
              autoCorrect={false}
            />
            <Button className="mt-3" title={p.goalSet} variant="secondary" size="sm" disabled={!goalInput} onPress={handleAddGoal} />
          </View>
        )}
      </View>
    </View>
  )
}
