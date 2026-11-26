import { ScrollView, View } from 'react-native'
import { GUTTER, PageHeader, Screen } from '@/components/ui'
import { BodySection } from '@/features/progress/BodySection'
import { ExerciseTrend } from '@/features/progress/ExerciseTrend'
import { HealthSection } from '@/features/progress/HealthSection'
import { Records } from '@/features/progress/Records'
import { tr } from '@/i18n'

/** Pokrok: vývoj cviků, rekordy, tělo a Apple Health. Části jsou ve `features/progress`. */
export default function Progress() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <View className="mb-6 mt-2">
          <PageHeader title={tr().progress.title} />
        </View>
        <ExerciseTrend />
        <View className="mt-10">
          <Records />
        </View>
        <View className="mt-10">
          <BodySection />
        </View>
        <View className="mt-10">
          <HealthSection />
        </View>
      </ScrollView>
    </Screen>
  )
}
