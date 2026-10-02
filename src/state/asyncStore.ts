import AsyncStorage from '@react-native-async-storage/async-storage'
import type { KeyValueStore } from '@/core'

/**
 * Adaptér portu `KeyValueStore` (synchronní) nad AsyncStorage (asynchronní).
 *
 * Trik: při startu jednou zavoláme `hydrate()`, který načte všechny klíče do
 * in-memory cache. Pak `getItem` čte synchronně z cache (core to vyžaduje),
 * `setItem` aktualizuje cache okamžitě a na pozadí (fire-and-forget) zapíše do
 * AsyncStorage. Díky tomu zůstává core i AppStateContext beze změny.
 */
export interface AsyncBackedStore extends KeyValueStore {
  hydrate(): Promise<void>
}

/**
 * `onWriteResult` dostane `false`, když zápis na disk selže (plné úložiště),
 * a `true`, když další zápis projde — UI podle toho ukáže / schová varování.
 * Cache se aktualizuje vždy, takže appka jede dál i bez disku.
 */
export function createAsyncStore(onWriteResult?: (ok: boolean) => void): AsyncBackedStore {
  const cache = new Map<string, string>()
  const report = (p: Promise<unknown>) =>
    p.then(() => onWriteResult?.(true), () => onWriteResult?.(false))
  return {
    async hydrate() {
      const keys = await AsyncStorage.getAllKeys()
      const pairs = await AsyncStorage.multiGet(keys)
      for (const [k, v] of pairs) {
        if (v != null) cache.set(k, v)
      }
    },
    getItem(key) {
      return cache.has(key) ? (cache.get(key) as string) : null
    },
    setItem(key, value) {
      cache.set(key, value)
      void report(AsyncStorage.setItem(key, value))
    },
    removeItem(key) {
      cache.delete(key)
      void report(AsyncStorage.removeItem(key))
    },
  }
}
