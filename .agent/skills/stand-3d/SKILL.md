---
name: stand-3d
description: Práce s 3D modelem výstavního stánku S4244 (IAAPA Expo Europe 2026, GES AMP shell scheme) — úpravy three.js editoru, mapování brandové grafiky na panely, generování STL/DAE, kontrola souladu s regulacemi. Použij VŽDY, když se pracuje s geometrií stánku, rozměry panelů, grafikou na stěnách, LED podlahou, exportem modelu, nebo když se mění cokoliv v /web/viewer.html či /model/generator.py.
---

# Stánek S4244 — práce s 3D

## Nejdřív si přečti data

`data/stand-spec.json` je **jediný zdroj pravdy**. Rozměry nikdy nepiš natvrdo do kódu bez toho, aby odpovídaly tomuto souboru. Když se rozměr mění, mění se **tam** a pak se přegeneruje model.

Rozlišuj tři kategorie a **nikdy je nemíchej**:

- `confirmed` — potvrzeno písemně pořadatelem nebo GES spec listem. Neměň bez nového podkladu.
- `assumed` — odhad (délka delší stěny, tloušťka panelu). Když s tím pracuješ, **vždy to uživateli připomeň**.
- `open_questions` — čeká na odpověď GES. Nepředstírej, že je to vyřešené.

## Geometrie — jak je model postavený

Souřadný systém (both generator i viewer):

```
roh stánku = počátek [0, 0, 0]
stěna B (delší) → leží podél osy X, na straně y=0 (v three.js: podél X, na z=0)
stěna A (3 m)   → leží podél osy Z/Y, na straně x=0
obě otevřené strany směřují do uliček
```

Pozor na rozdíl: **generator.py používá Z jako výšku** (CAD konvence, správně pro STL/DAE do SketchUpu),
**viewer.html používá Y jako výšku** (three.js konvence). Nezaměň je.

Jednotky: **generator i spec = milimetry**. Three.js scéna pracuje v metrech → konstanta `S = 0.001`.

## Klíčové rozměry (potvrzené, nesahat)

| Co | Hodnota |
|---|---|
| Výška panelu | 2500 mm |
| Grafická plocha (výška) | 2474 mm |
| Modul panelu (šířka) | 986 mm |
| Textil přes celou stěnu | 2970 × 2474 mm |
| Stěna A | 2970 mm = 3 panely |

## Dopočet spár — dělá se to takhle

Panely musí **přesně** vyplnit délku stěny. Spára se dopočítává, není konstanta:

```python
n = round(wall_length / PANEL_W)          # počet panelů
gap = (wall_length - n * PANEL_W) / (n-1) # zbytek rozdělený mezi spáry
```

Pro stěnu 2970 mm → 3 panely, spára 6,0 mm. Pro 5940 mm → 6 panelů, spára 4,8 mm.
Když to uděláš s pevnou spárou, stěna přeteče — to už se jednou stalo, nedělej to znovu.

## Mapování grafiky přes panely — nejdůležitější věc

Toto je hlavní přínos celého nástroje. Uživatel potřebuje vidět, **kde spáry rozdělí logo**.

Grafika je jeden obrázek, ale stěna je z několika panelů. Každý panel dostane **výřez** té samé textury:

```js
const t = sourceTexture.clone();
t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
const x0 = i * (PANEL_W + gap);        // pozice panelu i na stěně
t.repeat.set(PANEL_W / wallLength, 1); // jak velký výřez
t.offset.set(x0 / wallLength, 0);      // odkud výřez začíná
```

Nikdy nedávej celou texturu na každý panel — obraz by se pak opakoval a uživatel by neviděl reálné rozdělení.

**Pozor na stěnu A:** její grafická rovina je otočená o +90° kolem Y, takže osa U textury
běží **proti** směru osy Z. Při pohledu zevnitř stánku je panel u uličky (i = nA−1) vlevo,
proto se výřez přiřazuje **zrcadleným indexem** `panelTex(tex.A, nA-1-i, …)`. S přímým `i`
vyjde pořadí panelů obráceně (levá část grafiky u stěny B místo u uličky) — už se to jednou
stalo, ověřeno screenshotem 16. 7. 2026. Stěna B (nerotovaná rovina) používá přímé `i`.

Grafická rovina se umisťuje **2 mm před líc panelu** (aby neprobleskávala), do výšky 2474 mm z 2500 mm.

## Produkt „mini" (exponát v rohu)

`model/mini.stp` je CAD sestava exponátu — LED podlahová aréna (rastr 6×12 dlaždic
300×300 mm, zábradlí s plexi do 1200 mm, věž s 50" monitorem do 1800 mm, vstupní branka).
Rozměry a umístění jsou v `stand-spec.json` → `product`: **délka 4610 × šířka 1901 ×
výška 1803 mm**. Délka je od 21. 7. 2026 **zadaná členěním sekcí** (`product.sections_mm`):
bedna s TV 200 + zábradlí 3600 + chodítko 810; plocha pixelů (12×6 dlaždic po 299,5 mm)
se předěláním nezměnila. `mini.stp` má stále původní rozměry (4677) — díly posouvá/zkracuje
až `remodel()` v `export_mini.py` (afinní mapa po sekcích aplikovaná na vrcholy teselace;
profily 40×40 se nedeformují, zkracují se jen po délce).

**Umístění:** vnitřní roh stánku, delší strana podél stěny B, věž s monitorem u stěny A,
vstup směrem do uličky. Vůle od stěn = `product.placement.clearance_mm` (panely GES
nesmí nést zátěž, produkt se o ně nesmí opírat).

**Druhý exponát „arcade"** (`product_arcade` ve spec souboru): herní LED podlaha s totemem,
syntetický model bez STEP — staví ho `model/export_arcade.py` (obyčejný python3) z rozměrů
ve spec souboru. Stojí vedle mini, bedna u stěny B. Od 21. 7. 2026 bez šikmin — kolem plochy
dlaždic je jen profil 20 mm do výšky dlaždic, celková šířka 1240 mm. Zbylý přesah 67 mm
přes hranu stánku byl **vyřešen zkrácením mini na 4610 mm** (21. 7. 2026) — arcade teď končí
**přesně v hraně**, rezerva 0 (délka stěny B je ale pořád jen odhad, viz
`product_arcade.fit_check`).

**Třetí produkt „kiosky" + stůl** (`product_kiosk` ve spec souboru): 2× volně stojící pult se
šikmým monitorem podél delší otevřené strany. Odvozeno z pultu u vstupní branky mini (šikmina
30° **změřena z mini.stp**; šířka pultu 580 mm = skříň + 2× menší rámeček 31,2 mm z původního
pultu). Monitor je od 17. 7. 2026 **bezrámečkový FHD panel 16:9 zapuštěný do šikminy** — v šikmé
ploše je otvor, **líc průhledného skla 517,6 × 291,15 mm leží přesně v rovině šikminy**
(žádný schod!) a pod sklem je tmavá výplň panelu (`monitor.screen` ve spec souboru).
Tělo plné, bílé, až na zem.

**Od 21. 7. 2026 jsou kiosky OTOČENÉ OD SEBE** — zády (delší stranou 580 mm) proti sobě,
kiosek 1 monitorem ke stěně A, kiosek 2 k arcade; lidé u nich stojí **uvnitř stánku**, ne
v uličce (řeší open question „obsluha z uličky"). Mezi zády je **stůl s poličkou na tiskoviny**
(spec → `product_kiosk.table`): deska 600 mm (zadáno), hloubka sestavy 580 = šířka kiosku,
zepředu krycí deska **až na zem** v hraně uličky (zadáno), nad ní **šikmá police 45°** s brožurami lícem do uličky,
krycí deska přesahuje 60 mm nad spodní hranu police (zarážka na letáky). Výška desky 760 mm
= regulační „nízký přístupový bod" pultu; výšky/tloušťky/úhel = návrh. Rozmístění: líc stěny A
→ mezera 1500 (2 lidé zády k sobě: obrazovky stěny A + kiosek 1) → kiosek 1 (340) → stůl 600
→ kiosek 2 (340) → průchod ~1880 k arcade = **jediný vstup do stánku** (koridor za stolem má
jen 399 mm). Počítá `model/export_kiosk.py` (obyčejný python3, staví i mesh stolu TABLE_MESH)
i `viewer.html` (`build()` — kiosky se stavějí v lokálním rámci jako `THREE.Group` a otáčejí
kolem Y, obrazovka i potisk se otáčejí s tělem).

**Potisk těla kiosků** (požadavek 19. 7. 2026, spec → `product_kiosk.graphics`): logo
`Primary Pixel Floors logo.svg` centrované nahoře na přední stěně, **šířka = šířka pultu
/ 1,618** (zadáno); pod ním **3 kostky** (SVG z `assets/grafika/kostky/`, sdílené s věží
mini) s poměrem velikostí **1,618 uvnitř trojice** (300/185,4/114,6 mm — poměr platí mezi
3 kostkami jednoho pultu, ne přes všech 6). Krajní kostky **přecházejí přes svislé rohy na
boční stěny**: textura se dělí výřezem přes `repeat`/`offset` (stejná technika jako grafika
přes panely) na přední a boční rovinu, které na rohu přesně navazují. Kreslí to jen viewer
(konstanty `KIOSK_LOGO`/`KIOSK_DICE` v `build()`, roviny 2 mm před lícem; do STL/DAE se
nepropisuje). Pozice a základní velikost 300 mm jsou návrh, poměry jsou zadání.

**Úpravy pro vizualizaci** (viz `product.modifications` ve spec souboru): vynechává se
**jen nadpodlažní část** předního zábradlí (strana do uličky: sloupky, horní rám, plexi,
přední rám vstupní branky). Rám podlahy, podesta i plůtek u věže s TV **zůstávají** —
do konstrukce podlahy se nezasahuje. Filtr `is_front_fence` v `export_mini.py`;
`mini.stp` ani `dims_mm` se tím nemění. Ocel se zobrazuje bíle (materiál `matMini.ocel`
ve `viewer.html`). Věž s monitorem je zepředu krytá průhledným plexi a byla dutá —
vnitřek se při exportu vyplňuje plnými bílými kvádry (`tower_box` v `export_mini.py`,
požadavek 16. 7. 2026). Duté jekly mají v CAD otevřená čela; 4 viditelné konce se
zaslepují zátkami (`CAP_ENDS` v `export_mini.py` — horní konce sloupků plůtku a pahýly
rámu branky po odstraněném plotu). Na čelní ploše věže pod monitorem jsou **2 bílé
reproduktory** (mírně vypouklé kupole Ø250, vypouklost 15 mm, střed y=910, z=650/1250 —
staví `export_mini.py`, hodnoty odečtené z fotky 19. 7. 2026) a **potisk kostek**
(3 SVG z `assets/grafika/kostky/`, kreslí viewer — `DEF_DECALS`, rovina 2 mm před lícem
věže x=253; pozice ve spec souboru → `product.tower_decals`). Kostky reproduktory
nepřekrývají — kupole jsou 3D před rovinou potisku. (Líc věže je po předělání 21. 7. 2026
na **x=200**, dekály kreslí viewer na x=202.) Šikmý displej pultu u vstupu (díly `DISPLEJ*`, černý
rámeček) se **nezobrazuje** — nahrazuje ho bezrámečkový FHD panel zapuštěný do plechu:
vyříznuté zapuštění 1,5 mm, průhledné sklo 517,6 × 291,15 mm s lícem **přesně v rovině
plechu**, pod ním tmavá výplň; stejný panel jako u kiosků (požadavek 17. 7. 2026; staví
`export_mini.py`, rozměr čte z `product_kiosk.dims_mm.monitor.screen`).

**Regenerace** (po změně mini.stp, tloušťky panelu nebo clearance):

```bash
/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd model/export_mini.py
```

Vygeneruje `web/mini-mesh.js` (viewer, three.js rámec, metry) a `model/mini_v_stanku.stl/.dae`
(souřadnice stánku, mm — import do SketchUpu vedle `stanek_S4244.stl`, sdílí počátek).

Pozor na tři věci (podrobně v hlavičce `export_mini.py`):
- STEP → three.js rámec je zrcadlení os, proto se ve `mini-mesh.js` obrací winding trojúhelníků.
- FreeCAD `tessellate()` se na tvaru **kešuje** — změna tolerance chce čerstvou kopii tvaru.
- FreeCAD svařuje vrcholy přes hrany → viewer mesh rozbaluje `toNonIndexed()`, jinak
  `computeVertexNormals()` zaoblí hrany.

## Kruhový závěsný poutač „Zip-up Round" (nad stánkem)

`hanging_banner` ve spec souboru: vypínací látka potištěná po **celém obvodu (360°)**, zavěšená
nad stánkem. Řídí se regulacemi `hanging_sign` (výškové limity + odstup od dělicí stěny).

**Průměr:** vybrán **Ø1520 mm** (v610). Větší **Ø3050 (L) se NEVEJDE** — je širší než kratší
rozměr stánku (stěna A = 2970) a IAAPA vyžaduje u poutače s brandingem k dělicí stěně odstup
≥1000 mm; protože je potištěný 360°, platí odstup od **obou** stěn → v užším směru zbývá jen
~1970 mm. Důvody a obě velikosti jsou v `hanging_banner.size_choice`. **Výška zavěšení
(bottom_mm 3300) je ODHAD** — uživatel ji nezadal, potvrdit u Operations (viz open_questions).

**Model:** syntetický válec, staví ho `model/export_banner.py` (python3) → jen `model/banner_v_stanku.stl/.dae`
pro SketchUp. **Viewer si válec staví VLASTNÍ** (`addBanner()` ve viewer.html) přes
`THREE.CylinderGeometry` — narozdíl od exportu má UV, takže se nahraná grafika obtočí po obvodu
(jeden souvislý obraz, **ne** dopočet přes panely jako u stěn). Obě cesty čtou stejné rozměry ze
spec souboru. Grafika se nahrává tlačítkem „Nahrát grafiku — poutač (360°)".

**Natočení grafiky:** UV šev válce je na +Z, takže střed obrázku (u = 0,5) by bez korekce mířil
na −Z = do stěny B (do cizího stánku — stalo se, opraveno 16. 7. 2026). Válec se proto otáčí
o `hanging_banner.graphic_rotation_deg` (aktuálně **70°**, zadal uživatel) od stěny B směrem
k otevřené kratší straně (+X). Ve `viewer.html` je to `out.rotation.y = -ban.ROT·π/180` —
znaménko je **záporné**, protože kladná rotace kolem Y táhne −Z k −X (ke stěně A). Změna úhlu
se dělá ve spec souboru, ne v kódu.

## Soubory a co v nich je

```
web/index.html      — datová stránka (technický podklad pro branding, čeština)
web/viewer.html     — 3D editor (three.js r128 z cdnjs, vlastní orbit ovládání)
web/mini-mesh.js    — GENEROVANÝ mesh produktu (export_mini.py) — needituj ručně
web/kiosk-mesh.js   — GENEROVANÝ mesh kiosku (export_kiosk.py) — needituj ručně
web/gfx-default.js  — GENEROVANÉ výchozí grafiky jako data URI (export_gfx.py) — needituj ručně
model/export_gfx.py — assets/grafika/*.{jpg,png,webp} → gfx-default.js (python3)
model/generator.py  — generuje STL + DAE stánku; uprav parametry nahoře a spusť
model/mini.stp      — CAD sestava produktu „mini" (dodaná, zdrojová — neměnit)
model/export_mini.py— mini.stp → mini-mesh.js + mini_v_stanku.stl/.dae (freecadcmd)
model/export_kiosk.py— kiosky → kiosk-mesh.js + kiosk_v_stanku.stl/.dae (python3)
model/*.stl         — pro SketchUp Free (import → zvol jednotky Millimeters)
model/*.dae         — pro SketchUp Go/Pro, Blender (jednotky uvnitř souboru)
data/stand-spec.json— zdroj pravdy
assets/brand/       — sem patří brandové grafiky (polepy stěn, vizuál LED podlahy)
assets/grafika/     — VÝCHOZÍ grafiky, které viewer načte sám při otevření (viz níže)
assets/export/      — sem ukládej rendery a snímky
```

## Výchozí grafiky

Viewer si při otevření sám načte grafiky z `assets/grafika/` (funkce `loadDefaultGraphics`,
konstanta `DEF_GFX`) — uživatel nic nahrávat nemusí. Přiřazení je i ve spec souboru →
`default_graphics`:

| Soubor | Kam |
|---|---|
| `Stěna B v3.jpg` | stěna B |
| `Stěna A v1.jpg` | stěna A |
| `Poutač360v2.jpg` | poutač (360°) |
| `Arcade.webp` | tělo totemu arcade — potisk (kostky + slogan) pod obrazovkou; pravá hrana licuje s pravou hranou bedny, horní se spodkem obrazovky |
| `kostky/Datový zdroj 1–3.svg` | potisk kostek na čelní ploše věže mini pod TV (`DEF_DECALS`, pozice ve spec → `product.tower_decals`) **a** na tělech kiosků (`KIOSK_DICE`) |
| `Primary Pixel Floors logo.svg` | logo na přední stěně obou kiosků (`KIOSK_LOGO`, spec → `product_kiosk.graphics`) |

Bundler `export_gfx.py` bere i podsložky (klíč = holý název souboru, kolize hlásí) a SVG:
bez width/height by se SVG rasterizovalo na 300×150, proto doplňuje rozměry z viewBoxu ×2.

Od 17. 7. 2026 mají výchozí grafiku i **monitory** — konstanta `DEF_SCR` (klíče dle
`screenDefs()`), soubory pojmenované číslem monitoru (`1 TV 55.jpg` … `10 Kiosek 2.jpg`),
přiřazení ve spec souboru → `default_graphics.screens`. Monitory 3–5 (krabice na stěně A)
výchozí grafiku zatím nemají.

POZOR na `file://`: Chrome (GUI i headless) blokuje obrázkové textury CORSem a bez
`crossorigin` je odmítne `texImage2D` (ověřeno 19. 7. 2026) — přímé cesty fungují jen přes
http. Proto se výchozí grafiky balí do **`web/gfx-default.js`** jako data URI (generuje
`model/export_gfx.py`, klíč = název souboru) a viewer je bere přednostně (`defGfxSrc`);
přímá cesta je jen fallback. **Po každé změně grafik v `assets/grafika/` spusť
`python3 model/export_gfx.py`** — jinak viewer z `file://` ukáže starou/žádnou grafiku.
Chybějící soubor se tiše přeskočí. Pro headless screenshoty s grafikou dál platí:
pusť `python3 -m http.server` a snímkuj `http://127.0.0.1:…` (nebo od 19. 7. stačí `file://`,
když je bundle čerstvý). Když dodá uživatel novější verzi grafiky, uprav `DEF_GFX`/`DEF_SCR`
**i** `default_graphics` ve spec souboru a přegeneruj bundle.

Přegenerování modelu:
```bash
python3 model/generator.py model/
```

## Regulace, které omezují geometrii

Když navrhuješ cokoli vertikálního, zkontroluj v `stand-spec.json` → `regulations`:

- Strana 3 m → prvky na ní **max. 2500 mm**
- Stavba nad 4000 mm = „complex stand" (statika + certifikát + poplatek)
- Poutač: max. 7000 mm k horní hraně trusu, grafika max. 6000 mm
- Poutač s brandingem směrem k dělicí stěně: odstup **min. 1000 mm**
- Grafika **nesmí přesahovat na sousední stánky**
- **Žádná blikající světla** — týká se i animace LED podlahy

## Co si pamatovat o LED podlaze

Je to hlavní vizuální prvek, ale technicky je to **zvýšená podlaha** → spouští Raised Floor regulace:
nájezd pro vozíčkáře, zakryté kabely, nic nekotvit do podlahy haly. A protože jde o konstrukci na
shell scheme stánku, vyžaduje **Risk Assessment + Method Statement** (termín 24. 7. 2026).

Ve vieweru: podlaha se zobrazuje jako šedý koberec z balíčku — vizualizace LED podlahy (emisivní materiál,
upload vizuálu, přepínač) byla z vieweru odstraněna na žádost uživatele (červenec 2026). Regulace výše
platí dál, dokud LED podlaha nezmizí i z návrhu stánku.

## Scéna ve vieweru (dle oficiální vizualizace IAAPA, červenec 2026)

Viewer zobrazuje prvky převzaté z oficiálního renderu shell scheme od pořadatele:

- **Spoty GES** = ramenová svítidla zavěšená **přes horní hranu stěny** (rameno ~340 mm nahoru,
  ~440 mm dovnitř), svítí studenější bílou **na panely**, ne doprostřed podlahy. Počet 1 / 3 m²,
  rozdělený mezi obě stěny poměrem délek.
- **Modrý koberec uliček** podél obou otevřených stran — šířka 1500 mm je **odhad z renderu**.
- **Cedule pořadatele** (HTDM · S4244) na horních koncích obou stěn, přesah do uličky —
  rozměr 1000 × 300 mm je **odhad z renderu**.
- **2× 55″ TV na stěně B** (spec soubor → `wall_tvs`, rozměry TV jsou **odhad** běžného modelu).
  Každá TV je centrovaná na střed panelu (VESA držák musí držet v jediném modulu, ne přes spáru)
  a viewer volí panely automaticky mimo zákryt věže mini (~1803 mm) a bedny arcade (1800 mm) —
  překážky měří přímo z meshů (`tallSpan()` ve viewer.html), takže změna produktů se propíše sama.
  Nosnost panelů pro TV je pořád `open_question` u GES.

## Monitory — číslování a grafika (10 obrazovek)

Stánek má **10 obrazovek**; číslování a viditelné plochy jsou ve spec souboru → `monitors.numbering`.
Logika: po obvodu od rohu — stěna B zleva (1–2), krabice na stěně A shora dolů (3–5), exponáty
od rohu (6 věž mini, 7 šikmý pult mini u vstupu, 8 totem arcade), kiosky od stěny A (9–10).

Ve vieweru: přepínač „Čísla monitorů" + rozevírací seznam nahrávání grafiky per monitor
(`screenDefs()` = jediné místo s rozměry v JS, `screenSlot()` kreslí grafiku i číslo).
Obrazovky produktů (věž/pult mini, totem, kiosky) **nemají v meshích UV** — grafika i číslo se
kreslí jako překryvná rovina (`MeshBasicMaterial`, svítí jako obrazovka). Jejich pozice jsou
**ZMĚŘENÉ z generovaných meshů** a zapsané natvrdo ve voláních `screenSlot` v `build()` —
po přegenerování meshů ověř screenshotem, že překryvy pořád sedí. Šikmé obrazovky (pult mini,
kiosky) jsou bezrámečkové FHD panely 16:9 (517,6 × 291,15 mm) **zapuštěné do šikminy**:
líc průhledného skla (`sklo` v meshích, materiál `matMini.sklo`) leží přesně v rovině šikminy
a grafika se kreslí **1,05 mm POD sklem** na tmavou výplň — `rotation.x = -π/3`, střed =
líc skla − 1,05 mm podél normály. Grafiku nikdy nedávej NAD líc skla, levituje (17. 7. 2026).

- Rozměr, který není v `confirmed`, označ jako odhad. Nevydávej ho za fakt.
- Když uživatel dodá skutečnou výměru stánku, uprav `stand-spec.json`, přegeneruj model a řekni, co se změnilo.
- Three.js je verze **r128** — `THREE.CapsuleGeometry` a `OrbitControls` v ní nejsou. Orbit je napsaný ručně, nesahej na to zbytečně.
- Textury: `t.encoding = THREE.sRGBEncoding` + `renderer.outputEncoding = THREE.sRGBEncoding`, jinak jsou barvy vybledlé.
