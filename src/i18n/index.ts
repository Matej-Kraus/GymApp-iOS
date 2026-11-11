import { cs, type Dict } from './cs'
import { en } from './en'

/**
 * Překlady bez knihovny. `tr()` vrací slovník aktuálního jazyka; klíče i
 * parametry hlídá TypeScript (`en` musí mít tvar `cs`).
 *
 * Jazyk je modulová proměnná — nastavuje ji `AppStateProvider` z nastavení
 * a při změně se strom obrazovek přemontuje (viz `app/_layout.tsx`), takže
 * komponenty nepotřebují hook.
 */
export type Lang = 'cs' | 'en'

/** Jazyk systému; čeština i pro slovenštinu, jinak angličtina. */
export function systemLang(): Lang {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase()
    return tag.startsWith('cs') || tag.startsWith('sk') ? 'cs' : 'en'
  } catch {
    return 'en'
  }
}

/** Nastavení → jazyk. Nenastaveno = podle systému. */
export function resolveLang(setting: Lang | undefined): Lang {
  return setting ?? systemLang()
}

let current: Lang = systemLang()

export function setLang(lang: Lang): void {
  current = lang
}

export function getLang(): Lang {
  return current
}

/** BCP 47 značka pro formátování čísel a dat. */
export function localeTag(): string {
  return current === 'cs' ? 'cs-CZ' : 'en-GB'
}

export function tr(): Dict {
  return current === 'cs' ? cs : en
}

export type { Dict }
