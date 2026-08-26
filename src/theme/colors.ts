// PLATE CODE — barevný systém odvozený z kotoučů, ne vymyšlený.
//
// Kotouče mají podle IWF/IPF pevně dané barvy a každý, kdo zvedá, je čte
// z naložené osy bez přemýšlení. Appka ten samý kód používá všude:
// v kalkulačce kotoučů, u objemových pásem, u rekordů. Barva nese váhu.
//
// Podklad je studený uhel (gumová podlaha), ne teplý grafit — aby barvy
// kotoučů zůstaly jediná sytá věc na obrazovce.

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

export const colors = {
  // Podklad a povrchy
  bg: '#0E1116', // studený uhel
  panel: '#161B22', // karta
  panel2: '#1D242E', // vyvýšený povrch
  line: '#252D38', // hairline

  // Text
  text: '#E8EDF2', // studená bílá
  muted: '#7D8794', // ocelová šedá
  faint: '#4A5462', // popisky, osy grafů

  // Interakce — modrá je 20kg kotouč, nejběžnější olympijský.
  accent: '#2F6FE0',
  accentText: '#FFFFFF',

  // Sémantika objemu. Odpovídá kotoučům i běžnému čtení semaforu.
  under: '#7D8794', // pod MEV — málo
  optimal: '#34A853', // MAV — akorát
  warn: '#F5C518', // blízko MRV
  over: '#E5322D', // nad MRV — přepal
  danger: '#E5322D',

  // Rekord. Žlutá z 15kg kotouče — vydřená, ne „prémiová".
  pr: '#F5C518',
} as const

export type PlateWeight = keyof typeof PLATE_COLORS

/** Barva kotouče podle hmotnosti; chrom jako fallback pro nestandardní. */
export function plateColor(kg: number): string {
  return (PLATE_COLORS as Record<number, string>)[kg] ?? colors.faint
}
