import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Banner } from '@/components/ui'
import { useAppState } from '@/state/AppStateContext'
import { colors } from '@/theme/colors'

/** Varování nad vším, když zápis na disk selže (typicky plné úložiště iPhonu). */
export function SaveErrorBanner() {
  const { saveError, dismissSaveError } = useAppState()
  const { top } = useSafeAreaInsets()
  if (!saveError) return null
  return (
    <View
      style={{ pointerEvents: 'box-none', position: 'absolute', top: top + 8, left: 16, right: 16, zIndex: 50 }}
    >
      <Banner
        tone="over"
        title="Couldn't save"
        description="Your phone may be out of storage. Recent changes are kept until the app closes."
        action={
          <Pressable onPress={dismissSaveError} hitSlop={12} accessibilityLabel="Dismiss">
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        }
      />
    </View>
  )
}
