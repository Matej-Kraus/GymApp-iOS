import { useMemo, useRef, useState } from 'react'
import { LayoutChangeEvent, PanResponder, Text, View } from 'react-native'
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg'
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { colors } from '@/theme/colors'
import { tnum } from '@/components/ui'

/** Plošný graf.
 *
 *  Návrh vychází z toho, co dělá Bklit — gradientní výplň slábnoucí k nule,
 *  přerušovaná mřížka, čárkovaný „ocas" u rozpracovaného období, crosshair
 *  s tooltipem a hlavně clip-reveal náběh: graf se odkryje zleva doprava.
 *
 *  Postaveno na react-native-svg + Reanimated, protože Bklit sám je DOM-only. */

export interface Point {
  /** Hodnota na ose Y. */
  value: number
  /** Popisek na ose X. */
  label: string
}

const AnimatedRect = Animated.createAnimatedComponent(Rect)

/** Monotónní kubická interpolace — hladká křivka, která nepřestřeluje. */
function monotonePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`

  const n = pts.length
  const dx: number[] = []
  const dy: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x
    dy[i] = pts[i + 1].y - pts[i].y
    slope[i] = dx[i] === 0 ? 0 : dy[i] / dx[i]
  }

  // Tangenty s hlídáním monotonie (Fritsch–Carlson)
  const m: number[] = [slope[0]]
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) m[i] = 0
    else m[i] = (slope[i - 1] + slope[i]) / 2
  }
  m[n - 1] = slope[n - 2]

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
    } else {
      const a = m[i] / slope[i]
      const b = m[i + 1] / slope[i]
      const h = Math.hypot(a, b)
      if (h > 3) {
        m[i] = ((3 * a) / h) * slope[i]
        m[i + 1] = ((3 * b) / h) * slope[i]
      }
    }
  }

  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i].x + dx[i] / 3
    const c1y = pts[i].y + (m[i] * dx[i]) / 3
    const c2x = pts[i + 1].x - dx[i] / 3
    const c2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${pts[i + 1].x} ${pts[i + 1].y}`
  }
  return d
}

export function AreaChart({
  data,
  height = 190,
  color = colors.accent,
  unit,
  /** Poslední bod se vykreslí čárkovaně — období ještě neskončilo. */
  dashedTail = false,
}: {
  data: Point[]
  height?: number
  color?: string
  unit?: string
  dashedTail?: boolean
}) {
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  // Clip-reveal: graf se odkryje zleva doprava.
  const reveal = useSharedValue(0)

  const PAD_L = 34
  const PAD_R = 8
  const PAD_T = 10
  const PAD_B = 22
  const plotW = Math.max(0, width - PAD_L - PAD_R)
  const plotH = Math.max(0, height - PAD_T - PAD_B)

  const { pts, min, max, ticks } = useMemo(() => {
    if (data.length === 0 || plotW === 0) {
      return { pts: [] as { x: number; y: number }[], min: 0, max: 0, ticks: [] as number[] }
    }
    const values = data.map((d) => d.value)
    let lo = Math.min(...values)
    let hi = Math.max(...values)
    if (lo === hi) {
      lo -= 1
      hi += 1
    }
    // Trochu vzduchu nad i pod, aby se křivka nedotýkala okrajů.
    const pad = (hi - lo) * 0.12
    lo -= pad
    hi += pad

    const step = data.length > 1 ? plotW / (data.length - 1) : 0
    const mapped = data.map((d, i) => ({
      x: PAD_L + i * step,
      y: PAD_T + plotH - ((d.value - lo) / (hi - lo)) * plotH,
    }))
    const tickCount = 4
    const t = Array.from({ length: tickCount }, (_, i) => lo + ((hi - lo) / (tickCount - 1)) * i)
    return { pts: mapped, min: lo, max: hi, ticks: t }
  }, [data, plotW, plotH])

  const linePath = useMemo(() => monotonePath(pts), [pts])
  const areaPath = useMemo(() => {
    if (pts.length < 2) return ''
    const base = PAD_T + plotH
    return `${linePath} L ${pts[pts.length - 1].x} ${base} L ${pts[0].x} ${base} Z`
  }, [linePath, pts, plotH])

  // Čárkovaný ocas: poslední úsek zvlášť.
  const tailPath = useMemo(() => {
    if (!dashedTail || pts.length < 2) return ''
    return monotonePath(pts.slice(-2))
  }, [dashedTail, pts])
  const solidPath = useMemo(() => {
    if (!dashedTail || pts.length < 2) return linePath
    return monotonePath(pts.slice(0, -1))
  }, [dashedTail, pts, linePath])

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width
    if (w !== width) {
      setWidth(w)
      // 1100 ms, cubic-bezier(0.85, 0, 0.15, 1) — pomalý rozjezd, rychlý střed.
      reveal.value = 0
      reveal.value = withTiming(1, {
        duration: 1100,
        easing: Easing.bezier(0.85, 0, 0.15, 1),
      })
    }
  }

  const pickRef = useRef<(x: number) => void>(() => {})
  const pick = (x: number) => {
    if (pts.length === 0) return
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i].x - x)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    setActive(best)
  }
  pickRef.current = pick

  // PanResponder misto gesture-handleru: zadna nativni zavislost navic
  // a na webu to funguje stejne.
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => pickRef.current(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pickRef.current(e.nativeEvent.locationX),
      onPanResponderRelease: () => setActive(null),
      onPanResponderTerminate: () => setActive(null),
    }),
  ).current

  if (data.length < 2) {
    return (
      <View className="items-center justify-center" style={{ height }}>
        <Text className="text-[13px] text-muted">Two sessions are needed to draw a trend.</Text>
      </View>
    )
  }

  const activePt = active != null ? pts[active] : null
  const activeDatum = active != null ? data[active] : null

  return (
    <View onLayout={onLayout}>
      <View {...responder.panHandlers}>
          {width > 0 ? (
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  {/* 0.4 nahoře, k nule dolů — jinak výplň přebije samotnou křivku */}
                  <Stop offset="0" stopColor={color} stopOpacity={0.4} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {/* Mřížka — čárkovaná 4,4, aby ustoupila datům */}
              {ticks.map((t, i) => {
                const y = PAD_T + plotH - ((t - min) / (max - min)) * plotH
                return (
                  <G key={i}>
                    <Line
                      x1={PAD_L}
                      y1={y}
                      x2={width - PAD_R}
                      y2={y}
                      stroke={colors.line}
                      strokeWidth={1}
                      strokeDasharray="4,4"
                    />
                    <SvgLabel x={4} y={y + 3} text={formatTick(t)} />
                  </G>
                )
              })}

              <G>
                <Path d={areaPath} fill="url(#areaFill)" />
                <Path
                  d={solidPath}
                  stroke={color}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                />
                {tailPath ? (
                  <Path
                    d={tailPath}
                    stroke={color}
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray="6,4"
                    strokeLinecap="round"
                  />
                ) : null}
              </G>

              {/* Zakrytí zprava, které postupně odjíždí = clip-reveal */}
              <AnimatedClipCover
                reveal={reveal}
                plotW={plotW}
                padL={PAD_L}
                height={height}
                width={width}
              />

              {/* Crosshair */}
              {activePt ? (
                <G>
                  <Line
                    x1={activePt.x}
                    y1={PAD_T}
                    x2={activePt.x}
                    y2={PAD_T + plotH}
                    stroke={colors.muted}
                    strokeWidth={1}
                    strokeDasharray="3,3"
                  />
                  <Circle cx={activePt.x} cy={activePt.y} r={5} fill={colors.bg} stroke={color} strokeWidth={2} />
                </G>
              ) : null}

              {/* Popisky osy X — první, prostřední, poslední */}
              {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((i, k) => (
                <SvgLabel
                  key={k}
                  x={Math.min(Math.max(pts[i].x - 14, 2), width - 32)}
                  y={height - 6}
                  text={data[i].label}
                  faint={active != null}
                />
              ))}
            </Svg>
          ) : (
            <View style={{ height }} />
          )}
      </View>

      {/* Tooltip */}
      {activeDatum ? (
        <View className="mt-1 flex-row items-baseline justify-center gap-1.5">
          <Text className="font-display text-lg text-white" style={tnum}>
            {formatTick(activeDatum.value)}
          </Text>
          {unit ? <Text className="font-sans-medium text-xs text-muted">{unit}</Text> : null}
          <Text className="ml-1 text-[11px] text-faint">{activeDatum.label}</Text>
        </View>
      ) : (
        <View className="mt-1 h-[22px]" />
      )}
    </View>
  )
}

/** Obdélník, který zprava zakrývá graf a při náběhu odjíždí pryč. */
function AnimatedClipCover({
  reveal,
  plotW,
  padL,
  height,
  width,
}: {
  reveal: SharedValue<number>
  plotW: number
  padL: number
  height: number
  width: number
}) {
  const props = useAnimatedProps(() => ({
    x: padL + plotW * reveal.value,
    width: Math.max(0, plotW * (1 - reveal.value) + 2),
  }))
  return <AnimatedRect y={0} height={height} fill={colors.panel} animatedProps={props} />
}

function SvgLabel({
  x,
  y,
  text,
  faint,
}: {
  x: number
  y: number
  text: string
  faint?: boolean
}) {
  return (
    <SvgText x={x} y={y} fill={faint ? colors.faint : colors.muted}>
      {text}
    </SvgText>
  )
}

// react-native-svg exportuje Text pod jmenem Text; prejmenovano kvuli kolizi s RN Text.
import { Text as SvgTextRaw } from 'react-native-svg'
function SvgText({ x, y, fill, children }: { x: number; y: number; fill: string; children: string }) {
  return (
    <SvgTextRaw x={x} y={y} fill={fill} fontSize={9} fontFamily="JakartaMedium">
      {children}
    </SvgTextRaw>
  )
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 10000) return `${Math.round(v / 1000)}k`
  if (Math.abs(v) >= 100) return String(Math.round(v))
  return String(Math.round(v * 10) / 10)
}
