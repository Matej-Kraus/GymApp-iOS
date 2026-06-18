import { Modal, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAppState } from '@/state/AppStateContext'
import { Button } from '@/components/ui'
import { tapLight, success } from '@/lib/haptics'

const POINTS = [
  { icon: '🎯', title: 'Progresivní přetížení', text: 'Appka ti u každé série navrhne váhu a opakování tak, abys vždy překonal minulý objem.' },
  { icon: '📊', title: 'Tvůj progres', text: 'Grafy 1RM, osobní rekordy, objem, streak i rovnováha partií — vše přehledně.' },
  { icon: '🔒', title: '100 % offline', text: 'Žádné účty, žádné reklamy. Data zůstávají v telefonu, zálohu si vyexportuješ kdykoliv.' },
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
          <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-accent">Vítej</Text>
          <Text className="mt-1 font-display text-4xl text-white">Workout</Text>
          <Text className="mt-2 text-sm text-muted">Tvůj osobní tréninkový deník s chytrými návrhy.</Text>

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
              title="Vyzkoušet s ukázkovými daty"
              size="lg"
              onPress={() => { success(); finish(() => loadSampleData()) }}
            />
            <Button
              title="Vytvořit první split"
              variant="secondary"
              size="lg"
              onPress={() => { tapLight(); finish(() => router.push('/splits')) }}
            />
            <Button
              title="Začít od nuly"
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
