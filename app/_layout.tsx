import '../global.css'
import { useEffect } from 'react'
import { View } from 'react-native'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk'
import * as Sentry from '@sentry/react-native'
import { AppStateProvider } from '@/state/AppStateContext'
import { useAppState } from '@/state/AppStateContext'
import { Onboarding } from '@/components/Onboarding'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SaveErrorBanner } from '@/components/SaveErrorBanner'

Sentry.init({
  dsn: 'https://79aef6a2606139d617bd13635301c424@o4511512404033536.ingest.de.sentry.io/4511512407900240',
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
  // ExpoUpdates je zatím vypnuté — vypnout integraci aby nenačítala neexistující nativní modul
  integrations: (integrations) =>
    integrations.filter((i) => i.name !== 'ExpoUpdatesListener'),
})

SplashScreen.preventAutoHideAsync()

function AppShell() {
  const { data, updateSettings, saveError, dismissSaveError } = useAppState()
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {saveError && <SaveErrorBanner onDismiss={dismissSaveError} />}
      {!data.settings.onboardingDone && (
        <Onboarding onDone={() => updateSettings({ onboardingDone: true })} />
      )}
    </View>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk: SpaceGrotesk_500Medium,
    SpaceGroteskBold: SpaceGrotesk_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <ErrorBoundary>
      <AppStateProvider>
        <AppShell />
      </AppStateProvider>
    </ErrorBoundary>
  )
}
