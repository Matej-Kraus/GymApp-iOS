import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppState } from '@/state/AppStateContext'
import { SplitForm } from '@/components/SplitForm'

export default function SplitFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()
  const { data, addSplit, updateSplit } = useAppState()
  const editing = id ? data.splits.find((s) => s.id === id) : undefined

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-3xl font-display text-white">{editing ? 'Upravit split' : 'Nový split'}</Text>
      </View>
      <SplitForm
        initial={editing}
        onSave={(s) => {
          if (editing) updateSplit(s)
          else addSplit(s)
          router.back()
        }}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  )
}
