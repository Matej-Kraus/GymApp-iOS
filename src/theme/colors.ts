// Barevný systém — téměř černý podklad, jediný zelený akcent.
//
// Pravidlo, které drží celý vzhled pohromadě: zelená je vyhrazená pro
// postup a hlavní akce. Nic dekorativního ji nesmí použít, jinak přestane
// znamenat „tohle je důležité". Všechno ostatní je šedá škála.
//
// Výjimka jsou barvy kotoučů: na naložené ose nesou skutečnou informaci
// (červená = 25 kg), takže tam sytá barva smysl má. Nikde jinde.

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
  // Podklad a povrchy — téměř černá s nepatrným zeleným nádechem.
  bg: '#070A08',
  panel: '#101511',
  panel2: '#18201A',
  line: '#232C26',

  // Text — tři úrovně, víc není potřeba.
  text: '#ECF2ED',
  muted: '#8A9690',
  faint: '#5A665F',

  // Akcent. Jen postup a hlavní akce.
  accent: '#00E676',
  accentText: '#04140B', // na sytě zelené čte černý text líp než bílý

  // Stavy. Zelená / jantarová / červená jako na semaforu.
  optimal: '#00E676',
  warn: '#FFC53D',
  over: '#FF4D4F',
  danger: '#FF4D4F',
  under: '#5A665F',
  pr: '#00E676',
} as const

export type PlateWeight = keyof typeof PLATE_COLORS

/** Barva kotouče podle hmotnosti; chrom jako fallback pro nestandardní. */
export function plateColor(kg: number): string {
  return (PLATE_COLORS as Record<number, string>)[kg] ?? colors.faint
}
