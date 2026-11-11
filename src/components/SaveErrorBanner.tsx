import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Banner } from '@/components/ui'
import { useAppState } from '@/state/AppStateContext'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'

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
        title={tr().errors.saveTitle}
        description={tr().errors.saveText}
        action={
          <Pressable onPress={dismissSaveError} hitSlop={12} accessibilityLabel={tr().common.close}>
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        }
      />
    </View>
  )
}
