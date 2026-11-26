import { useMemo, useState } from 'react'
import { Image, Text, View } from 'react-native'
import { libraryInstructions, type Exercise } from '@/core'
import { Button, Rule, Sheet } from '@/components/ui'
import { exName } from '@/lib/exerciseName'
import { getLang, tr } from '@/i18n'

/** Detail cviku: obrázek, svaly, vybavení a postup. */
export function ExerciseDetailSheet({
  exercise,
  onClose,
  onEdit,
}: {
  exercise: Exercise | null
  onClose: () => void
  /** Jen pro vlastní cviky — otevře formulář. */
  onEdit?: (exercise: Exercise) => void
}) {
  const t = tr()
  const x = t.exercises
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const steps = useMemo(() => (exercise ? libraryInstructions(exercise.id) : null), [exercise])
  const showImage = !!exercise?.imageUrl && failedUrl !== exercise.imageUrl
  const hasEnglishText = !!(steps?.length || exercise?.description)

  return (
    <Sheet visible={exercise !== null} onClose={onClose} title={exercise ? exName(exercise) : ''} scroll>
      {exercise ? (
        <View className="pb-4">
          {showImage ? (
            <Image
              source={{ uri: exercise.imageUrl! }}
              onError={() => setFailedUrl(exercise.imageUrl)}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              style={{ width: '100%', aspectRatio: 1.5, borderRadius: 10, marginBottom: 12 }}
            />
          ) : null}

          <Rule />
          <Fact label={x.main} value={t.muscle[exercise.muscleGroup]} />
          {exercise.secondaryMuscles?.length ? (
            <Fact label={x.helps} value={exercise.secondaryMuscles.map((m) => t.muscle[m]).join(', ')} />
          ) : null}
          <Fact label={x.gear} value={t.equipment[exercise.equipment]} />
          <Fact label={x.repRange} value={`${exercise.defaultRepRange[0]}–${exercise.defaultRepRange[1]}`} />

          {hasEnglishText ? (
            <View className="mt-5">
              <Text className="text-[15px] font-semibold text-white">{x.how}</Text>
              {getLang() !== 'en' ? (
                <Text className="mt-0.5 text-[13px] text-faint">{x.howEnglishOnly}</Text>
              ) : null}
              {exercise.description ? (
                <Text className="mt-2 text-[16px] leading-[23px] text-muted">{exercise.description}</Text>
              ) : null}
              {/* Postup je skutečná posloupnost kroků, proto číslování. */}
              {steps?.map((step, i) => (
                <View key={i} className="mt-2.5 flex-row" style={{ gap: 10 }}>
                  <Text className="w-5 text-[16px] text-faint">{i + 1}</Text>
                  <Text className="flex-1 text-[16px] leading-[23px] text-muted">{step}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {exercise.isCustom && onEdit ? (
            <Button className="mt-6" variant="secondary" title={x.edit} onPress={() => onEdit(exercise)} />
          ) : null}
        </View>
      ) : null}
    </Sheet>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <View className="flex-row justify-between py-3" style={{ gap: 16 }}>
        <Text className="text-[15px] text-muted">{label}</Text>
        <Text className="flex-1 text-right text-[15px] text-white">{value}</Text>
      </View>
      <Rule />
    </View>
  )
}
