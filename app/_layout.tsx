import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, Fraunces_500Medium, Fraunces_700Bold } from '@expo-google-fonts/fraunces'
import { AppStateProvider } from '@/state/AppStateContext'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // Display font = Fraunces (luxusní high-contrast serif). Body zůstává systémový.
  const [fontsLoaded] = useFonts({
    Fraunces: Fraunces_500Medium,
    FrauncesBold: Fraunces_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <AppStateProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppStateProvider>
  )
}
