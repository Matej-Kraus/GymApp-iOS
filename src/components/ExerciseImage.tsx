import { useState } from 'react'
import { Image, Text, View } from 'react-native'
import type { Exercise } from '@/core'
import { cn } from '@/components/ui'

const FALLBACK_ICONS: Record<Exercise['muscleGroup'], string> = {
  Chest: '🫁', Back: '🦴', Legs: '🦵', Shoulders: '💪', Arms: '💪', Core: '⚡',
}

/** Obrázek cviku s fallbackem na ikonu svalové skupiny. `size` = strana čtverce v px. */
export function ExerciseImage({ exercise, size = 48 }: { exercise: Exercise; size?: number }) {
  const [error, setError] = useState(false)

  if (!exercise.imageUrl || error) {
    return (
      <View className="rounded-2xl bg-panel2 items-center justify-center" style={{ width: size, height: size }}>
        <Text style={{ fontSize: size * 0.45 }}>{FALLBACK_ICONS[exercise.muscleGroup]}</Text>
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
