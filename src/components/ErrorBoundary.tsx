import { Component, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Button } from '@/components/ui'
import { colors } from '@/theme/colors'

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Poslední záchrana: chyba při renderu jinak na iPhonu shodí appku na bílou
 * obrazovku. Data jsou v AsyncStorage, takže „Try again" je bezpečné —
 * znovu se vykreslí strom nad stejným stavem.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('ErrorBoundary', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-6 bg-bg px-8">
        <Ionicons name="warning-outline" size={40} color={colors.warn} />
        <View className="items-center gap-2">
          <Text className="text-center font-display text-xl text-white">Something went wrong</Text>
          <Text className="text-center text-sm text-muted">
            Your data is safe. {this.state.error.message}
          </Text>
        </View>
        <Button title="Try again" onPress={this.reset} />
      </SafeAreaView>
    )
  }
}
