import { Component, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    const Sentry = require('@sentry/react-native')
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8 gap-6" edges={['top', 'bottom']}>
          <Text className="text-4xl">💥</Text>
          <View className="gap-2 items-center">
            <Text className="font-display text-xl font-bold text-white text-center">
              Něco se pokazilo
            </Text>
            <Text className="text-sm text-muted text-center">
              {this.state.error.message}
            </Text>
          </View>
          <Pressable
            onPress={this.reset}
            className="h-12 rounded-2xl bg-accent px-6 items-center justify-center"
          >
            <Text className="font-semibold text-black">Zkusit znovu</Text>
          </Pressable>
        </SafeAreaView>
      )
    }
    return this.props.children
  }
}
