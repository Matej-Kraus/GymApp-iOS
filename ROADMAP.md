# Roadmapa

Co je hotové, co se dělá dál a na co si dát pozor. Aktualizuj po každé větší dávce práce.

**Stav k 2. 10. 2026:** hotové F3–F9. Appka se poprvé builduje nativně pro iPhone
(free Apple Developer účet, team `5WVQ93537F`). Teď je na řadě **F10 — ověřit všechno
na reálném iPhonu**, pak funkce, které z „deníku" dělají plnohodnotnou appku (F11+).

---

## Jak to spustit

### Na iPhonu (Release build — běží samostatně, bez Metra)

```bash
npx expo prebuild --platform ios --clean   # jen po změně app.json / nativních balíčků
cd ios && pod install                        # potřebuje síť (stahuje Hermes)
npm run ios:device    # = scripts/ios-device.sh: build + instalace na připojený iPhone

# ručně:
xcodebuild -workspace Workout.xcworkspace -scheme Workout -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath build/dd \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=5WVQ93537F build
xcrun devicectl device install app --device <UDID> build/dd/Build/Products/Release-iphoneos/Workout.app
```

- **Free účet = podpis platí 7 dní.** Pak appka nejde otevřít a musí se znovu nainstalovat
  (data zůstanou). Placený účet (99 USD/rok) → TestFlight a podpis na rok.
- Na iPhonu musí být zapnutý **Developer Mode** a při prvním spuštění důvěřovat vývojáři
  (Nastavení → Obecné → Správa VPN a zařízení).
- **Nemaž `ios/build/generated`** — je tam codegen z `pod install`; bez něj build padá
  na „Build input file cannot be found … States.cpp". Spraví to `pod install`.
- První build trvá ~15–20 min a chce ~10 GB volného místa.

### Vývoj

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

> Úkoly jsou i jako [GitHub issues s labelem `roadmap`](../../issues?q=label%3Aroadmap). Hotové odškrtni na obou místech.

> Hotové je všechno kromě F2. Jak motor rozhoduje, je v hlavičce `src/core/rir.ts`.
> Na cokoli, co se ptá uživatele nebo sahá na soubory, používej `@/lib/platform`
> (`confirm`, `choose`, `notify`, `saveJson`, `pickJson`, `shareText`) — nikdy
> `Alert.alert` ani `window.confirm`. Obrazovka tréninku je rozdělená:
> stav v `useWorkoutSession`, vzhled v `features/workout/*` — nová funkce
> (supersety, náhrada cviku) patří tam, ne do `app/workout.tsx`.

### F10 · Ověřit na iPhonu ← TEĎ · [#1](../../issues/1)

Všechno níž je na webu ověřené jen přes fallbacky. Projít na telefonu:

- [ ] Onboarding, vytvoření splitu, celý trénink od startu po souhrn
- [ ] Autosave draftu — zabít appku uprostřed tréninku a otevřít znovu
- [ ] Rest timer, haptika, kalkulačka kotoučů s klávesnicí
- [ ] HealthKit — dialog oprávnění, váha, složení těla, Watch tréninky v Progress
- [ ] Notifikace — připomínka tréninku přijde i se zavřenou appkou
- [ ] Export / import zálohy přes share sheet a Soubory
- [ ] Safe area (Dynamic Island), dotykové cíle, scroll, klávesnice na všech formulářích
- [ ] Ikona a splash na ploše
- [ ] Výkon: historie s rokem dat (vzorová data), animace grafů

Nalezené chyby zapisovat do „Známé chyby".

### F11 · Data nesmí zmizet · [#2](../../issues/2)

Hotovo 5. 10. 2026, zbývá ověřit na iPhonu. Logika `src/core/backup.ts` (testy),
soubory `src/lib/backups.ts` + `snapshotFolder` v `@/lib/platform`, UI
`src/features/backup/BackupCard.tsx` a banner na dashboardu.

- [x] Automatické snapshoty v telefonu — po změně tréninků (5 s debounce) a týdně
      při jiné změně; 10 automatických + 5 pojistných, starší se mažou
- [x] Pojistný snapshot před obnovou a před „Delete all data"
- [x] Obnova ze snapshotu v Settings (s potvrzením)
- [x] Připomínka kopie mimo telefon (≥ 3 tréninky a 14 dní / nikdy) v Settings
      i na dashboardu, „Later" ji odloží o 3 dny
- [x] `Documents/Backups` vidět v Soubory (`UIFileSharingEnabled`)
- [x] Varování při selhání zápisu (`SaveErrorBanner`) a `ErrorBoundary`
- [ ] Na iPhonu: snapshoty v Soubory → Na mém iPhonu → Workout, share sheet → iCloud Drive,
      obnova ze souboru na čisté instalaci
- [ ] **Automaticky do iCloud Drive** — free účet nemá iCloud entitlement. Až s placeným
      účtem (iCloud Documents container), do té doby ručně přes share sheet.

Pozor: `lastExportAt` se nastaví po zavření share sheetu — `expo-sharing` neřekne,
jestli uživatel soubor opravdu uložil.

### F12 · Apple Health naplno · [#3](../../issues/3), [#4](../../issues/4)

- [ ] **Zápis tréninků do Health** — `NSHealthUpdateUsageDescription` to slibuje,
      ale kód zapisuje nic (`requestAuthorization` má jen `toRead`). Buď dodělat
      (`saveWorkoutSample`, přepínač v Settings), nebo text z `app.json` vyhodit.
- [ ] **Rozhodnout: Watch tréninky do historie?** Stará verze (větev `archive/lokalni-verze-2026-08`,
      `src/lib/healthImport.ts`) je importovala jako sessions bez cviků. Pozor:
      prázdné sessions zkreslí streak, objem a landmarky — musely by se ze statistik
      vyřadit (`source: 'healthkit'`).

### F13 · Funkce na „plnohodnotnou" appku · [#5](../../issues/5), [#6](../../issues/6), [#7](../../issues/7)

Seřazené podle poměru přínos / práce:

1. [x] **Konec pauzy jako notifikace** (5. 10. 2026) — `src/lib/restAlert.ts`, pevné id
       `rest-end`, ±15 s přeplánuje, Skip/odchod zruší, v popředí se nezobrazí.
       Připomínky už neruší všechno (`cancelAllScheduled…` → jen své).
       Na iPhonu ověřit se zamčeným telefonem. Live Activity až s placeným účtem.
2. [ ] **Historie cviku** — v tréninku ťuknout na cvik → poslední 3 tréninky + PR
3. [ ] **Plate/1RM kalkulačka mimo trénink** jako nástroj v Settings
4. [ ] **Widget** s dalším tréninkem a streakem (vyžaduje nativní target)
5. [ ] **Apple Watch appka** — logování sérií z hodinek (velké, až po F2)
6. [ ] Crash reporting (Sentry — `.sentryclirc` už existuje, SDK v projektu není)

### F2 · Expo SDK 56 + dev-client

Odloženo, protože nic neblokuje — nativní build jede na SDK 54.

- [x] `eas.json`, `ios.bundleIdentifier`, `appleTeamId` v `app.json` (2. 10. 2026)
- [x] Plugin `plugins/withoutPushEntitlement.js` — free účet nesmí mít push entitlement
      (lokální notifikace fungují i bez něj)
- [x] Chyběl peer `react-native-nitro-modules` (vyžaduje ho HealthKit v14) —
      bez něj padal `pod install`

- Skill `expo-upgrade`, postupně 54 → 55 → 56
- **NativeWind zůstává na 4.2.6** — v5 je pořád jen preview a SDK 56 ji nevynucuje. Největší riziko upgradu tím odpadá.
- `@expo/vector-icons` je v SDK 56 deprecated → `@react-native-vector-icons/ionicons`. Už v **sedmi** souborech (emoji se nahradily ikonami), ne ve dvou.
- `expo-file-system/legacy` → nové API. Import se při F3 přesunul do `src/lib/platform.ts:2`, takže je to jedno místo.

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
8. **Web se drží v šířce telefonu** (`global.css` → `#root`, 480 px). Modaly se montují
   mimo `#root`, takže si šířku berou samy z `phoneWidth` v `src/theme/layout.ts` —
   nový modal na to nezapomeň. Obalit `<Stack>` do View **nefunguje**: rozbije to
   Reanimated `entering` a obsah zůstane neviditelný.
9. **Když prvek zmizí nebo nemá barvu, podezřívej NativeWind třídu, ne logiku.**
   Nepropsaly se `h-2.5`, `w-0.5` ani `bg-white/[0.13]` — bez chyby, prostě nic.
   Na malé rozměry a průhlednosti používej `style`, viz `VolumeBar.tsx`.

## Odkud vzešel návrh

Vizuál vychází z toho, co dělají současné fitness appky, ne z „co vypadá draze":
- [Rozbor Whoop UI](https://www.925studios.co/blog/whoop-design-breakdown)
- [Dark-mode fitness dashboardy 2026](https://canvasbuilder.co/blog/fitness-website-design-trends-2026)

Graf `AreaChart` přebírá návrh z [Bklitu](https://bklit.com/) (gradient slábnoucí k nule, mřížka `4,4`, čárkovaný ocas, clip-reveal 1100 ms) — Bklit sám je DOM-only, takže je to postavené na `react-native-svg`.

Animace stojí na [Moti](https://moti.fyi/), což je RN port API [Motion](https://motion.dev/). `ShimmerText` je RN překlad shimmer-textu z [Kokonut UI](https://kokonutui.com/) — web verze animuje `backgroundPosition`, tady to dělá `MaskedView` s jezdícím gradientem.
