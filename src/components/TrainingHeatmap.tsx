import { useMemo } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { WorkoutSession } from '@/core'
import { cn } from '@/components/ui'

interface Props {
  sessions: WorkoutSession[]
}

/** 52týdenní mřížka aktivity (port webové heatmapy do RN). */
export function TrainingHeatmap({ sessions }: Props) {
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    sessions.forEach((s) => {
      const day = s.date.slice(0, 10)
      map.set(day, (map.get(day) ?? 0) + 1)
    })
    return map
  }, [sessions])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 364)
  const dow = startDate.getDay()
  startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1))

  const days: (Date | null)[] = []
  const d = new Date(startDate)
  while (d <= today) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  while (days.length % 7 !== 0) days.push(null)

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const todayKey = today.toISOString().slice(0, 10)

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted">Aktivita</Text>
        <Text className="text-xs text-muted">{sessions.length} tréninků</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-0.5">
          {weeks.map((week, wi) => (
            <View key={wi} className="gap-0.5">
              {week.map((day, di) => {
                if (!day) return <View key={di} className="w-3 h-3" />
                const key = day.toISOString().slice(0, 10)
                const count = counts.get(key) ?? 0
                return (
                  <View
                    key={di}
                    className={cn(
                      'w-3 h-3 rounded-sm',
                      key === todayKey ? 'border border-accent' : '',
                      count === 0 ? 'bg-panel2' : count === 1 ? 'bg-accent/50' : 'bg-accent',
                    )}
                  />
                )
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
