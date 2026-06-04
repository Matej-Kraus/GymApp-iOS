# Workout Tracker — iOS (React Native / Expo)

Nativní iOS verze tréninkového deníku. Business logika je sdílená s webovou verzí
(`../moje-app/src/core`) — typy, algoritmus progresivního přetížení, statistiky, PR detekce.

## Vývoj (Windows i Mac)
1. `npm install`
2. `npx expo start`
3. Naskenovat QR kód appkou **Expo Go** na iPhonu (App Store → „Expo Go").

## Testy
`npm test` — jednotkové testy core logiky a úložiště (jest pod nodem).

## Finální iOS build (jen Mac)
`eas build --platform ios` → `.ipa` → instalace na iPhone přes Xcode/AltStore.

## Architektura
- `src/core/` — sdílená logika (typy, progrese, statistiky), bez RN/DOM závislostí.
- `src/state/asyncStore.ts` — adaptér AsyncStorage se synchronní in-memory cache.
- `src/state/AppStateContext.tsx` — globální stav (stejný model jako web), hydratace při startu.
- `src/theme/colors.ts` — barevné tokeny (iOS dark, limetkový akcent #C6FF00).
- `src/components/` — sdílené RN komponenty.
- `app/` — Expo Router obrazovky; `app/(tabs)/` je tab bar s 5 záložkami.

## Stav
Fáze 1 (Foundation) hotová: navigace, design systém, fonty, datová vrstva.
Další fáze (Dashboard, Splity, Aktivní trénink, Historie, Progres, Nastavení)
přepíší UI z webu obrazovku po obrazovce.
