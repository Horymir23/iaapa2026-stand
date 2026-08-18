/*
  INDESIGN — ZALOŽENÍ DOKUMENTU PRO TISKOVÁ DATA
  grafika stěn stánku S4244 (IAAPA Expo Europe 2026)
  ---------------------------------------------------------------------------------
  Založí dokument pro každou stěnu, kde JEDNA STRÁNKA = JEDEN PANEL v měřítku 1:1
  (986 × 2474 mm). Panel je malý, takže se do limitu InDesignu (5486 mm) vejde
  bez zmenšování — tisková data se tedy kreslí 1:1 při 150 dpi, žádné přepočty.

  PROČ STRÁNKA = PANEL
    Dělení prvků přes spáru se vyřeší samo. Stránka končí přesně na hraně panelu,
    takže co přesahuje, se ořízne; na následující stránce začne zbytek prvku
    posunutý o rozteč 993 mm. Těch 7 mm spáry tím zmizí automaticky — není potřeba
    nic odečítat Průzkumníkem cest.

  JAK SPUSTIT
    1. InDesign → Okno (Window) → Utility → Skripty (Scripts)
    2. pravý klik na „User“ → Reveal in Finder → sem zkopíruj tenhle soubor
    3. dvojklik na „priprava-dokumentu.jsx“ v panelu Skripty

  VOLITELNĚ: vlož cestu k produkčnímu motivu do ARTWORK (níže) a skript ho sám
  rozmístí na všechny panely se správným posunem a zkontroluje efektivní ppi.

  ZDROJ ROZMĚRŮ
    data/stand-spec.json (stav k 18. 8. 2026). Panel 986 × 2474 mm a spára 7 mm
    jsou potvrzené GES; CELKOVÁ délka delší stěny (5951 mm) je zatím odhad
    (rozptyl 5940–5952) → dělené prvky neřezat, dokud ji GES nepotvrdí.

  Skript nic nemaže a nepřepisuje: vytvoří nové neuložené dokumenty.
*/

#target indesign

// ————————————————————————————— NASTAVENÍ —————————————————————————————
var PANEL_W   = 986;    // šířka panelu (mm, potvrzeno GES)
var PANEL_H   = 2474;   // grafická výška panelu (mm, potvrzeno GES)
var GAP       = 7;      // spára mezi panely (mm, potvrzeno GES) → rozteč 993
var BLEED     = 3;      // spadávka v mm; u čistě řezaných prvků může být 0
var MIN_PPI   = 150;    // požadované efektivní rozlišení bitmap ve finální velikosti

var WALLS = [
    { name: "Stena-B-delsi",  panels: 6, artwork: "" },
    { name: "Stena-A-kratsi", panels: 3, artwork: "" }
];
// artwork: absolutní cesta k produkčnímu motivu celé stěny, např.
//   "/Users/ja/Desktop/stena-b-produkce.tif"
// Necháš-li prázdné, skript jen připraví stránky a prázdné rámečky.
// ——————————————————————————————————————————————————————————————————————

var PITCH = PANEL_W + GAP;
var warnings = [];

function makeLayer(doc, name, uiColor, locked) {
    var lay = null;
    try { lay = doc.layers.itemByName(name); lay.name; } catch (e) { lay = null; }
    if (!lay || !lay.isValid) { lay = doc.layers.add({ name: name }); }
    try { lay.layerColor = uiColor; } catch (e) {}
    try { lay.locked = locked === true; } catch (e) {}
    return lay;
}

function cutContourSwatch(doc) {
    try { var s = doc.colors.itemByName("CutContour"); s.name; return s; } catch (e) {}
    return doc.colors.add({
        name: "CutContour",                 // pojmenování, které čekají řezové ploter RIPy
        model: ColorModel.SPOT,
        space: ColorSpace.CMYK,
        colorValue: [0, 100, 0, 0]
    });
}

function buildWall(cfg) {
    var wallW = cfg.panels * PANEL_W + (cfg.panels - 1) * GAP;

    var doc = app.documents.add();
    doc.documentPreferences.properties = {
        pageWidth:               PANEL_W + "mm",
        pageHeight:              PANEL_H + "mm",
        facingPages:             false,
        pagesPerDocument:        cfg.panels,
        documentBleedUniformSize: true,
        documentBleedTopOffset:   BLEED + "mm"
    };
    doc.viewPreferences.properties = {
        horizontalMeasurementUnits: MeasurementUnits.MILLIMETERS,
        verticalMeasurementUnits:   MeasurementUnits.MILLIMETERS,
        rulerOrigin:                RulerOrigin.PAGE_ORIGIN
    };
    doc.marginPreferences.properties = { top: "0mm", left: "0mm", bottom: "0mm", right: "0mm" };
    try { doc.zeroPoint = [0, 0]; } catch (e) {}

    cutContourSwatch(doc);

    // vrstvy zdola nahoru
    var lGrafika = makeLayer(doc, "1 · Grafika", UIColors.BLUE, false);
    var lRez     = makeLayer(doc, "2 · Řezové kontury (CutContour)", UIColors.MAGENTA, false);
                   makeLayer(doc, "3 · Pomocné popisky (mimo stránku)", UIColors.GRAY, false);
    var lPom     = doc.layers.itemByName("3 · Pomocné popisky (mimo stránku)");
    try { doc.layers.itemByName("Layer 1").remove(); } catch (e) {}
    try { doc.layers.itemByName("Vrstva 1").remove(); } catch (e) {}
    try { doc.activeLayer = lGrafika; } catch (e) {}

    var black = doc.swatches.itemByName("Black");
    var hasArt = cfg.artwork && cfg.artwork.length > 0;
    var artFile = hasArt ? File(cfg.artwork) : null;
    if (hasArt && !artFile.exists) {
        warnings.push("• " + cfg.name + ": soubor „" + cfg.artwork + "“ neexistuje — stránky jsou prázdné.");
        hasArt = false;
    }

    for (var i = 0; i < cfg.panels; i++) {
        var page   = doc.pages[i];
        var xFrom  = i * PITCH;                 // odkud na stěně tento panel začíná
        var xTo    = xFrom + PANEL_W;

        // popisek MIMO stránku (na pasteboard) — do exportovaného PDF se nedostane
        var lab = page.textFrames.add({
            itemLayer:       lPom,
            geometricBounds: ["-70mm", "0mm", "-10mm", PANEL_W + "mm"],
            contents:        "P" + (i + 1) + " / " + cfg.panels + "   ·   výřez " +
                             xFrom + "–" + xTo + " mm z celkové šířky " + wallW + " mm" +
                             "   ·   1:1, spadávka " + BLEED + " mm"
        });
        lab.texts[0].properties = { pointSize: 9, fillColor: black, fillTint: 70 };

        // rámeček přes celou plochu panelu včetně spadávky
        var frame = page.rectangles.add({
            itemLayer:       lGrafika,
            geometricBounds: [(-BLEED) + "mm", (-BLEED) + "mm",
                              (PANEL_H + BLEED) + "mm", (PANEL_W + BLEED) + "mm"],
            fillColor:       "None",
            strokeColor:     "None"
        });

        if (hasArt) {
            // Motiv se vloží celý a posune tak, aby na tomto panelu zůstal jeho
            // správný výřez. Šířka se natáhne na wallW → motiv navržený na starou
            // délku se tím zároveň dorovná na skutečnou šířku stěny.
            var placed = frame.place(artFile)[0];
            placed.geometricBounds = ["0mm", (-xFrom) + "mm", PANEL_H + "mm", (wallW - xFrom) + "mm"];

            try {
                var ppi = placed.effectivePpi;      // [vodorovně, svisle]
                if (ppi && ppi.length && ppi[0] < MIN_PPI) {
                    warnings.push("• " + cfg.name + " P" + (i + 1) + ": efektivní rozlišení jen " +
                                  Math.round(ppi[0]) + " ppi (potřeba " + MIN_PPI + ") — podklad nemá dost pixelů.");
                }
            } catch (e) {}
        }

        // vodítka na hranách grafické plochy
        page.guides.add(undefined, { orientation: HorizontalOrVertical.VERTICAL,   location: "0mm" });
        page.guides.add(undefined, { orientation: HorizontalOrVertical.VERTICAL,   location: PANEL_W + "mm" });
        page.guides.add(undefined, { orientation: HorizontalOrVertical.HORIZONTAL, location: "0mm" });
        page.guides.add(undefined, { orientation: HorizontalOrVertical.HORIZONTAL, location: PANEL_H + "mm" });
    }

    try { doc.layers.itemByName("2 · Řezové kontury (CutContour)").locked = false; } catch (e) {}
    return { wallW: wallW, pages: cfg.panels };
}

// ————————————————————————————— SPUŠTĚNÍ —————————————————————————————
var report = [];
for (var w = 0; w < WALLS.length; w++) {
    var r = buildWall(WALLS[w]);
    report.push("• " + WALLS[w].name + ": " + r.pages + " stránek " + PANEL_W + " × " + PANEL_H +
                " mm (stěna " + r.wallW + " mm)");
}

var msg = "Hotovo — dokumenty pro tisková data jsou založené (neuložené).\n\n" +
          report.join("\n") + "\n\n" +
          "1:1, žádné měřítko. Panel se do limitu InDesignu vejde, takže bitmapy\n" +
          "stačí na " + MIN_PPI + " dpi v této velikosti.\n\n" +
          "JAK DÁL:\n" +
          "• Prvky umisťuj na vrstvu „1 · Grafika“. Co přesahuje okraj stránky,\n" +
          "  patří na následující panel — zkopíruj to tam a posuň o −" + PITCH + " mm\n" +
          "  (Objekt → Transformace → Přesunout). Tím z prvku zmizí " + GAP + " mm spáry.\n" +
          "• Řezové kontury kresli na vrstvu 2 v barvě „CutContour“ (spot 0/100/0/0),\n" +
          "  bez výplně, a nastav jim přetisk tahu.\n" +
          "• Text před odesláním převeď na křivky (v KOPII dokumentu).\n" +
          "• Export: PDF/X-4, spadávka " + BLEED + " mm.\n\n" +
          "POZOR: celková délka delší stěny čeká na potvrzení GES (5940–5952 mm).\n" +
          "Prvky uvnitř jednoho panelu můžeš řezat hned, DĚLENÉ prvky až po potvrzení.";

if (warnings.length) {
    msg += "\n\n⚠ UPOZORNĚNÍ:\n" + warnings.join("\n");
}

alert(msg, "Tisková data S4244");
