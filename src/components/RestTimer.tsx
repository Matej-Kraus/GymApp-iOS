import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet } from 'react-native'
import { colors } from '@/theme/colors'
import { tapLight, warning } from '@/lib/haptics'

function mmss(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Odpočinek mezi sériemi — sticky lišta s odpočtem, ±15 s a přeskočením.
 * Běží v appce (interval + haptika na konci). `endsAt` = epoch ms konce.
 */
export function RestTimer({
  endsAt,
  totalSec,
  onAdjust,
  onDone,
  onSkip,
}: {
  endsAt: number
  totalSec: number
  onAdjust: (deltaSec: number) => void
  onDone: () => void
  onSkip: () => void
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.round((endsAt - Date.now()) / 1000)))
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    const tick = () => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true
        warning()
        onDone()
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt])

  const pct = Math.max(0, Math.min(1, remaining / Math.max(1, totalSec)))

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutDown.duration(180)}>
      <View className="relative mx-4 mb-2 overflow-hidden rounded-2xl border border-accent/30 bg-panel2">
        {/* progress výplň */}
        <LinearGradient
          colors={['rgba(200,169,97,0.22)', 'rgba(200,169,97,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFillObject, { right: `${(1 - pct) * 100}%` }]}
        />
        <View className="flex-row items-center gap-3 px-3 py-2.5">
          <Text className="text-base">⏱️</Text>
          <View className="flex-1">
            <Text className="text-[10px] font-semibold uppercase tracking-wide text-accent/80">Odpočinek</Text>
            <Text className="font-display text-xl text-white" style={{ fontVariant: ['tabular-nums'] }}>
              {mmss(remaining)}
            </Text>
          </View>
          <Pressable
            onPress={() => { tapLight(); onAdjust(-15) }}
            hitSlop={8}
            accessibilityLabel="Odebrat 15 sekund"
            className="h-9 w-12 items-center justify-center rounded-xl bg-panel"
          >
            <Text className="text-xs font-bold text-white">−15</Text>
          </Pressable>
          <Pressable
            onPress={() => { tapLight(); onAdjust(15) }}
            hitSlop={8}
            accessibilityLabel="Přidat 15 sekund"
            className="h-9 w-12 items-center justify-center rounded-xl bg-panel"
          >
            <Text className="text-xs font-bold text-white">+15</Text>
          </Pressable>
          <Pressable
            onPress={() => { tapLight(); onSkip() }}
            hitSlop={8}
            accessibilityLabel="Přeskočit odpočinek"
            className="h-9 px-3 items-center justify-center rounded-xl bg-accent"
          >
            <Text className="text-xs font-bold text-black">Skip</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  )
}
