import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import type { Exercise } from '@/core'
import { IconButton, Screen, Title } from '@/components/ui'
import { ExerciseBrowser } from '@/features/exercises/ExerciseBrowser'
import { ExerciseDetailSheet } from '@/features/exercises/ExerciseDetailSheet'
import { tr } from '@/i18n'

/** Knihovna cviků: procházení a detail. Otevírá se z Plánů. */
export default function ExerciseLibrary() {
  const router = useRouter()
  const t = tr()
  const [detail, setDetail] = useState<Exercise | null>(null)

  return (
    <Screen>
      <View className="flex-row items-center" style={{ paddingLeft: 6, paddingRight: 8, height: 52 }}>
        <IconButton icon="chevron-back" label={t.common.back} onPress={() => router.back()} />
        <Title size="sm" className="ml-1 flex-1">
          {t.plans.library}
        </Title>
        <IconButton icon="add" label={t.plans.addCustom} onPress={() => router.push('/custom-exercise')} />
      </View>
      <ExerciseBrowser onPress={setDetail} />
      <ExerciseDetailSheet
        exercise={detail}
        onClose={() => setDetail(null)}
        onEdit={(exercise) => {
          setDetail(null)
          router.push({ pathname: '/custom-exercise', params: { id: exercise.id } })
        }}
      />
    </Screen>
  )
}
