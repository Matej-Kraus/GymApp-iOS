import { Text, View } from 'react-native'
import type { Exercise, ExerciseHistory } from '@/core'
import { Num, Rule, Sheet, tnum } from '@/components/ui'
import { fmtNum, fmtSet, formatShort } from '@/lib/format'
import { tr } from '@/i18n'
import { rirLabel } from './SetRow'

/** Sheet s osobním rekordem a posledními třemi tréninky cviku. */
export function ExerciseHistorySheet({
  exercise,
  history,
  onClose,
}: {
  exercise: Exercise | null
  history: ExerciseHistory | null
  onClose: () => void
}) {
  const t = tr()
  const w = t.workout
  return (
    <Sheet visible={exercise !== null} onClose={onClose} title={exercise?.name ?? ''} scroll>
      {history?.pr ? (
        <View className="pb-4">
          <Text className="text-[14px] text-muted">{w.historyPr}</Text>
          {/* Rekord je jedno z mála míst, kam oranžová patří. */}
          <Num className="text-[44px] leading-[48px] text-accent">
            {fmtSet(history.pr.weight, history.pr.reps)}
          </Num>
          <Text className="text-[14px] text-muted" style={tnum}>
            {w.historyE1rm(fmtNum(history.pr.e1rm, 1), formatShort(history.pr.date))}
          </Text>
        </View>
      ) : null}

      {history && history.recent.length > 0 ? (
        history.recent.map((item) => (
          <View key={item.sessionId}>
            <Rule />
            <View className="flex-row py-3" style={{ gap: 12 }}>
              <Text className="w-24 pt-0.5 text-[14px] text-muted">{formatShort(item.date)}</Text>
              <View className="flex-1" style={{ gap: 2 }}>
                {item.sets.map((s, i) => (
                  <View key={i} className="flex-row items-baseline justify-between">
                    <Num className="text-[22px] leading-[26px]">{fmtSet(s.weight, s.reps)}</Num>
                    <Text className="text-[14px] text-muted" style={tnum}>
                      {[s.role === 'backoff' ? w.role.backoff : '', s.rpe ? `RIR ${rirLabel(String(s.rpe))}` : '']
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))
      ) : (
        <Text className="py-8 text-[16px] text-muted">{w.historyEmpty}</Text>
      )}
      <View className="h-2" />
    </Sheet>
  )
}
