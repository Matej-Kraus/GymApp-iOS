import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { confirm } from '@/lib/platform'
import { useAppState } from '@/state/AppStateContext'
import { countScoringSets, findExercise, localDateISO, sessionVolume } from '@/core'
import type { Exercise, SetLog, WorkoutSession } from '@/core'
import {
  Button,
  Chip,
  GUTTER,
  IconButton,
  Num,
  PageHeader,
  Row,
  Rule,
  Screen,
  Segmented,
  Title,
  cn,
  tnum,
} from '@/components/ui'
import { fmtNum, fmtSet, formatLong, formatShort, todayISO } from '@/lib/format'
import { rirLabel } from '@/features/workout/SetRow'
import { localeTag, tr } from '@/i18n'
import { entryName, exName } from '@/lib/exerciseName'

const pad = (n: number) => String(n).padStart(2, '0')

/** Zkratky dnů od pondělí podle jazyka (1. 1. 2024 bylo pondělí). */
function weekdayLabels(): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(localeTag(), { weekday: 'short' }),
  )
}

function Calendar({
  year,
  month,
  trainingDays,
  selected,
  onSelect,
  onPrev,
  onNext,
}: {
  year: number
  month: number
  trainingDays: Set<string>
  selected: string | null
  onSelect: (d: string | null) => void
  onPrev: () => void
  onNext: () => void
}) {
  const t = tr().history
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const today = todayISO()
  const cell = { width: `${100 / 7}%` as const, height: 46 }

  return (
    <View>
      <View className="flex-row items-center justify-between" style={{ marginHorizontal: -10 }}>
        <IconButton icon="chevron-back" label={t.prevMonth} onPress={onPrev} />
        <Title size="sm">
          {new Date(year, month, 1).toLocaleDateString(localeTag(), { month: 'long', year: 'numeric' })}
        </Title>
        <IconButton icon="chevron-forward" label={t.nextMonth} onPress={onNext} />
      </View>
      <View className="flex-row flex-wrap">
        {weekdayLabels().map((d) => (
          <View key={d} style={{ width: cell.width }} className="pb-1">
            <Text className="text-center text-[13px] text-faint">{d}</Text>
          </View>
        ))}
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={cell} />
          const key = `${year}-${pad(month + 1)}-${pad(day)}`
          const trained = trainingDays.has(key)
          const isSelected = selected === key
          return (
            <View key={key} style={[cell, { padding: 2 }]}>
              <Pressable
                disabled={!trained}
                onPress={() => onSelect(isSelected ? null : key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className={cn(
                  'flex-1 items-center justify-center rounded-lg',
                  isSelected ? 'bg-white' : key === today ? 'border border-line' : '',
                )}
              >
                <Text
                  className={cn(
                    'text-[16px]',
                    isSelected
                      ? 'font-semibold text-bg'
                      : trained
                        ? 'font-semibold text-white'
                        : 'text-faint',
                  )}
                  style={tnum}
                >
                  {day}
                </Text>
                {/* Den s tréninkem: proužek pod číslem. */}
                {trained && !isSelected ? (
                  <View
                    className="absolute bg-white"
                    style={{ bottom: 5, height: 3, width: 14, borderRadius: 2 }}
                  />
                ) : null}
              </Pressable>
            </View>
          )
        })}
      </View>
    </View>
  )
}

/** Jedna série v detailu: označení, výkon, RIR, případně rekord. */
function SetLine({ set, label }: { set: SetLog; label: string }) {
  const t = tr()
  return (
    <View className="flex-row items-baseline" style={{ gap: 10 }}>
      <Text className="w-5 text-[14px] text-faint" style={tnum}>
        {label}
      </Text>
      <Num className={cn('text-[20px] leading-[26px]', set.role === 'warmup' && 'text-muted')}>
        {fmtSet(set.weight, set.reps)}
      </Num>
      {set.rpe ? (
        <Text className="text-[14px] text-muted" style={tnum}>
          RIR {rirLabel(String(set.rpe))}
        </Text>
      ) : null}
      {set.isPR ? <Text className="text-[14px] font-medium text-accent">{t.history.pr}</Text> : null}
    </View>
  )
}

function SessionDetail({
  session,
  onRepeat,
  onEdit,
  onDelete,
}: {
  session: WorkoutSession
  onRepeat: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const t = tr()
  const h = t.history
  return (
    <View className="pb-2 pt-5">
      <Title size="md">{session.splitName || t.workout.freeName}</Title>
      <Text className="mt-1 text-[15px] text-muted">
        {formatLong(session.date)}
        {session.durationMinutes ? `, ${h.minutes(session.durationMinutes)}` : ''}
      </Text>
      <Text className="mt-0.5 text-[15px] text-muted" style={tnum}>
        {fmtNum(Math.round(sessionVolume(session)), 0)} {t.common.kg}, {t.count.sets(countScoringSets(session))}
      </Text>

      <View className="mt-4" style={{ gap: 14 }}>
        {session.entries.map((entry) => {
          const done = entry.sets.filter((s) => s.completed)
          if (done.length === 0) return null
          let workingNo = 0
          return (
            <View key={entry.exerciseId}>
              <Text className="mb-0.5 text-[16px] font-medium text-white">{entryName(entry)}</Text>
              {done.map((s, i) => (
                <SetLine
                  key={i}
                  set={s}
                  label={s.role === 'working' ? String(++workingNo) : t.workout.roleShort[s.role]}
                />
              ))}
            </View>
          )
        })}
      </View>

      {session.notes ? (
        <Text className="mt-4 text-[15px] leading-[21px] text-muted">{session.notes}</Text>
      ) : null}

      <View className="mt-5 flex-row" style={{ gap: 8 }}>
        <Button title={h.repeat} variant="secondary" size="sm" className="flex-1" onPress={onRepeat} />
        <Button title={h.edit} variant="secondary" size="sm" onPress={onEdit} />
        <Button title={t.common.delete} variant="danger" size="sm" onPress={onDelete} />
      </View>
    </View>
  )
}

export default function History() {
  const { data, deleteSession } = useAppState()
  const router = useRouter()
  const t = tr()
  const h = t.history
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [tab, setTab] = useState<'calendar' | 'exercise'>('calendar')
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')

  // Den tréninku v MÍSTNÍM čase — `date.slice(0, 10)` je UTC a večerní
  // trénink by spadl do špatného dne.
  const byDay = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>()
    for (const s of data.sessions) {
      const key = localDateISO(s.date)
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return map
  }, [data.sessions])
  const trainingDays = useMemo(() => new Set(byDay.keys()), [byDay])
  const monthPrefix = `${year}-${pad(month + 1)}`
  const monthSessions = useMemo(
    () =>
      data.sessions
        .filter((s) => localDateISO(s.date).startsWith(monthPrefix))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.sessions, monthPrefix],
  )
  const sessionsOnDay = selectedDate
    ? [...(byDay.get(selectedDate) ?? [])].sort((a, b) => b.date.localeCompare(a.date))
    : []

  const loggedExercises = useMemo<Exercise[]>(() => {
    const ids = new Set<string>()
    data.sessions.forEach((s) => s.entries.forEach((e) => ids.add(e.exerciseId)))
    return [...ids]
      .map((id) => findExercise(id, data.customExercises))
      .filter((e): e is Exercise => !!e)
      .sort((a, b) => exName(a).localeCompare(exName(b)))
  }, [data.sessions, data.customExercises])

  const exerciseForHistory = selectedExerciseId || loggedExercises[0]?.id || ''
  const sessionsWithExercise = useMemo(() => {
    if (!exerciseForHistory) return []
    return data.sessions
      .filter((s) => s.entries.some((e) => e.exerciseId === exerciseForHistory))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.sessions, exerciseForHistory])

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelectedDate(null)
  }

  function repeat(session: WorkoutSession) {
    router.push({ pathname: '/workout', params: { splitId: session.splitId ?? 'free' } })
  }
  async function confirmDelete(session: WorkoutSession) {
    const yes = await confirm({
      title: h.deleteTitle,
      message: formatLong(session.date),
      confirmLabel: t.common.delete,
      destructive: true,
    })
    if (!yes) return
    deleteSession(session.id)
    if (sessionsOnDay.length === 1) setSelectedDate(null)
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 40 }}>
        <View className="mt-2">
          <PageHeader
            title={h.title}
            subtitle={h.sessions(data.sessions.length)}
            action={
              <IconButton
                icon="add"
                label={h.addPast}
                onPress={() => router.push('/session-edit')}
              />
            }
          />
        </View>

        <Segmented
          className="mt-5"
          options={[
            { value: 'calendar', label: h.tabCalendar },
            { value: 'exercise', label: h.tabExercise },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'calendar' ? (
          <View className="mt-4">
            <Calendar
              year={year}
              month={month}
              trainingDays={trainingDays}
              selected={selectedDate}
              onSelect={setSelectedDate}
              onPrev={() => shiftMonth(-1)}
              onNext={() => shiftMonth(1)}
            />

            {selectedDate ? (
              sessionsOnDay.map((session) => (
                <View key={session.id}>
                  <Rule className="mt-3" />
                  <SessionDetail
                    session={session}
                    onRepeat={() => repeat(session)}
                    onEdit={() => router.push({ pathname: '/session-edit', params: { id: session.id } })}
                    onDelete={() => confirmDelete(session)}
                  />
                </View>
              ))
            ) : data.sessions.length === 0 ? (
              <Text className="py-8 text-[16px] leading-[23px] text-muted">{h.empty}</Text>
            ) : monthSessions.length === 0 ? (
              <Text className="py-8 text-[16px] text-muted">{h.emptyMonth}</Text>
            ) : (
              <View className="mt-4">
                <Rule />
                {monthSessions.map((s) => (
                  <View key={s.id}>
                    <Row onPress={() => setSelectedDate(localDateISO(s.date))}>
                      <Text className="w-24 text-[15px] text-muted">{formatShort(s.date)}</Text>
                      <Text className="flex-1 text-[16px] font-medium text-white" numberOfLines={1}>
                        {s.splitName || t.workout.freeName}
                      </Text>
                      <Num className="text-[20px]">
                        {fmtNum(Math.round(sessionVolume(s)), 0)} {t.common.kg}
                      </Num>
                    </Row>
                    <Rule />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : loggedExercises.length === 0 ? (
          <Text className="py-8 text-[16px] text-muted">{h.noExercises}</Text>
        ) : (
          <View className="mt-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -GUTTER }}
              contentContainerStyle={{ gap: 6, paddingHorizontal: GUTTER }}
            >
              {loggedExercises.map((ex) => (
                <Chip
                  key={ex.id}
                  label={exName(ex)}
                  active={ex.id === exerciseForHistory}
                  onPress={() => setSelectedExerciseId(ex.id)}
                />
              ))}
            </ScrollView>

            <View className="mt-4">
              {sessionsWithExercise.map((session) => {
                const entry = session.entries.find((e) => e.exerciseId === exerciseForHistory)!
                const done = entry.sets.filter((s) => s.completed)
                let workingNo = 0
                return (
                  <View key={session.id}>
                    <Rule />
                    <View className="flex-row py-3" style={{ gap: 12 }}>
                      <Text className="w-24 pt-1 text-[15px] text-muted">{formatShort(session.date)}</Text>
                      <View className="flex-1">
                        {done.map((s, i) => (
                          <SetLine
                            key={i}
                            set={s}
                            label={s.role === 'working' ? String(++workingNo) : t.workout.roleShort[s.role]}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                )
              })}
              <Rule />
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}
