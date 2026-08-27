import type { Point } from './AreaChart'

/**
 * Zředí dlouhou řadu na rozumný počet bodů.
 *
 * Rok denních vážení je 365 bodů na ~350 px — popisky se slepí a křivka je
 * jen šum. Prosté „každý n-tý bod" by ale zamlčelo špičky, takže se řada
 * rozdělí na stejné úseky a z každého se vezme minimum i maximum. Rekord
 * ani propad tím z grafu nezmizí.
 */
export function decimate(data: Point[], maxPoints = 60): Point[] {
  if (data.length <= maxPoints || maxPoints < 4) return data

  // Dva krajní body jsou pevné, zbytek se rozdělí mezi úseky. Každý úsek
  // přispěje nejvýš dvěma body (min a max), proto dělíme dvěma.
  const buckets = Math.max(1, Math.floor((maxPoints - 2) / 2))
  const size = (data.length - 2) / buckets

  const kept = new Set<number>([0, data.length - 1])
  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(1 + b * size)
    const end = Math.min(data.length - 2, Math.floor(1 + (b + 1) * size) - 1)
    if (start > end) continue
    let lo = start
    let hi = start
    for (let i = start; i <= end; i++) {
      if (data[i].value < data[lo].value) lo = i
      if (data[i].value > data[hi].value) hi = i
    }
    kept.add(lo)
    kept.add(hi)
  }

  return [...kept].sort((a, b) => a - b).map((i) => data[i])
}
