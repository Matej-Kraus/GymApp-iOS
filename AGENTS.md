# Expo SDK 54

Projekt běží na **Expo SDK 54** (`expo: ~54.0.35`). Než budeš psát kód, přečti
si dokumentaci k té verzi: https://docs.expo.dev/versions/v54.0.0/

Nečti docs k SDK 56 — API se mezi verzemi liší a upgrade je vědomě odložený
(viz F2 v [ROADMAP.md](./ROADMAP.md)), protože čeká na Apple Developer účet.

## Než něco změníš

- **Pravidla vizuálu** jsou v [ROADMAP.md](./ROADMAP.md#pravidla-která-drží-vzhled-pohromadě).
  Obsahují i pasti RN webu, které už jednou stály hodiny (`className` na
  `Animated.View` uvnitř `<Modal>`, tiše nefunkční NativeWind třídy).
- **Testovací smyčka je web:** `npx expo start --web`. Nativní věci se reálně
  neověří, mají fallbacky.
- Na cokoli, co se ptá uživatele nebo sahá na soubory, používej
  `@/lib/platform` — nikdy `Alert.alert` ani `window.confirm`.
