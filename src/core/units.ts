import type { Unit } from './types'

/**
 * Práce s jednotkami a zaokrouhlování vah.
 * Interně počítáme VŽDY v kg; lb je jen zobrazení.
 */

const LB_PER_KG = 2.2046226218

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG
}

/**
 * Zaokrouhlí váhu na nejbližší násobek přírůstku (nejmenšího kotouče).
 * Např. roundToIncrement(41.3, 2.5) → 42.5.
 */
export function roundToIncrement(weight: number, increment: number): number {
  if (increment <= 0) return weight
  // Zaokrouhlíme a ošetříme drobné desetinné nepřesnosti (např. 0.1+0.2).
  return Math.round((Math.round(weight / increment) * increment) * 1000) / 1000
}

/** Převede interní kg na hodnotu v daných jednotkách, zaokrouhlenou na 1 desetinné místo. */
export function toDisplayWeight(kg: number, unit: Unit): number {
  const value = unit === 'lb' ? kgToLb(kg) : kg
  return Math.round(value * 10) / 10
}

/** Inverze toDisplayWeight — převede hodnotu zadanou/zobrazenou v `unit` zpět na kg pro uložení. */
export function fromDisplayWeight(value: number, unit: Unit): number {
  return unit === 'lb' ? lbToKg(value) : value
}

/** Váha připravená k vykreslení, např. "102.5 kg" / "225 lb". */
export function formatWeight(kg: number, unit: Unit): string {
  return `${toDisplayWeight(kg, unit)} ${unit}`
}

/** Souhrnná váha (objem) připravená k vykreslení — celé číslo, oddělovač tisíců. */
export function formatVolume(kg: number, unit: Unit): string {
  const value = unit === 'lb' ? kgToLb(kg) : kg
  return `${Math.round(value).toLocaleString('cs-CZ')} ${unit}`
}
