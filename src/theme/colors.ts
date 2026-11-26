// Barevný systém „Tréninkový deník": grafitová guma, křídový text,
// jedna signální oranžová.
//
// Hodnoty jsou v `tokens.json` — jediný zdroj pravdy, čte ho i
// `tailwind.config.js`. Názvy jsou podle ROLE (bg, panel, muted…), ne podle
// odstínu, takže světlý režim později znamená jen druhou sadu hodnot.
//
// Pravidlo, které drží vzhled pohromadě: oranžová je vyhrazená pro hlavní
// akci, postup a rekordy. Nic dekorativního ji nesmí použít. Výjimka jsou
// barvy kotoučů a pásma objemu — tam barva nese skutečnou informaci.
import tokens from './tokens.json'

/** Oficiální barvy kotoučů (IWF). Klíč = hmotnost v kg. */
export const PLATE_COLORS = {
  25: '#E5322D', // červená
  20: '#2F6FE0', // modrá
  15: '#F5C518', // žlutá
  10: '#34A853', // zelená
  5: '#E8EDF2', // bílá
  2.5: '#B4302B', // tmavě červená
  1.25: '#9AA5B1', // chrom
} as const

export const colors = tokens

export type PlateWeight = keyof typeof PLATE_COLORS

/** Barva kotouče podle hmotnosti; šedá jako fallback pro nestandardní. */
export function plateColor(kg: number): string {
  return (PLATE_COLORS as Record<number, string>)[kg] ?? colors.faint
}
