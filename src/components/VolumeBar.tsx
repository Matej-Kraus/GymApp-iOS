import { Text, View } from 'react-native'
import type { VolumeRow } from '@/core'
import { MUSCLE_LABEL } from '@/core'
import { colors } from '@/theme/colors'

/**
 * Týdenní objem jedné partie proti landmarkům.
 *
 * Jednolitě zelený pruh říkal jen „něco jsi udělal". Tady je vidět, jestli
 * je to málo, akorát, nebo moc — proužek na pozadí je pásmo MEV–MAV, čárka
 * je MRV, a barva výplně říká, kde jsi.
 *
 * Barvy jsou výjimka z pravidla „zelená jen pro postup": tady sytá barva
 * nese skutečnou informaci, stejně jako kotouče na naložené ose.
 */

const STATUS_COLOR = {
  under: colors.under,
  optimal: colors.optimal,
  warn: colors.warn,
  over: colors.over,
} as const

/** Kolik místa nechat za MRV, aby přetažení bylo vidět a ne uříznuté. */
const HEADROOM = 1.2

/** RN chce procenta jako `${number}%`, ne obyčejný string. */
function pct(value: number, scale: number): `${number}%` {
  const n = Math.min(100, Math.max(0, (value / scale) * 100))
  return `${n}%`
}

/** Vedlejší svaly dávají půlky — „7.5" ano, „7.0" ne. */
function formatSets(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function VolumeBar({ row }: { row: VolumeRow }) {
  const { muscle, sets, status, landmark } = row
  const scale = Math.max(landmark.mrv * HEADROOM, sets)

  return (
    <View className="flex-row items-center gap-3">
      <Text className="w-20 font-mono text-[11px] uppercase tracking-[0.5px] text-muted">
        {MUSCLE_LABEL[muscle]}
      </Text>

      {/* Výšku i tloušťku čáry schválně přes style: zlomkové třídy jako
          h-2.5 / w-0.5 se v tomhle NativeWind setupu nepropíšou a pruh
          pak zmizí úplně. */}
      <View className="flex-1 rounded-full bg-panel2 overflow-hidden" style={{ height: 10 }}>
        {/* Pásmo MEV–MAV: kam se chceš trefit. */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: pct(landmark.mev, scale),
            right: pct(scale - landmark.mavHigh, scale),
            backgroundColor: 'rgba(255,255,255,0.14)',
          }}
        />
        {/* Hranice MRV. */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: pct(landmark.mrv, scale),
            width: 2,
            backgroundColor: 'rgba(255,255,255,0.45)',
          }}
        />
        <View
          className="h-full rounded-full"
          style={{ width: pct(sets, scale), backgroundColor: STATUS_COLOR[status] }}
        />
      </View>

      <Text
        className="w-9 text-right font-mono-semibold text-sm"
        style={{ fontVariant: ['tabular-nums'], color: STATUS_COLOR[status] }}
      >
        {formatSets(sets)}
      </Text>
    </View>
  )
}

/** Krátké shrnutí nad seznamem — co je potřeba udělat. */
export function volumeHeadline(rows: VolumeRow[]): string {
  const under = rows.filter((r) => r.status === 'under' && r.landmark.mev > 0)
  const over = rows.filter((r) => r.status === 'over')
  if (over.length > 0) {
    return `${over.length} over MRV — back off or deload.`
  }
  if (under.length === 0) return 'Every muscle is in range this week.'
  if (under.length <= 2) {
    return `Low on ${under.map((r) => MUSCLE_LABEL[r.muscle]).join(' and ')}.`
  }
  return `${under.length} muscles below MEV this week.`
}
