import { Modal, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAppState } from '@/state/AppStateContext'
import { Button, GUTTER, Rule, Title } from '@/components/ui'
import { tapLight } from '@/lib/haptics'
import { colors } from '@/theme/colors'
import { PHONE_MAX_WIDTH } from '@/theme/layout'
import { tr } from '@/i18n'

/** Úvodní obrazovka pro první spuštění. Po volbě nastaví `onboarded`. */
export function Onboarding({ visible }: { visible: boolean }) {
  const { updateSettings, loadSampleData } = useAppState()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const o = tr().onboarding

  function finish(then?: () => void) {
    tapLight()
    updateSettings({ onboarded: true })
    then?.()
  }

  // Kořen přes style: `className` uvnitř <Modal> na webu nemusí dorazit.
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => finish()}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: PHONE_MAX_WIDTH,
            alignSelf: 'center',
            paddingHorizontal: GUTTER,
            paddingTop: insets.top + 48,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <Title>{o.title}</Title>
          <Text className="mt-3 text-[18px] leading-[26px] text-muted">{o.lead}</Text>

          <View className="mt-10">
            {o.points.map(([title, text]) => (
              <View key={title}>
                <Rule />
                <View className="py-4">
                  <Text className="text-[17px] font-semibold text-white">{title}</Text>
                  <Text className="mt-1 text-[15px] leading-[22px] text-muted">{text}</Text>
                </View>
              </View>
            ))}
            <Rule />
          </View>

          <View style={{ marginTop: 'auto', gap: 8 }}>
            <Button title={o.sample} size="lg" onPress={() => finish(loadSampleData)} />
            <Button title={o.create} variant="secondary" onPress={() => finish(() => router.push('/split-form'))} />
            <Button title={o.blank} variant="ghost" onPress={() => finish()} />
          </View>
        </View>
      </View>
    </Modal>
  )
}
