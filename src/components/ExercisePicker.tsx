import { useState } from 'react'
import { Modal, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Exercise } from '@/core'
import { GUTTER, IconButton, Title } from '@/components/ui'
import { ExerciseBrowser } from '@/features/exercises/ExerciseBrowser'
import { ExerciseDetailSheet } from '@/features/exercises/ExerciseDetailSheet'
import { colors } from '@/theme/colors'
import { PHONE_MAX_WIDTH } from '@/theme/layout'
import { tr } from '@/i18n'

/**
 * Výběr cviku přes celou obrazovku — do tréninku, do plánu, do úpravy
 * tréninku. Seznam a hledání dělá `ExerciseBrowser`.
 */
export function ExercisePicker({
  visible,
  selectedIds,
  onToggle,
  onClose,
}: {
  visible: boolean
  /** Dřív seznam cviků; knihovnu si teď bere `ExerciseBrowser` sám. */
  exercises?: Exercise[]
  selectedIds: string[]
  onToggle: (exercise: Exercise) => void
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const [detail, setDetail] = useState<Exercise | null>(null)

  // Kořen přes style: `className` uvnitř <Modal> na webu nemusí dorazit.
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: PHONE_MAX_WIDTH,
            alignSelf: 'center',
            paddingTop: insets.top,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: GUTTER,
              paddingRight: 8,
              height: 52,
            }}
          >
            <Title size="sm" className="flex-1">
              {tr().exercises.pickTitle}
            </Title>
            <IconButton icon="close" label={tr().common.close} onPress={onClose} />
          </View>
          <ExerciseBrowser selectedIds={selectedIds} onPress={onToggle} onInfo={setDetail} />
        </View>
      </View>
      <ExerciseDetailSheet exercise={detail} onClose={() => setDetail(null)} />
    </Modal>
  )
}
