import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { confirm } from '@/lib/platform'
import { useAppState } from '@/state/AppStateContext'
import { sessionVolume, countScoringSets, epley1RM, findExercise } from '@/core'
import type { WorkoutSession, Exercise } from '@/core'
import { Button, Card, PageHeader, Stat, cn } from '@/components/ui'
import { formatLong, todayISO } from '@/lib/format'

const DAYS = ['Po', 'Tue', 'St', 'Thu', 'Fri', 'So', 'Ne']
const MONTHS_CZ = ['January', 'February', 'March', 'April', 'May', 'June', 'Juneec', 'August', 'September', 'October', 'November', 'December']

function Calendar({ year, month, trainingDays, selected, onSelect, onPrev, onNext }: {
  year: number; month: number; trainingDays: Set<string>
  selected: string | null; onSelect: (d: string) => void; onPrev: () => void; onNext: () => void
}) {
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const today = todayISO()

  return (
    <Card>
      <View className="flex-row items-center justify-between mb-3">
        <Pressable onPress={onPrev} hitSlop={10}><Text className="text-muted text-xl">‹</Text></Pressable>
        <Text className="font-display text-white">{MONTHS_CZ[month]} {year}</Text>
        <Pressable onPress={onNext} hitSlop={10}><Text className="text-muted text-xl">›</Text></Pressable>
      </View>
      <View className="flex-row flex-wrap">
        {DAYS.map((d) => (
          <View key={d} style={{ width: `${100 / 7}%` }} className="py-1">
            <Text className="text-center text-[10px] font-semibold text-muted">{d}</Text>
          </View>
        ))}
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={{ width: `${100 / 7}%`, height: 44 }} />
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasWorkout = trainingDays.has(key)
          const isSelected = selected === key
          const isToday = key === today
          return (
            <View key={key} style={{ width: `${100 / 7}%`, height: 44 }} className="p-0.5">
              <Pressable
                disabled={!hasWorkout}
                onPress={() => onSelect(key)}
                className={cn(
                  'flex-1 rounded-2xl items-center justify-center',
                  isSelected ? 'bg-accent' : isToday ? 'border border-accent/40' : '',
                  hasWorkout && !isSelected ? 'bg-panel2' : '',
                )}
              >
                <Text className={cn('text-sm font-medium', isSelected ? 'text-black' : hasWorkout ? 'text-white' : 'text-muted')}>{day}</Text>
                {hasWorkout && !isSelected ? <View className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" /> : null}
              </Pressable>
            </View>
          )
        })}
      </View>
    </Card>
  )
}

function WorkoutDetail({ session, onDelete, onRepeat }: { session: WorkoutSession; onDelete: () => void; onRepeat: () => void }) {
  const vol = Math.round(sessionVolume(session))
  const sets = countScoringSets(session)
  const hasPR = session.entries.some((e) => e.sets.some((s) => s.isPR))
  return (
    <Card className="gap-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-display text-xl text-white">{session.splitName}</Text>
          <Text className="text-xs text-muted">
            {formatLong(session.date)}{session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
          </Text>
        </View>
        {hasPR ? <View className="rounded-full bg-accent/20 px-2 py-0.5"><Text className="text-xs font-bold text-accent">PR</Text></View> : null}
      </View>
      <View className="flex-row gap-6">
        <View>
          <View className="flex-row items-baseline">
            <Text className="font-display text-2xl text-white">{vol.toLocaleString('cs-CZ')}</Text>
            <Text className="ml-1 text-xs text-muted">kg</Text>
          </View>
          <Text className="text-xs text-muted">Volume</Text>
        </View>
        <View>
          <Text className="font-display text-2xl text-white">{sets}</Text>
          <Text className="text-xs text-muted">Sets</Text>
        </View>
      </View>
      {session.entries.map((entry) => (
        <View key={entry.exerciseId} className="gap-1">
          <Text className="text-sm font-semibold text-white">{entry.exerciseName}</Text>
          {entry.sets.filter((s) => s.completed).map((s, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <Text className={cn('text-xs', s.role === 'warmup' ? 'text-muted/50' : s.role === 'backoff' ? 'text-accent/70' : 'text-white')}>
                {s.role === 'warmup' ? 'W' : s.role === 'backoff' ? 'B' : `${i + 1}`}
              </Text>
              <Text className="text-xs font-bold text-white">{s.reps}×{s.weight} kg</Text>
              {s.rpe ? <Text className="text-xs text-muted">@{s.rpe}</Text> : null}
              {s.isPR ? <Text className="text-xs font-bold text-accent">PR</Text> : null}
            </View>
          ))}
        </View>
      ))}
      {session.notes ? <Text className="text-xs text-muted italic">„{session.notes}"</Text> : null}
      <View className="flex-row gap-2">
        <Button title="Repeat" variant="secondary" size="sm" className="flex-1" onPress={onRepeat} />
        <Button title="Delete" variant="danger" size="sm" onPress={onDelete} />
      </View>
    </Card>
  )
}

export default function History() {
  const { data, deleteSession } = useAppState()
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [tab, setTab] = useState<'calendar' | 'exercise'>('calendar')
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')

  const trainingDays = new Set(data.sessions.map((s) => s.date.slice(0, 10)))
  const sessionsOnDay = selectedDate
    ? data.sessions.filter((s) => s.date.slice(0, 10) === selectedDate).sort((a, b) => b.date.localeCompare(a.date))
    : []

  const loggedExercises = useMemo<Exercise[]>(() => {
    const ids = new Set<string>()
    data.sessions.forEach((s) => s.entries.forEach((e) => ids.add(e.exerciseId)))
    return [...ids]
      .map((id) => findExercise(id, data.customExercises))
      .filter((e): e is Exercise => !!e)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data.sessions, data.customExercises])

  const exerciseForHistory = selectedExerciseId || loggedExercises[0]?.id || ''
  const sessionsWithExercise = useMemo(() => {
    if (!exerciseForHistory) return []
    return data.sessions
      .filter((s) => s.entries.some((e) => e.exerciseId === exerciseForHistory))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.sessions, exerciseForHistory])

  function prevMonth() { if (month === 0) { setYear((y) => y - 1); setMonth(11) } else setMonth((m) => m - 1) }
  function nextMonth() { if (month === 11) { setYear((y) => y + 1); setMonth(0) } else setMonth((m) => m + 1) }

  function repeat(session: WorkoutSession) {
    if (session.splitId) router.push({ pathname: '/workout', params: { splitId: session.splitId } })
    else router.push({ pathname: '/workout', params: { splitId: 'free' } })
  }
  async function confirmDeleteSession(session: WorkoutSession) {
    const yes = await confirm({
      title: 'Delete session?',
      message: formatLong(session.date),
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!yes) return
    deleteSession(session.id)
    if (sessionsOnDay.length === 1) setSelectedDate(null)
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 pb-8">
        <View className="mt-2"><PageHeader title="History" subtitle={`${data.sessions.length} sessions`} /></View>

        <View className="flex-row gap-1 rounded-2xl bg-panel2 p-1">
          {(['calendar', 'exercise'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} className={cn('flex-1 rounded-xl py-2 items-center', tab === t && 'bg-accent')}>
              <Text className={cn('text-xs font-semibold', tab === t ? 'text-black' : 'text-muted')}>{t === 'calendar' ? 'Calendar' : 'Exercise'}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'calendar' ? (
          <>
            <Calendar
              year={year} month={month} trainingDays={trainingDays}
              selected={selectedDate} onSelect={setSelectedDate} onPrev={prevMonth} onNext={nextMonth}
            />
            {sessionsOnDay.map((session) => (
              <WorkoutDetail key={session.id} session={session} onDelete={() => confirmDeleteSession(session)} onRepeat={() => repeat(session)} />
            ))}
            {data.sessions.length === 0 ? (
              <Text className="text-center text-sm text-muted py-8">No sessions logged yet.</Text>
            ) : null}
          </>
        ) : loggedExercises.length === 0 ? (
          <Text className="text-center text-sm text-muted py-8">No exercises logged yet.</Text>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
              {loggedExercises.map((ex) => (
                <Pressable
                  key={ex.id}
                  onPress={() => setSelectedExerciseId(ex.id)}
                  className={cn('rounded-full px-3 py-1.5', ex.id === exerciseForHistory ? 'bg-accent' : 'bg-panel2')}
                >
                  <Text className={cn('text-xs font-semibold', ex.id === exerciseForHistory ? 'text-black' : 'text-muted')}>{ex.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {sessionsWithExercise.map((session) => {
              const entry = session.entries.find((e) => e.exerciseId === exerciseForHistory)!
              const working = entry.sets.filter((s) => s.role === 'working' && s.completed)
              const backoff = entry.sets.filter((s) => s.role === 'backoff' && s.completed)
              const warmups = entry.sets.filter((s) => s.role === 'warmup' && s.completed)
              return (
                <Card key={session.id} className="gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-display text-white">{session.splitName}</Text>
                    <Text className="text-xs text-muted">{formatLong(session.date)}</Text>
                  </View>
                  {warmups.length > 0 ? (
                    <Text className="text-xs text-muted">W: {warmups.map((s) => `${s.reps}×${s.weight}`).join(', ')} kg</Text>
                  ) : null}
                  {working.map((s, i) => (
                    <Text key={`w${i}`} className="text-xs text-muted">
                      {i + 1}: <Text className="text-white font-semibold">{s.reps}×{s.weight} kg</Text>
                      {s.rpe ? ` @${s.rpe}` : ''}{s.isPR ? '  PR' : ''}
                    </Text>
                  ))}
                  {backoff.map((s, i) => (
                    <Text key={`b${i}`} className="text-xs text-accent">B: {s.reps}×{s.weight} kg</Text>
                  ))}
                </Card>
              )
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
