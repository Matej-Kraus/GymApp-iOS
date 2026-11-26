import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { epley1RM } from '@/core'
import { Num, Rule, SectionTitle, tnum } from '@/components/ui'
import { useAppState } from '@/state/AppStateContext'
import { entryName } from '@/lib/exerciseName'
import { fmtNum, fmtSet, formatDate } from '@/lib/format'
import { tr } from '@/i18n'

/** Aktuální rekord každého cviku, od nejsilnějšího. */
export function Records() {
  const { data } = useAppState()
  const p = tr().progress

  const prs = useMemo(() => {
    const map = new Map<string, { name: string; weight: number; reps: number; date: string; e1rm: number }>()
    for (const session of data.sessions) {
      for (const entry of session.entries) {
        for (const set of entry.sets) {
          if (!set.isPR) continue
          const e1rm = epley1RM(set.weight, set.reps)
          const existing = map.get(entry.exerciseId)
          if (!existing || e1rm > existing.e1rm) {
            map.set(entry.exerciseId, {
              name: entryName(entry),
              weight: set.weight,
              reps: set.reps,
              date: session.date,
              e1rm,
            })
          }
        }
      }
    }
    return [...map.entries()].sort((a, b) => b[1].e1rm - a[1].e1rm)
  }, [data.sessions])

  return (
    <View>
      <SectionTitle>{p.records}</SectionTitle>
      <Rule />
      {prs.length === 0 ? (
        <Text className="py-5 text-[16px] leading-[23px] text-muted">{p.recordsEmpty}</Text>
      ) : (
        prs.map(([id, pr]) => (
          <View key={id}>
            <View className="min-h-[56px] flex-row items-center py-2" style={{ gap: 12 }}>
              <View className="flex-1">
                <Text className="text-[16px] font-medium text-white" numberOfLines={1}>
                  {pr.name}
                </Text>
                <Text className="mt-0.5 text-[14px] text-muted">{formatDate(pr.date)}</Text>
              </View>
              <View className="items-end">
                <Num className="text-[22px] leading-[24px]">{fmtSet(pr.weight, pr.reps)}</Num>
                <Text className="mt-0.5 text-[14px] text-muted" style={tnum}>
                  {p.e1rm(fmtNum(pr.e1rm, 0))}
                </Text>
              </View>
            </View>
            <Rule />
          </View>
        ))
      )}
    </View>
  )
}
