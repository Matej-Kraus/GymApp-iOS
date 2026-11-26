import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function SaveErrorBanner({ onDismiss }: { onDismiss: () => void }) {
  const { top } = useSafeAreaInsets()
  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: top + 8, zIndex: 50 }}
      className="px-4"
    >
      <View className="flex-row items-center gap-3 rounded-2xl border border-danger/40 bg-card px-4 py-3">
        <Text className="text-base">⚠️</Text>
        <Text className="flex-1 text-xs text-muted">
          Ukládání se nezdařilo — poslední změny se nemusí uložit.
        </Text>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Text className="text-sm text-muted/60">✕</Text>
        </Pressable>
      </View>
    </View>
  )
}
