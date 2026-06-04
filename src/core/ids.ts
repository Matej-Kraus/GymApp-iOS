/**
 * Generátor unikátních ID. Bez závislosti na prohlížeči — `crypto` je
 * dostupné jak v prohlížeči, tak (s polyfillem) v React Native.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Záloha — pro naše účely dostatečně unikátní.
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
