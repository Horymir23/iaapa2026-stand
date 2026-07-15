# Specifikace stánku S4244 — čitelné shrnutí

> Strojově čitelná verze: `stand-spec.json`. Vizuální verze: `../web/index.html`.
> Když se něco mění, měň to **v JSONu**, ne tady.

## Základ

Rohový **shell scheme GES AMP**, ExCeL London, září 2026. Dvě bílé stěny, dvě strany otevřené
do uliček. Stánek na plánu vystupuje jako „Pixel Floors".

Výměra dle půdorysu haly (`preview.webp`): **3 × 6 m = 18 m²** — dvě spojená místa 3×3 m.
Sousedé: za 3m stěnou **S4242 Blacklight Attractions**, za 6m stěnou **S4345 House of Play (Europe)**.

## Potvrzeno pořadatelem (3. 7. 2026) a GES spec listem

**Panely**
- Výška **2500 mm**, barva **bílá** (systém AMP)
- Grafický modul **986 mm**, grafická výška **2474 mm**
- Textil přes celou stěnu: **2970 × 2474 mm** (bez spár)
- Kratší stěna **2970 mm** = 3 panely
- TV **lze montovat** (nosnost neuvedena)

**Jmenovka** — pevně daná, branding přes ni nejde
- Bílé pozadí, černé písmo
- Obsah: logo IAAPA Expo Europe + název firmy + číslo stánku
- Sedí **z boku** (shell scheme nemá fascii), tiskne GES

**Elektro a vybavení**
- 1× zásuvka 3 kW
- **1 LED spot na každé 3 m²**, k dispozici jen jeden typ — **lze úplně odebrat**
- Stánkový koberec šedý, uličkový aqua modrý

**Výška prvků**
- Strana 3 m → volně stojící prvky **max. 2500 mm**

## Odhady — nutno potvrdit

| Co | Hodnota | Proč odhad |
|---|---|---|
| **Stavební** délka delší stěny | 5940 mm | nominálních 6 m je potvrzeno půdorysem; stěny ale stojí uvnitř plochy — 5940 = 2 × 2970 analogicky ke kratší stěně, rozpal panelů potvrdí GES |
| Tloušťka panelu | 40 mm | GES ji v spec listu neuvádí |

## Čeká na GES — `iaapaeu@ges.com`

1. **Povrch a materiál panelů** ← bez toho nelze rozhodnout řezaná fólie vs. celoplošný wrap
2. Počet a rozpal panelů konkrétně pro S4244 (spec list je z příkladu 3 × 3 m); u 6m stěny navíc: textil má max. 2970 mm → 2 kusy = svislý spoj cca uprostřed stěny — kde přesně?
3. Nosnost panelu pro TV
4. Přesný rozměr jmenovky

Na pořadateli (`OperationsEMEA@IAAPA.org`): parametry závěsného poutače (rozměr, hmotnost).

## Regulace, které omezují design

Máme shell scheme, ale **přidáváme konstrukci (LED podlaha)** → řada Space-Only pravidel platí i pro nás.

- Stánek 3 m široký → **max. 2,5 m**; stavba nad 4 m = „complex stand" (statika + poplatek); strop 6 m
- **Poutač:** max. 7 m k horní hraně trusu, grafika max. 6 m; odstup od dělicí stěny 0,5 m,
  s brandingem směrem ke stěně **1 m**; rigging jen oficiální kontraktor; de-rigging 24. 9. zakázán
- **LED podlaha = zvýšená podlaha:** nic nekotvit do podlahy haly, kabely zakrýt a označit,
  kabely nesmí přes uličky, **nájezd pro vozíčkáře**
- **Tlumené světlo:** pokud potlačíme bezpečnostní osvětlení haly, musíme doplnit vlastní
  nouzové (min. 1,5 lux anti-panic, UPS) + piktogramy únikových cest
- **Materiály:** žádná dřevotříska / MDF / LDF na nosné konstrukce
- **Sousedé:** grafika nesmí přesahovat přes dělicí stěnu, **žádná blikající světla**
- V halách ExCeL **nejsou sloupy**

## Záměr designu

LED podlaha je hlavní vizuál → tlumené (ambientní) osvětlení, spoty lze odebrat.
Bílé pozadí sedí značce a panely jsou bílé nativně.

Branding může jít přes: **panely stěn**, **LED podlahu**, **volně stojící prvky** (max. 2,5 m).
Branding **nemůže** jít přes jmenovku — její obsah určuje pořadatel.

## Termíny

| Datum | Co |
|---|---|
| ~~19. 6. 2026~~ | Platba za booth — **po termínu** |
| **24. 7. 2026** | Stand Layout Form + Risk Assessment; **Method Statement** (kvůli LED podlaze) |
| 5. 8. 2026 | Zvýhodněná sazba rigging |
| 9. 8. 2026 | Striktní uzávěrka rigging |
| 10. 8. 2026 | Nejlepší ceny GES |
| 14. 8. 2026 | Striktní uzávěrka elektro GES |
| 24. 9. 2026 | Breakdown — de-rigging poutače zakázán |
