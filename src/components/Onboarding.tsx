import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { cn } from '@/components/ui'

const STEPS = [
  {
    emoji: '💪',
    title: 'Vítej ve\nWorkout Tracker',
    body: 'Tvůj offline tréninkový deník.\nBez účtu, bez reklam — data jsou jen v telefonu.',
    bullets: ['100 % offline', 'Apple Health sync', 'Progresivní přetížení'],
  },
  {
    emoji: '📋',
    title: 'Tréninkové splity',
    body: 'Split je sada cviků pro jeden tréninkový den — třeba Push, Pull nebo Legs.',
    bullets: ['Šablony PPL / Upper-Lower / Full Body', 'Vlastní splity a cviky', 'Aktivní program s doporučením'],
  },
  {
    emoji: '🏋️',
    title: 'Jak probíhá trénink',
    body: 'Každý cvik má warmup, working a backoff série. App navrhuje váhu a sleduje tvůj progres.',
    bullets: ['Working: těžká váha, max 9 rep', 'Backoff: −20 % váhy, max opakování', 'Odpočinkový timer mezi sériemi'],
  },
  {
    emoji: '📈',
    title: 'Progres a Health',
    body: 'Sleduj grafy síly, tělesnou váhu i složení z Apple Health (FeelFit apod.).',
    bullets: ['Grafy 1RM a objemu', 'Apple Health — váha a tuk %', 'Osobní rekordy automaticky'],
  },
]

interface Props {
  onDone: () => void
}

export function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="flex-1 px-6 pt-6 pb-4 gap-6">

          {/* Skip */}
          <Pressable onPress={onDone} className="self-end" hitSlop={12}>
            <Text className="text-sm text-muted">Přeskočit</Text>
          </Pressable>

          {/* Obsah */}
          <View className="flex-1 justify-center gap-6">
            <Text className="text-6xl text-center">{current.emoji}</Text>
            <Text className="font-display text-3xl font-bold text-white text-center leading-tight">
              {current.title}
            </Text>
            <Text className="text-sm text-muted text-center leading-relaxed">
              {current.body}
            </Text>
            <View className="gap-2 mt-2">
              {current.bullets.map((b, i) => (
                <View key={i} className="flex-row items-center gap-3">
                  <View className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <Text className="text-sm text-white flex-1">{b}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Indikátor kroků */}
          <View className="flex-row justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <View
                key={i}
                className={cn('rounded-full', i === step ? 'w-5 h-1.5 bg-accent' : 'w-1.5 h-1.5 bg-card2')}
              />
            ))}
          </View>

          {/* Tlačítko */}
          <Pressable
            onPress={() => (isLast ? onDone() : setStep((s) => s + 1))}
            className="h-14 rounded-2xl bg-accent items-center justify-center active:opacity-80"
          >
            <Text className="font-display text-lg font-bold text-black">
              {isLast ? 'Začít trénovat 💪' : 'Dál →'}
            </Text>
          </Pressable>

        </View>
      </SafeAreaView>
    </Modal>
  )
}
