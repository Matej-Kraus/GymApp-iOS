# Roadmapa

Co je hotové, co se dělá dál a na co si dát pozor. Aktualizuj po každé větší dávce práce.

**Stav k 27. 8. 2026:** hotové F6, F3, F4, F5 a F7. Další na řadě je **F8** — mezocyklus a deload.

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

---

## Co dál — v tomhle pořadí

> F6, F3, F4, F5 a F7 jsou hotové. Jak motor rozhoduje, je v hlavičce `src/core/rir.ts`.
> Na cokoli, co se ptá uživatele nebo sahá na soubory, používej `@/lib/platform`
> (`confirm`, `choose`, `notify`, `saveJson`, `pickJson`, `shareText`) — nikdy
> `Alert.alert` ani `window.confirm`. Obrazovka tréninku je rozdělená:
> stav v `useWorkoutSession`, vzhled v `features/workout/*` — nová funkce
> (supersety, náhrada cviku) patří tam, ne do `app/workout.tsx`.

### F8 · Mezocyklus + deload

**Žádná nová entita** — volitelné pole v `Settings`, takže migrace ani export netřeba:

```ts
mesocycle?: { startDate: string; lengthWeeks: number; deloadWeek: boolean }
// default { lengthWeeks: 5, deloadWeek: true } = 4 týdny akumulace + 1 deload
```

Nový `src/core/mesocycle.ts` — `currentWeek()`, `volumeTargetMultiplier()`, `deloadSignals()`.

Deload se navrhne při naplánovaném týdnu, nebo když platí 2 ze 3: ≥2 partie nad MRV dva týdny po sobě · průměrný RIR za týden ≤ 0,5 · ≥2 cviky ve stagnaci.

---

### F9 · Warm-up, supersety, náhrada cviku

- Warm-up: core hotový z F4, doplnit UI + `Settings.warmupScheme`
- Supersety: `supersetGroup?: string | null` na `WorkoutEntry` a `DraftEntry` (volitelné → bez migrace). Rest timer až po poslední sérii skupiny.
- Náhrada cviku: nový `src/core/substitutes.ts` — skóre: shodný primární sval +3, průnik sekundárních +1, shodná kategorie +1, shodné vybavení +1
- Poznámky ke cviku (výška sedačky, úchop)
- Historie přímo v tréninku: „minule 80 kg × 8 @ RIR 2" — data jsou v `lastPerformance()`, chybí jen zobrazení

---

### F2 · Expo SDK 56 + dev-client

Odloženo, protože nic neblokuje. Až bude Apple Developer účet.

- Skill `expo-upgrade`, postupně 54 → 55 → 56
- **NativeWind zůstává na 4.2.6** — v5 je pořád jen preview a SDK 56 ji nevynucuje. Největší riziko upgradu tím odpadá.
- `@expo/vector-icons` je v SDK 56 deprecated → `@react-native-vector-icons/ionicons` ve dvou souborech: `app/(tabs)/_layout.tsx:2`, `app/(tabs)/splits.tsx:5`
- `settings.tsx:4` importuje `expo-file-system/legacy` → nová API
- Vytvořit `eas.json`, doplnit `ios.bundleIdentifier`

---

## Známé chyby

### Rozbijí zážitek na iPhonu (na webu je neuvidíš)

- **`KeyboardAvoidingView` není v projektu ani jednou.** Nejhorší `PlateCalculator` — modal s inputem nahoře, klávesnice překryje celou vizualizaci. Dál `progress.tsx`, `custom-exercise.tsx`, `SplitForm.tsx`.
- **Safe area:** ostatní obrazovky pořád spoléhají na `SafeAreaView` bez kontroly spodní hrany; `WorkoutFooter` už používá `useSafeAreaInsets()`.
- **Dotykové cíle pod 44 pt:** buňky kalendáře v `history.tsx` mají 40 px. `SetRow` už je vyřešený přes `hitSlop`.
- **UTC posun dat:** `toISOString().slice(0,10)` v `stats.ts:61,73` · `history.tsx:25` · `progress.tsx` · `TrainingHeatmap.tsx:41,55` · `settings.tsx:71` · `health.ts:75,98`. V ČR po půlnoci ukáže „dnešek" o den zpět. **Náhrady už existují** — `todayISO()` a `localDateISO()` v `src/lib/format.ts`, jen se ještě nepoužívají.
- **Notifikace:** `applyReminders()` tiše vrátí `false`, ale přepínač v UI zůstane zapnutý → uživatel si myslí, že připomínka běží.
- **UTC posun** je pořád všude kromě `settings.tsx` (export už používá `todayISO()`).
- `src/components/Screen.tsx` je **mrtvý kód** (0 importů) — každá obrazovka si `SafeAreaView` píše sama. Buď oživit jako jediné místo pro safe area, nebo smazat.

### Drobnosti

- `README.md` tvrdí, že je hotová jen „Fáze 1", a zmiňuje neexistující limetkový akcent `#C6FF00`
- `AGENTS.md` posílá na docs SDK 56, projekt běží na 54
- Šipka `›` na kartě splitu není klikatelná (`splits.tsx` — řádek nemá `onPress`)
- `AreaChart` nemá decimaci bodů — 365 záznamů váhy slepí osu X
- Dashboard ukáže „Pick a session" místo doporučení, když `activeProgramId` není nastavené
- Emoji jako ikony (porušuje pravidlo 5 níž): `Onboarding.tsx` 🎯 📊 🔒, `ExerciseCard.tsx` 🏋️ 🎯 🔥. Nahradit Ionicons — schválně mimo F4, aby refaktor nemíchal chování se vzhledem.

---

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
