import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppState } from '@/state/AppStateContext'
import { SplitForm } from '@/components/SplitForm'
import { IconButton, Rule, Screen, Title } from '@/components/ui'
import { tr } from '@/i18n'

export default function SplitFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()
  const { data, addSplit, updateSplit } = useAppState()
  const t = tr()
  const editing = id ? data.splits.find((s) => s.id === id) : undefined

  return (
    <Screen>
      <View className="flex-row items-center" style={{ paddingLeft: 6, height: 52 }}>
        <IconButton icon="close" label={t.common.close} onPress={() => router.back()} />
        <Title size="sm" className="ml-1 flex-1">
          {editing ? t.splitForm.editTitle : t.splitForm.newTitle}
        </Title>
      </View>
      <Rule />
      <SplitForm
        initial={editing}
        onSave={(s) => {
          if (editing) updateSplit(s)
          else addSplit(s)
          router.back()
        }}
      />
    </Screen>
  )
}
