# Roadmapa

Co je hotové, co se dělá dál a na co si dát pozor. Aktualizuj po každé větší dávce práce.

**Stav k 27. 8. 2026:** hotové F3–F9 i všechny známé chyby, které šlo opravit bez zařízení. Zbývá jediná věc: **F2** (Expo SDK 56 + dev-client), a ta čeká na Apple Developer účet a iPhone.

---

## Jak to spustit

```bash
npm install
npx expo start --web      # jediný způsob, jak to teď vidět běžet (není iPhone)
npm test                  # 46 testů, jádro logiky
npx tsc --noEmit          # typecheck
```

Testovací smyčka je **web**. Nativní věci (HealthKit, haptika, notifikace) na webu nejedou a mají bezpečné fallbacky — reálně se ověří až na iPhonu.

---

## Hotovo

- [x] Sloučené větve `feat/workout-polish` + `feat/apple-health`, vše na `main`
- [x] Web běží (`react-dom`, `react-native-web`, `darkMode: 'class'`)
- [x] Celé UI v angličtině — 211 řetězců včetně 35 popisů cviků
- [x] Vizuál: černo-zelená, Plus Jakarta Sans jako jediná rodina
- [x] Vlastní `AreaChart` na `react-native-svg` (nahradil `gifted-charts`)
- [x] `LoadedBar` — naložená osa v barvách kotoučů IWF
- [x] Moti + `ShimmerText` / `SkeletonBlock` / `GlowCard`
- [x] Design systém: `Button`, `Card`, `Chip`, `Segmented`, `Toggle`, `ProgressBar`, `Banner`, `Stat`, `HeroStat`, `Row`, `SectionTitle`
- [x] **F6 · Motor progrese na RIR** — `src/core/rir.ts`, tvrdé stropy, rep-range clamp,
      mikro-deload, RIR chipy v UI (79 testů)
- [x] **F3 · Web-safe vrstva** — `src/lib/dialogHost.ts` + `ConfirmProvider` + `src/lib/platform.ts`;
      všech 9 `Alert.alert` pryč, export/import zálohy jede i na webu (87 testů)
- [x] **F4 · Rozpad `app/workout.tsx`** — 581 → 127 řádků, `src/features/workout/*`,
      `src/core/warmup.ts`, dotykové cíle na 44pt, safe area místo natvrdo `pb-6` (93 testů)
- [x] **F5 · Svalové skupiny 6 → 13** — `src/core/muscles.ts` nahradil pět duplicitních map,
      `secondaryMuscles` za půl série, `DATA_VERSION = 2` s migrací vlastních cviků (116 testů)
- [x] **F7 · Objem vs. MEV/MAV/MRV** — `src/core/landmarks.ts`, `VolumeBar` s pásmy
      under/optimal/warn/over místo jednolitě zelených pruhů (130 testů)
- [x] **F8 · Mezocyklus + deload** — `src/core/mesocycle.ts`, volitelné pole v `Settings`
      (žádná migrace), deload banner na dashboardu, 2 ze 3 signálů (149 testů)
- [x] **F9 · Warm-up, supersety, náhrada cviku** — `src/core/supersets.ts` +
      `substitutes.ts`, schémata rozcvičky, trvalé poznámky ke cvikům (172 testů)

---

## Co dál — v tomhle pořadí

> Hotové je všechno kromě F2. Jak motor rozhoduje, je v hlavičce `src/core/rir.ts`.
> Na cokoli, co se ptá uživatele nebo sahá na soubory, používej `@/lib/platform`
> (`confirm`, `choose`, `notify`, `saveJson`, `pickJson`, `shareText`) — nikdy
> `Alert.alert` ani `window.confirm`. Obrazovka tréninku je rozdělená:
> stav v `useWorkoutSession`, vzhled v `features/workout/*` — nová funkce
> (supersety, náhrada cviku) patří tam, ne do `app/workout.tsx`.

### F2 · Expo SDK 56 + dev-client

Odloženo, protože nic neblokuje. Až bude Apple Developer účet.

- Skill `expo-upgrade`, postupně 54 → 55 → 56
- **NativeWind zůstává na 4.2.6** — v5 je pořád jen preview a SDK 56 ji nevynucuje. Největší riziko upgradu tím odpadá.
- `@expo/vector-icons` je v SDK 56 deprecated → `@react-native-vector-icons/ionicons`. Už v **sedmi** souborech (emoji se nahradily ikonami), ne ve dvou.
- `expo-file-system/legacy` → nové API. Import se při F3 přesunul do `src/lib/platform.ts:2`, takže je to jedno místo.
- Vytvořit `eas.json`, doplnit `ios.bundleIdentifier` (v `app.json` chybí, bez něj nejde build)
- `scheme` je `workouttracker`, zatímco appka se jmenuje Workout. Funkční, ale nesourodé — měnit jen dokud nikde neexistují odkazy.

---

## Známé chyby

Zbylo jen to, co nejde ověřit bez iPhonu, nebo co čeká na F2.

- **Nativní chování celkově.** HealthKit, haptika a notifikace mají na webu
  fallbacky, takže testovací smyčka o nich neřekne nic. Klávesnice, safe area
  a dotykové cíle jsou ošetřené, ale ověřené jen v prohlížeči.
- **`@expo/vector-icons` je v SDK 56 deprecated** → `@react-native-vector-icons/ionicons`.
  Teď se používá na sedmi místech (dřív dvou), viz F2.
- Ikony ve `ExerciseImage` jsou symbolické, ne anatomické — Ionicons nic
  lepšího nemá. Vlastní sada by chtěla PNG/SVG art.

### Opraveno 27. 8. 2026

- UTC posun dat (osm výskytů) → `src/core/dates.ts`, jest běží v `Europe/Prague`
- Chybějící `KeyboardAvoidingView` → `PlateCalculator` + tři obrazovky
- Dotykové cíle pod 44 pt v `SetRow` i v kalendáři `history.tsx`
- Natvrdo `pb-6` místo safe area ve spodní liště tréninku
- Tichý přepínač notifikací — teď se vypne a řekne proč
- Neklikatelná šipka na kartě splitu (teď spouští trénink)
- `AreaChart` bez decimace — rok denních vážení slepil osu X
- Dashboard hlásil „Pick a session", i když splity byly (jen chyběl aktivní program)
- Emoji jako ikony (porušovalo pravidlo 5) → Ionicons
- Syrové klíče skupin v UI („ShouldersFront" místo „Front delts")
- Mrtvý `src/components/Screen.tsx` smazán
- Rozbitý `Toggle` v design systému
- `README.md` a `AGENTS.md` tvrdily neplatné věci (SDK 56, „Fáze 1", 46 testů)

## Pravidla, která drží vzhled pohromadě

Než něco přidáš do UI, přečti si tohle — jinak se to rozpadne:

1. **Zelená `#00E676` je jen pro postup a hlavní akce.** Nic dekorativního ji nesmí použít, jinak přestane něco znamenat. Všechno ostatní je šedá škála (`text` / `muted` / `faint`).
2. **Výjimka jsou barvy kotoučů** na `LoadedBar` — tam sytá barva nese skutečnou informaci (červená = 25 kg). Nikde jinde.
3. **Čísla velká, popisky malé.** Velikost říká, co je důležité.
4. **Jedna rodina písma** (Plus Jakarta Sans). Hierarchii dělá váha a velikost, ne míchání písem.
5. **Žádná emoji jako ikony** — jen Ionicons.
6. Zdroj pravdy pro barvy je `src/theme/colors.ts`; `tailwind.config.js` je jeho ruční zrcadlo — **měň obojí**.
7. **Uvnitř `<Modal>` nedávej `className` na `Animated.View`** — neprojeví se (na `Pressable`
   a `Text` ano). Barvy a rozvržení dej na obyčejný `View`, animaci nech uvnitř. A `flex-1`
   tam nedostane výšku, takže na plochu přes celou obrazovku použij `StyleSheet.absoluteFill`.
   Stálo to hodinu při F3, viz `ConfirmProvider.tsx`.
8. **Když prvek zmizí nebo nemá barvu, podezřívej NativeWind třídu, ne logiku.**
   Nepropsaly se `h-2.5`, `w-0.5` ani `bg-white/[0.13]` — bez chyby, prostě nic.
   Na malé rozměry a průhlednosti používej `style`, viz `VolumeBar.tsx`.

## Odkud vzešel návrh

Vizuál vychází z toho, co dělají současné fitness appky, ne z „co vypadá draze":
- [Rozbor Whoop UI](https://www.925studios.co/blog/whoop-design-breakdown)
- [Dark-mode fitness dashboardy 2026](https://canvasbuilder.co/blog/fitness-website-design-trends-2026)

Graf `AreaChart` přebírá návrh z [Bklitu](https://bklit.com/) (gradient slábnoucí k nule, mřížka `4,4`, čárkovaný ocas, clip-reveal 1100 ms) — Bklit sám je DOM-only, takže je to postavené na `react-native-svg`.

Animace stojí na [Moti](https://moti.fyi/), což je RN port API [Motion](https://motion.dev/). `ShimmerText` je RN překlad shimmer-textu z [Kokonut UI](https://kokonutui.com/) — web verze animuje `backgroundPosition`, tady to dělá `MaskedView` s jezdícím gradientem.
