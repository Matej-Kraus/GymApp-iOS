import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/theme/colors'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.card2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="splits"
        options={{ title: 'Tréninky', tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progres', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Nastavení', tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} /> }}
      />
    </Tabs>
  )
}
