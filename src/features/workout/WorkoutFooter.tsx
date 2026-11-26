import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, GUTTER } from '@/components/ui'
import { RestTimer } from '@/components/RestTimer'
import { tr } from '@/i18n'

/**
 * Spodní lišta: odpočet pauzy a dokončení tréninku.
 *
 * Dokončit je oranžové až ve chvíli, kdy jsou všechny série hotové — do té
 * doby je hlavní akcí odškrtnutí série, ne konec tréninku.
 *
 * Spodní odsazení bere ze safe area, ne natvrdo — home indikátor má jinou
 * výšku na každém telefonu.
 */
export function WorkoutFooter({
  rest,
  allDone,
  onAdjustRest,
  onStopRest,
  onFinish,
}: {
  rest: { endsAt: number; total: number } | null
  allDone: boolean
  onAdjustRest: (delta: number) => void
  onStopRest: () => void
  onFinish: () => void
}) {
  const insets = useSafeAreaInsets()

  return (
    <View
      className="absolute inset-x-0 bottom-0 border-t border-line bg-bg"
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
      <View style={{ paddingHorizontal: GUTTER, paddingTop: rest ? 4 : 10 }}>
        <Button
          title={tr().workout.finish}
          variant={allDone ? 'primary' : 'secondary'}
          onPress={onFinish}
        />
      </View>
    </View>
  )
}
