# Specifikace stánku S4244 — čitelné shrnutí

> Strojově čitelná verze: `stand-spec.json`. Vizuální verze: `../web/index.html`.
> Když se něco mění, měň to **v JSONu**, ne tady.

## Základ

Rohový **shell scheme GES AMP**, ExCeL London, září 2026. Dvě bílé stěny, dvě strany otevřené
do uliček. Stánek na plánu vystupuje jako „Pixel Floors".

Výměra dle půdorysu haly (`preview.webp`): **3 × 6 m = 18 m²** — dvě spojená místa 3×3 m.
Sousedé: za 3m stěnou **S4242 Blacklight Attractions**, za 6m stěnou **S4345 House of Play (Europe)**.

## Potvrzeno pořadatelem (3. 7. 2026), GES spec listem a přílohou GES (24. 7. 2026)

**Panely**
- Výška **2500 mm**, barva **bílá** (systém AMP), materiál **Foamex, hladký povrch** (e-mail GES 24. 7.)
- Grafický modul **986 mm** (půlpanel 489 mm), grafická výška **2474 mm**
- **Spára mezi panely 7 mm** — příloha GES „AMP Dos and don'ts" (v repu: `AMP_Dos and donts + dims updated.pdf`)
- Kratší stěna **2970 mm** = 3 panely
- TV **lze montovat** (nosnost neuvedena)

**Vlastní grafika (příloha GES + e-maily 24.–25. 7., originály v `RE_ Shell Scheme…eml`)**
- **Samolepicí vinyl povolen** přímo na panel — nepoškodit, žádná rezidua lepidla; GES neručí za rozměry
- **Rozhodnuto 18. 8. 2026:** na panely jde **řezaná / kiss-cut grafika** (to bylo předmětem dotazu
  a GES to povolil); **celoplošný polep panelu se přímo na panel dělat nebude** — dotaz ho stavěl do
  kontrastu s potištěnými panely, riziko poškození měkkého Foamexu nese HTDM. Plná plocha → **tištěná
  deska 3 mm na suchý zip**
- Tištěné desky: libovolný **rigidní materiál 3 mm** (Foamex, Dibond, Correx…), formát 986 × 2474
- Uchycení: **suchý zip** (strana loop po celém obvodu desky, na panelu **min. 24 h před otevřením show**)
  nebo oboustranné podložky od GES
- **Zakázáno:** hřebíky/špendlíky, vruty/díry, sponky, malování stěn
- Textil: **jedním kusem až do šířky 10 m** — visual 2976 mm (3m stěna) / **5952 mm (6m stěna, bez spoje)**;
  GES dodá jen visual rozměr, fyzický určuje látka (blockout doporučen)

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
  — doslova z e-mailu pořadatele 3. 7. 2026: *„As one length of your booth is 3m, you are only
  permitted to build/ hang a flag to 2.5m"*, odpověď na dotaz *„maximum permitted height of
  **freestanding elements** (e.g. beach flags, lightboxes, etc.)"*.
  Limit se týká **volně stojících prvků a vlajek**, ne závěsného poutače — ten má vlastní
  pravidla (7 m k trusu / 6 m grafika, viz Regulace níže).

## Odhady — nutno potvrdit

| Co | Hodnota | Proč odhad |
|---|---|---|
| **Stavební** délka delší stěny | 5951 mm (od 18. 8. 2026) | 6 × 986 + 5 × spára 7 mm z přílohy GES; počet panelů je ale dopočet z nominálních 6 m a zdroje GES si v rozteči mírně odporují (rozpětí 5940–5952) |
| Tloušťka panelu | 40 mm | GES ji v spec listu neuvádí |

## Čeká na GES — `iaapaeu@ges.com`

1. **Celková stavební délka obou stěn + potvrzení 6 panelů na stěně B** pro S4244 — podklady GES dávají rozteč 990/992/993 mm (2970 vs 2972, resp. 5940–5952); blokuje jen dělení grafiky přes spáry
2. U textilu potvrdit **1 kus** na 6m stěnu (visual 5952) a možnost instalace vlastního textilu do systému AMP
3. Nosnost panelu pro TV
4. Přesný rozměr jmenovky

Na pořadateli (`OperationsEMEA@IAAPA.org`): **rigging poutače** — výšku zadal klient
(spodní hrana 4000 mm, rigging plán 23. 7. 2026), věšet smí jen oficiální kontraktor,
uzávěrka **9. 8. 2026**.

## Závěsný poutač — vybráno 16. 7. 2026

**Zip-up Round Ø1520 × 610 mm, 6,7 kg** — kruhový textil potištěný po celém obvodu (360°).

- Spodní hrana **4000 mm**, horní hrana grafiky **4610 mm** — *výška zadána klientem (rigging plán 23. 7. 2026)*
- Natočení grafiky **115°** od přední uličky směrem ke stěně A (šev vychází naproti středu grafiky)
- Grafika: `assets/grafika/Poutač360v2.jpg`
- Větší **Ø3050 zamítnut** — při povinném odstupu 1000 mm od obou stěn (branding míří 360°,
  tedy i ke stěnám) zbývá v užším směru jen ~1970 mm; navíc by přesáhl půdorys i k sousedům
- Limit 2,5 m pro volně stojící prvky se ho **netýká** — poutač má vlastní pravidla

Detaily a kontrolní přepočty: `hanging_banner` v `stand-spec.json`.

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
