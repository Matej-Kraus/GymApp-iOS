import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { Exercise, ExerciseHistory } from '@/core'
import { formatShort } from '@/lib/format'
import { phoneWidth } from '@/theme/layout'
import { rirLabel } from './SetRow'

/** Panel s posledními třemi tréninky cviku a osobním rekordem. */
export function ExerciseHistorySheet({
  exercise,
  history,
  onClose,
}: {
  exercise: Exercise | null
  history: ExerciseHistory | null
  onClose: () => void
}) {
  return (
    <Modal visible={exercise !== null} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg/95" style={phoneWidth}>
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
          <Text className="flex-1 font-display text-xl text-white" numberOfLines={1}>
            {exercise?.name}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Text className="text-muted text-xl">✕</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 pb-10">
          {history?.pr ? (
            <View className="rounded-3xl bg-panel border border-white/[0.06] p-4">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Personal record
              </Text>
              <Text
                className="mt-1 font-display text-3xl text-accent"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {history.pr.reps}×{history.pr.weight} kg
              </Text>
              <Text className="text-xs text-muted">
                est. 1RM {Math.round(history.pr.e1rm * 10) / 10} kg · {formatShort(history.pr.date)}
              </Text>
            </View>
          ) : null}

          {history && history.recent.length > 0 ? (
            history.recent.map((item) => (
              <View
                key={item.sessionId}
                className="rounded-3xl bg-panel border border-white/[0.06] p-4 gap-1.5"
              >
                <Text className="text-xs font-semibold text-muted">{formatShort(item.date)}</Text>
                {item.sets.map((s, i) => (
                  <View key={i} className="flex-row items-center justify-between">
                    <Text
                      className="text-base text-white"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {s.reps}×{s.weight} kg
                    </Text>
                    <Text className="text-xs text-muted">
                      {s.role === 'backoff' ? 'back-off' : ''}
                      {s.rpe ? `${s.role === 'backoff' ? ' · ' : ''}RIR ${rirLabel(String(s.rpe))}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <Text className="py-10 text-center text-sm text-muted">
              No finished sets for this exercise yet.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
