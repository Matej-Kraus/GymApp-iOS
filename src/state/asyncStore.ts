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

export function createAsyncStore(): AsyncBackedStore {
  const cache = new Map<string, string>()
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
      void AsyncStorage.setItem(key, value)
    },
    removeItem(key) {
      cache.delete(key)
      void AsyncStorage.removeItem(key)
    },
  }
}
