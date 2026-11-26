import { Platform } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'

type IconName = keyof typeof Ionicons.glyphMap

/** Ikona záložky: obrys, aktivní vyplněná. */
function icon(outline: IconName, filled: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} color={color} size={23} />
  )
}

export default function TabsLayout() {
  const t = tr().tabs
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Aktivní záložka je bílá, ne oranžová — oranžová patří hlavní akci.
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
          // Na iPhonu výšku počítá navigace sama (safe area); web ji má moc nízkou.
          ...(Platform.OS === 'web' ? { height: 64 } : null),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.today, tabBarIcon: icon('today-outline', 'today') }} />
      <Tabs.Screen name="history" options={{ title: t.history, tabBarIcon: icon('calendar-outline', 'calendar') }} />
      <Tabs.Screen
        name="progress"
        options={{ title: t.progress, tabBarIcon: icon('trending-up-outline', 'trending-up') }}
      />
      <Tabs.Screen name="splits" options={{ title: t.plans, tabBarIcon: icon('list-outline', 'list') }} />
    </Tabs>
  )
}
