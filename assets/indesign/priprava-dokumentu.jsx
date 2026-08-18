/*
  PŘÍPRAVA INDESIGN DOKUMENTŮ — grafika stěn stánku S4244 (IAAPA Expo Europe 2026)
  ---------------------------------------------------------------------------------
  Založí dva návrhové dokumenty (delší a kratší stěna) se správnými rozměry,
  vodítky na hranách panelů a spár, vrstvami a spot barvou pro řezovou konturu.

  JAK SPUSTIT
    1. InDesign → Okno (Window) → Utility → Skripty (Scripts)
    2. pravý klik na „User“ → Reveal in Finder → sem zkopíruj tenhle soubor
    3. dvojklik na „priprava-dokumentu.jsx“ v panelu Skripty

  PROČ MĚŘÍTKO
    Delší stěna měří 5951 mm, ale InDesign nedovolí stránku větší než 5486 mm
    (216 palců). Návrh proto běží ve zmenšeném měřítku — výchozí 1:2, kde stěna
    vyjde na 2975,5 mm. Měřítko se s rozlišením vykrátí: 1:2 @ 300 dpi = 1:1 @
    150 dpi, tedy stejných 35 144 × 14 610 px. Finální data pro řezané prvky
    se kreslí ZVLÁŠŤ, vždy 1:1.

  ZDROJ ROZMĚRŮ
    data/stand-spec.json (stav k 18. 8. 2026). Panel 986 × 2474 mm a spára 7 mm
    jsou potvrzené GES; celková délka delší stěny je zatím odhad (5940–5952) —
    proto na spáry neumisťuj nic kritického.

  Skript nic nemaže a nic nepřepisuje: vytvoří nové neuložené dokumenty.
*/

#target indesign

// ————————————————————————————— NASTAVENÍ —————————————————————————————
var SCALE      = 2;      // 1:2 — v dokumentu 1 mm = 2 mm ve skutečnosti.
                         // Delší stěna pak měří 2975,5 mm (limit InDesignu je 5486).
                         // Měřítko a DPI se vzájemně vykrátí: 1:2 @ 300 dpi dá stejný
                         // rastr jako 1:1 @ 150 dpi (35 144 × 14 610 px). Vložené
                         // bitmapy proto musí mít v panelu Vazby EFEKTIVNÍ 300 ppi.
var PANEL_W    = 986;    // šířka panelu (mm, potvrzeno GES)
var GAP        = 7;      // spára mezi panely (mm, potvrzeno GES)
var GRAPHIC_H  = 2474;   // grafická výška panelu (mm, potvrzeno GES)
var GRAPHIC_BASE = 13;   // ODHAD! Panel je vysoký 2500, grafická plocha 2474 —
                         // jak je těch 26 mm rozdělených mezi spodní a horní hranu,
                         // GES neuvádí. Předpokládám 13 + 13. Výšková vodítka níž
                         // z toho vycházejí → na místě přeměřit, kde grafická
                         // plocha skutečně začíná nad podlahou.
var WALLS = [
    { name: "Stena-B-delsi",  panels: 6, note: "delší stěna, 6 panelů" },
    { name: "Stena-A-kratsi", panels: 3, note: "kratší stěna, 3 panely" }
];
// ——————————————————————————————————————————————————————————————————————

function mm(v) { return (v / SCALE) + "mm"; }   // reálné mm → mm v dokumentu

function makeLayer(doc, name, color, locked) {
    var lay;
    try { lay = doc.layers.itemByName(name); lay.name; }        // existuje?
    catch (e) { lay = null; }
    if (!lay || !lay.isValid) { lay = doc.layers.add({ name: name }); }
    try { lay.layerColor = color; } catch (e) {}
    try { lay.locked = locked === true; } catch (e) {}
    return lay;
}

function cutContourSwatch(doc) {
    // Spot barva pro řezovou konturu — standard pro řezací plotry.
    try { var s = doc.colors.itemByName("CutContour"); s.name; return s; } catch (e) {}
    return doc.colors.add({
        name: "CutContour",
        model: ColorModel.SPOT,
        space: ColorSpace.CMYK,
        colorValue: [0, 100, 0, 0]
    });
}

function buildWall(cfg) {
    var wallW = cfg.panels * PANEL_W + (cfg.panels - 1) * GAP;   // reálná šířka stěny

    var doc = app.documents.add();
    doc.documentPreferences.properties = {
        pageWidth:        mm(wallW),
        pageHeight:       mm(GRAPHIC_H),
        facingPages:      false,
        pagesPerDocument: 1
    };
    doc.viewPreferences.properties = {
        horizontalMeasurementUnits: MeasurementUnits.MILLIMETERS,
        verticalMeasurementUnits:   MeasurementUnits.MILLIMETERS,
        rulerOrigin:                RulerOrigin.PAGE_ORIGIN
    };
    doc.documentPreferences.properties = { documentBleedUniformSize: true, documentBleedTopOffset: "0mm" };
    doc.marginPreferences.properties = { top: "0mm", left: "0mm", bottom: "0mm", right: "0mm" };
    try { doc.zeroPoint = [0, 0]; } catch (e) {}

    var page = doc.pages[0];
    cutContourSwatch(doc);

    // vrstvy zdola nahoru: podklad panelů → zákryty → grafika → kóty
    var lPanely  = makeLayer(doc, "1 · Panely a spáry (netiskne se)", UIColors.GRAY, false);
                   makeLayer(doc, "2 · Zákryty konstrukcí (netiskne se)", UIColors.RED, false);
    var lGrafika = makeLayer(doc, "3 · Grafika", UIColors.BLUE, false);
                   makeLayer(doc, "4 · Kóty pro montáž (netiskne se)", UIColors.GREEN, false);
    try { doc.layers.itemByName("Layer 1").remove(); } catch (e) {}
    try { doc.layers.itemByName("Vrstva 1").remove(); } catch (e) {}
    try { doc.activeLayer = lGrafika; } catch (e) {}   // ať se kreslí hned na správnou

    var black = doc.swatches.itemByName("Black");

    // obrysy jednotlivých panelů + vodítka na každé hraně
    for (var i = 0; i < cfg.panels; i++) {
        var x0 = i * (PANEL_W + GAP);          // levá hrana panelu (reálné mm)
        var x1 = x0 + PANEL_W;                 // pravá hrana panelu

        page.rectangles.add({
            itemLayer:      lPanely,
            geometricBounds: ["0mm", mm(x0), mm(GRAPHIC_H), mm(x1)],
            fillColor:      "None",
            strokeColor:    black,
            strokeWeight:   "0.25pt",
            strokeTint:     45
        });

        page.guides.add(undefined, { orientation: HorizontalOrVertical.VERTICAL, location: mm(x0) });
        page.guides.add(undefined, { orientation: HorizontalOrVertical.VERTICAL, location: mm(x1) });

        // popisek panelu — pod stránkou, ať neleze do kompozice
        var lab = page.textFrames.add({
            itemLayer:       lPanely,
            geometricBounds: [mm(GRAPHIC_H + 30), mm(x0), mm(GRAPHIC_H + 130), mm(x1)],
            contents:        "P" + (i + 1) + "\n" + PANEL_W + " × " + GRAPHIC_H + " mm"
        });
        lab.texts[0].properties = { pointSize: 7, justification: Justification.CENTER_ALIGN, fillColor: black, fillTint: 60 };
    }

    // Vodorovná vodítka — výšky nad PODLAHOU haly, přepočtené na pozici v grafické
    // ploše. Horní hrana grafiky je GRAPHIC_BASE + GRAPHIC_H nad podlahou.
    var levels = [
        { y: 760,  what: "deska pultu" },
        { y: 1200, what: "zábradlí exponátu" },
        { y: 1495, what: "spodní hrana TV" },
        { y: 1803, what: "horní hrana věže exponátu" },
        { y: 2205, what: "horní hrana TV" }
    ];
    var topAboveFloor = GRAPHIC_BASE + GRAPHIC_H;
    for (var j = 0; j < levels.length; j++) {
        var yDoc = topAboveFloor - levels[j].y;               // od horní hrany stránky
        if (yDoc < 0 || yDoc > GRAPHIC_H) { continue; }       // mimo grafickou plochu

        page.guides.add(undefined, {
            orientation: HorizontalOrVertical.HORIZONTAL,
            location:    mm(yDoc)
        });

        // popisek vlevo za stránkou, ať je jasné, co ta linka znamená
        var note = page.textFrames.add({
            itemLayer:       lPanely,
            geometricBounds: [mm(yDoc - 45), mm(-660), mm(yDoc + 45), mm(-40)],
            contents:        levels[j].y + " mm — " + levels[j].what
        });
        note.texts[0].properties = { pointSize: 7, justification: Justification.RIGHT_ALIGN, fillColor: black, fillTint: 70 };
        try { note.textFramePreferences.verticalJustification = VerticalJustification.CENTER_ALIGN; } catch (e) {}
    }

    // titulek dokumentu nad stránkou
    var head = page.textFrames.add({
        itemLayer:       lPanely,
        geometricBounds: [mm(-260), "0mm", mm(-40), mm(wallW)],
        contents:        "S4244 · " + cfg.note.toUpperCase() +
                         "  —  grafická plocha " + wallW + " × " + GRAPHIC_H + " mm" +
                         "  ·  měřítko 1:" + SCALE +
                         "  ·  panel " + PANEL_W + " mm, spára " + GAP + " mm"
    });
    head.texts[0].properties = { pointSize: 11, fillColor: black };

    return { doc: doc, wallW: wallW };
}

// ————————————————————————————— SPUŠTĚNÍ —————————————————————————————
var report = [];
for (var w = 0; w < WALLS.length; w++) {
    var r = buildWall(WALLS[w]);
    report.push("• " + WALLS[w].name + ": " + r.wallW + " × " + GRAPHIC_H + " mm  →  stránka " +
                (r.wallW / SCALE) + " × " + (GRAPHIC_H / SCALE) + " mm");
}

alert(
    "Hotovo — dokumenty jsou založené (neuložené).\n\n" +
    report.join("\n") + "\n\n" +
    "Měřítko 1:" + SCALE + " → co nakreslíš 10 mm, je ve skutečnosti " + (10 * SCALE) + " mm.\n\n" +
    "DÁL:\n" +
    "1. Kompozici rozvrhni tady, na vrstvu „3 · Grafika“.\n" +
    "2. Zákryty (věž, TV, krabice) si obkresli podle 3D modelu na vrstvu 2 —\n" +
    "   pod nimi grafika nebude vidět.\n" +
    "3. Finální data pro řez kresli v NOVÉM dokumentu 1:1, každý prvek zvlášť,\n" +
    "   obrys řezu v barvě „CutContour“ (spot, 0/100/0/0).\n" +
    "4. Prvek přes spáru rozděl na dva díly s mezerou " + GAP + " mm.\n\n" +
    "Pozor: celková délka delší stěny čeká na potvrzení GES (5940–5952 mm),\n" +
    "na spáry proto neumisťuj drobný text ani detaily loga.",
    "Příprava dokumentů S4244"
);
