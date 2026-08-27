import { useState } from 'react'
import { Image, Text, View } from 'react-native'
import type { Exercise, MuscleRegion } from '@/core'
import { MUSCLE_REGION } from '@/core'
import Ionicons from '@expo/vector-icons/Ionicons'
import { cn } from '@/components/ui'
import { colors } from '@/theme/colors'

// Klíčováno OBLASTÍ, ne skupinou — třináct různých ikon by nikomu nepomohlo.
// Ionicons nemá anatomické ikony, takže je to spíš symbolika než obrázek
// svalu; jde o odlišení, ne o ilustraci.
const FALLBACK_ICONS: Record<MuscleRegion, keyof typeof Ionicons.glyphMap> = {
  Chest: 'shield-outline',
  Back: 'swap-vertical-outline',
  Legs: 'walk-outline',
  Shoulders: 'triangle-outline',
  Arms: 'barbell-outline',
  Core: 'ellipse-outline',
}

/** Obrázek cviku s fallbackem na ikonu svalové skupiny. `size` = strana čtverce v px. */
export function ExerciseImage({ exercise, size = 48 }: { exercise: Exercise; size?: number }) {
  const [error, setError] = useState(false)

  if (!exercise.imageUrl || error) {
    return (
      <View className="rounded-2xl bg-panel2 items-center justify-center" style={{ width: size, height: size }}>
        <Ionicons
          name={FALLBACK_ICONS[MUSCLE_REGION[exercise.muscleGroup]]}
          size={size * 0.45}
          color={colors.muted}
        />
      </View>
    )
  }

  return (
    <Image
      source={{ uri: exercise.imageUrl }}
      onError={() => setError(true)}
      className="rounded-2xl"
      style={{ width: size, height: size }}
      resizeMode="cover"
    />
  )
}
