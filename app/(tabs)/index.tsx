import { Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { useAppState } from '@/state/AppStateContext'
export default function Dashboard() {
  const { data } = useAppState()
  return (
    <Screen>
      <Text className="text-white text-2xl font-display mt-4">Dashboard</Text>
      <Text className="text-muted mt-2">Splity: {data.splits.length} · Tréninky: {data.sessions.length}</Text>
    </Screen>
  )
}
