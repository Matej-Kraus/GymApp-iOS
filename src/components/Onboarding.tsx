import { Modal, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAppState } from '@/state/AppStateContext'
import { Button } from '@/components/ui'
import { tapLight, success } from '@/lib/haptics'

const POINTS = [
  { icon: '🎯', title: 'Progressive overload', text: 'Every set comes with a target weight and rep count that beats what you did last time.' },
  { icon: '📊', title: 'Your progress', text: 'Estimated 1RM charts, personal records, volume, streak and how balanced your week is.' },
  { icon: '🔒', title: '100% offline', text: 'No accounts, no ads. Data stays on your phone and you can export a backup any time.' },
]

/** Úvodní obrazovka pro první spuštění. Po volbě nastaví `onboarded`. */
export function Onboarding({ visible }: { visible: boolean }) {
  const { updateSettings, loadSampleData } = useAppState()
  const router = useRouter()

  function finish(then?: () => void) {
    updateSettings({ onboarded: true })
    then?.()
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => finish()}>
      <SafeAreaView className="flex-1 bg-bg">
        <View className="flex-1 px-6 pt-10">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.4px] text-accent">Welcome</Text>
          <Text className="mt-1 font-display text-4xl text-white">Workout</Text>
          <Text className="mt-2 text-sm text-muted">Your training log, with a suggestion for every set.</Text>

          <View className="mt-10 gap-6">
            {POINTS.map((p) => (
              <View key={p.title} className="flex-row gap-4">
                <Text className="text-2xl">{p.icon}</Text>
                <View className="flex-1">
                  <Text className="font-display text-base text-white">{p.title}</Text>
                  <Text className="mt-0.5 text-sm text-muted leading-5">{p.text}</Text>
                </View>
              </View>
            ))}
          </View>

          <View className="mt-auto mb-2 gap-2">
            <Button
              title="Explore with sample data"
              size="lg"
              onPress={() => { success(); finish(() => loadSampleData()) }}
            />
            <Button
              title="Create first split"
              variant="secondary"
              size="lg"
              onPress={() => { tapLight(); finish(() => router.push('/splits')) }}
            />
            <Button
              title="Start from scratch"
              variant="ghost"
              size="md"
              onPress={() => { tapLight(); finish() }}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}
