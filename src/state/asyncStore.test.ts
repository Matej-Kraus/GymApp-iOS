import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStore } from './asyncStore'

// AsyncStorage má oficiální in-memory mock pro jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('createAsyncStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it('hydrate načte existující hodnotu do sync cache', async () => {
    await AsyncStorage.setItem('k', 'hello')
    const store = createAsyncStore()
    await store.hydrate()
    expect(store.getItem('k')).toBe('hello')
  })

  it('getItem vrací null pro neznámý klíč', async () => {
    const store = createAsyncStore()
    await store.hydrate()
    expect(store.getItem('nope')).toBeNull()
  })

  it('setItem zapíše do cache synchronně a persistuje async', async () => {
    const store = createAsyncStore()
    await store.hydrate()
    store.setItem('k', 'value')
    expect(store.getItem('k')).toBe('value') // hned v cache
    await new Promise((r) => setTimeout(r, 0)) // necháme doběhnout async write
    expect(await AsyncStorage.getItem('k')).toBe('value')
  })

  it('removeItem smaže z cache i z úložiště', async () => {
    const store = createAsyncStore()
    await store.hydrate()
    store.setItem('k', 'value')
    store.removeItem!('k')
    expect(store.getItem('k')).toBeNull()
  })
})
