import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components/ui'
import { RestTimer } from '@/components/RestTimer'

/**
 * Spodní lišta: odpočinek mezi sériemi a dokončení tréninku.
 *
 * Spodní odsazení bere ze safe area, ne natvrdo — home indikátor má na
 * Dynamic Islandu 34 px, na SE nulu, takže jeden odhad sedí jen na jednom
 * telefonu.
 */

export function WorkoutFooter({
  rest,
  onAdjustRest,
  onStopRest,
  onFinish,
}: {
  rest: { endsAt: number; total: number } | null
  onAdjustRest: (delta: number) => void
  onStopRest: () => void
  onFinish: () => void
}) {
  const insets = useSafeAreaInsets()

  return (
    <View
      className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-bg pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {rest ? (
        <RestTimer
          endsAt={rest.endsAt}
          totalSec={rest.total}
          onAdjust={onAdjustRest}
          onDone={onStopRest}
          onSkip={onStopRest}
        />
      ) : null}
      <View className="px-4">
        <Button title="Finish session" size="lg" onPress={onFinish} />
      </View>
    </View>
  )
}
