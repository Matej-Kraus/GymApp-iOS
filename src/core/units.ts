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

/**
 * Zaokrouhlí váhu DOLŮ na násobek přírůstku — pro stropy, které se nesmí
 * překročit. Např. floorToIncrement(44, 2.5) → 42.5 (ne 45).
 */
export function floorToIncrement(weight: number, increment: number): number {
  if (increment <= 0) return weight
  return Math.round(Math.floor(weight / increment) * increment * 1000) / 1000
}
