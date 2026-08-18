# AGENTS.md

Kontext pro agenta pracujícího v tomto repozitáři.

## O co jde

Branding výstavního stánku **S4244** (název na plánu „Pixel Floors") pro **IAAPA Expo Europe 2026**,
ExCeL London, září 2026. Vystavovatel: **HTDM**.

Stánek je **rohový shell scheme** systému **GES AMP** — dvě bílé stěny 2,5 m, dvě strany otevřené
do uliček. Úkolem je přetvořit ho do vizuální podoby značky. Klíčovým prvkem je **LED podlaha**,
proto se počítá s tlumeným osvětlením.

**Proces grafiky (potvrzeno GES 24.–25. 7. 2026, originály e-mailů v `data/RE_ Shell Scheme…eml`):**
stěny staví pořadatel (GES), grafiku **vyrábí a aplikuje HTDM sám**. Panely jsou **Foamex s hladkým
povrchem** a **vlastní samolepicí vinyl je povolen** přímo na panel — podmínkou je panely nepoškodit
a nenechat rezidua lepidla; GES u vlastní grafiky **neručí** za poškození ani sednutí rozměrů.

**Rozhodnuto 18. 8. 2026 (`graphics_production.full_wrap_decision`):** na panely jde **řezaná /
kiss-cut grafika** — přesně na to se dotaz ptal a GES ji povolil. **Celoplošný polep celého panelu
se přímo na panel dělat nebude**: dotaz ho výslovně stavěl do kontrastu s potištěnými panely
(„*instead of* using fully printed wall panels"), takže povolení na něj nesedí, a riziko poškození
měkkého Foamexu nese HTDM. Pro plnou plochu se použije **tištěná deska 3 mm na suchý zip**.
Detail v `data/stand-spec.json` → `confirmed.own_graphics.exchange_verbatim` (doslovné znění celé
výměny) a `graphics_production`; tiskové podklady shrnuje `web/tisk.html`.
Příloha GES **„AMP Dos and don'ts"** je od 18. 8. 2026 v repu
(`data/AMP_Dos and donts + dims updated.pdf` → spec `confirmed.amp_file_guide`): potvrzuje
panel **986 × 2474**, půlpanel 489 × 2474, **spáru 7 mm**, tištěné desky z rigidního materiálu
3 mm na suchý zip (velcro po obvodu, min. 24 h před otevřením show), zákaz hřebíků/vrutů/sponek/
malování a textil **jedním kusem až do 10 m** (visual 2976 / 5952 mm — svislý spoj na stěně B odpadá).

## Zlaté pravidlo

**`data/stand-spec.json` je jediný zdroj pravdy.** Žádný rozměr nepiš natvrdo nikam jinam.
Když se rozměr mění → změň ho tam → přegeneruj model → řekni uživateli, co se změnilo.

Soubor rozlišuje `confirmed` (potvrzeno písemně), `assumed` (odhad) a `open_questions` (čeká na GES).
**Tyhle tři kategorie nikdy nemíchej.** Když stavíš na odhadu, řekni to nahlas.

## Co ještě není potvrzené

Nominální výměra plochy je potvrzená půdorysem haly (`data/preview.webp`): **3 × 6 m = 18 m²**,
dvě spojená místa 3×3 m. Pozor ale — nominální plocha ≠ stavební délka stěn (stěny stojí uvnitř
plochy: potvrzená stěna A má 2970 mm na nominální 3 m). Dvě věci v modelu proto zůstávají
**odhady**, ne fakta:
- **stavební délka delší stěny B** (5951 mm od 18. 8. 2026) — 6 × 986 + 5 × spára 7 mm z přílohy GES;
  počet panelů je ale pořád dopočet a zdroje GES si v rozteči mírně odporují (990/992/993 mm →
  rozpětí 5940–5952, viz spec `confirmed.amp_file_guide.gap_note`) — celkovou délku musí potvrdit GES
- **tloušťka panelu** (40 mm) — GES ji v spec listu neuvádí

Otázky na GES / pořadatele jsou v `open_questions` v spec souboru. Pro grafiku je nejdůležitější
**potvrzení celkových stavebních délek stěn** — blokuje jen dělení prvků procházejících přes spáry;
prvky celé uvnitř jednoho panelu (≤ 986 mm) lze vyrábět hned.

## Skills

- `.agent/skills/stand-3d/` — práce s 3D modelem, mapování grafiky na panely, exporty, regulace.
  Načti ho vždy, když se dotýkáš geometrie, rozměrů, grafiky na stěnách nebo souborů ve `web/` a `model/`.

## Pracuje se tu se dvěma modely

Na projektu se střídá **Claude i Gemini**. Z toho plyne pár pravidel:

**Tento soubor (`AGENTS.md`) je kanonický kontext.** `CLAUDE.md` a `GEMINI.md` na něj jen odkazují
a přidávají drobnosti specifické pro daný model. Když se mění kontext projektu, **měň ho tady** —
ne ve třech souborech současně, jinak se rozejdou.

**Zjištění patří do souborů, ne do konverzace.** Druhý model tvůj chat nevidí. Když něco potvrdíš
nebo zjistíš — typicky odpověď od GES — zapiš to do `data/stand-spec.json` a přesuň z `assumed`
nebo `open_questions` do `confirmed`. Teprve tím to existuje pro celý projekt.

**Skill načítej explicitně.** Claude si `.agent/skills/stand-3d/SKILL.md` může natáhnout sám,
Gemini ne — u něj je to potřeba načíst ručně. Neodvozuj geometrii a mapování textur znovu od nuly,
je to popsané tam.

## Struktura

```
AGENTS.md              ← kanonický kontext (tento soubor)
CLAUDE.md / GEMINI.md  odkazy na AGENTS.md + poznámky pro daný model
data/stand-spec.json   zdroj pravdy — rozměry, regulace, termíny, kontakty, produkt
data/specifikace.md    čitelné shrnutí pro člověka
web/index.html         datová stránka (podklad pro branding)
web/viewer.html        3D editor v prohlížeči
web/tisk.html          návod pro tisková data — rozměry, odvození, DPI, dotazy na výrobce
                       (hodnoty čte živě ze stand-spec.json; screenshoty v assets/export/tisk/)
web/tiskarna.html      POPTÁVKA PRO TISKÁRNU (posílá se ven) — co tiskneme, rozměry, vizualizace,
                       dotaz na odstranitelnost fólie z Foamexu. Rozměry NEčte živě ze spec
                       (musí odpovídat tomu, co tiskárna dostala) → při změně přepsat ručně
web/mini-mesh.js       mesh produktu mini pro viewer (GENEROVANÝ — needitovat ručně)
web/arcade-mesh.js     mesh produktu arcade pro viewer (GENEROVANÝ — needitovat ručně)
web/kiosk-mesh.js      mesh kiosku „pult + monitor" pro viewer (GENEROVANÝ — needitovat ručně)
model/generator.py     generuje STL + DAE stánku
model/mini.stp         CAD model produktu „mini" (exponát — LED podlahová aréna)
model/export_mini.py   převod mini.stp → mesh pro viewer + STL/DAE (běží přes FreeCAD)
model/export_arcade.py syntetický model exponátu „arcade" (python3, bez FreeCADu)
model/export_kiosk.py  syntetické kiosky „pult + monitor" u uličky (python3, bez FreeCADu)
model/export_banner.py syntetický kruhový závěsný poutač „Zip-up Round" nad stánkem (python3)
model/*.stl *.dae      hotové modely pro SketchUp / Blender
assets/brand/          brandové grafiky (polepy, vizuál LED podlahy)
assets/export/         rendery a snímky
```

## Jak spustit

Stačí otevřít HTML v prohlížeči — nic se nebuildí, žádné závislosti:
```bash
open web/viewer.html     # 3D editor
open web/index.html      # datová stránka
python3 model/generator.py model/    # přegenerování STL + DAE stánku
# produkt mini (vyžaduje FreeCAD.app):
/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd model/export_mini.py
python3 model/export_arcade.py      # produkt arcade (bez závislostí)
python3 model/export_kiosk.py       # kiosky u uličky (bez závislostí)
python3 model/export_banner.py      # kruhový závěsný poutač nad stánkem (bez závislostí)
```

## Nasazení na web

Projekt běží na GitHub Pages: **<https://horymir23.github.io/iaapa2026-stand/>**

- Repozitář: <https://github.com/Horymir23/iaapa2026-stand> — **veřejný** (Pages na free plánu
  nejde z privátního repa). Vše, co se commitne, je tedy veřejně čitelné.
- Nasazuje se automaticky **pushem do `main`** — Pages servíruje kořen repozitáře, žádný build.
- `index.html` v kořeni je jen rozcestník na `web/viewer.html` a `web/index.html`.
- Viewer čte `../data/stand-spec.json` relativní cestou — **strukturu složek neměnit**,
  jinak se na webu rozbije sync se zdrojem pravdy.

## Nejbližší termín

**24. 7. 2026** — Stand Layout Form + Risk Assessment. Kvůli LED podlaze (= konstrukce na shell
scheme) je podle regulací potřeba i **Method Statement**. Rozsah potvrdit u Operations.

## Tón

Uživatel je Čech, komunikuj česky. Je to obchodník/account manager, ne 3D grafik — vysvětluj
technické věci srozumitelně, ale nepodceňuj ho. Když něco není jisté, řekni to rovnou;
u výstavního stánku je špatný rozměr drahá chyba.
