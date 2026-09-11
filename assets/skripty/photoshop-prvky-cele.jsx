/*
  PHOTOSHOP — CELÉ PRVKY JAKO NÁLEPKY (BEZ DĚLENÍ PO PANELECH)
  stánek S4244 (IAAPA Expo Europe 2026)
  ---------------------------------------------------------------------------------
  Z otevřeného PSB celé stěny vyrobí pro KAŽDÝ PRVEK JEDEN kus — celý, nedělený.
  Předpoklad: prvek se nalepí vcelku (přes spáry) a spáry se případně prořežou
  až na zdi. Dělenou variantu dělá photoshop-orezove-cesty.jsx.

  Výstup na prvek (stejné dvojice jako u dělené verze):
      <stěna>-cely-<prvek>.psd        rastr s průhledností, ořez na obsah prvku
      <stěna>-cely-<prvek>-cesta.ai   ořezová cesta
  Dvojice pak zpracuje illustrator-cutcontour.jsx (beze změny) → -RIP.pdf
  (kontura jako přímá barva) i -2str.pdf (str. 1 rastr, str. 2 kontura).

  DOPORUČENÍ: ukládej do NOVÉ složky (např. „Prvky celé“), ať se dvojice
  nemíchají s díly dělenými po panelech.

  JAK SPUSTIT
    1. otevři v Photoshopu PSB stěny (verze bez záře, s prvky ve vrstvách)
    2. Soubor → Skripty → Načíst… → tenhle soubor
    3. vyber cílovou složku
*/

#target photoshop

// ————————————————————————————— NASTAVENÍ —————————————————————————————
var MARGIN_MM  = -0.7;   // KLADNÉ = bílý kiss-cut okraj (měkké přechody), standard 2–3 mm.
                         // NULA = řez přesně po hraně motivu.
                         // ZÁPORNÉ = řez dovnitř motivu (ostrá hrana, bez bílého lemu).
var TOLERANCE  = 3.0;    // tolerance cesty v px (2–5); nižší = tisíce bodů
var MAX_POINTS = 600;    // nad tolik bodů skript varuje
var PAD_MM     = 5;      // volný okraj plátna kolem prvku (u kladného MARGIN_MM
                         //   se automaticky zvětší, aby se bílý lem vešel celý)
var ROLL_MM    = 1370;   // běžná šířka role fólie — širší prvek skript jen OZNAČÍ
                         //   (tisknout ho vcelku umí jen tiskárna se širším médiem)
var LIMIT      = 0;      // 0 = všechny prvky, N = jen prvních N (vzorek)
var SKIP_NAMES = ["výplň", "vyplnary", "vyplň", "background", "pozadí", "pozadi"];
// ——————————————————————————————————————————————————————————————————————

if (app.documents.length === 0) {
    alert("Nejdřív otevři PSB stěny s prvky ve vrstvách.", "Celé prvky");
} else {
    main();
}

// ---------- výběr = průhlednost aktivní vrstvy ----------
function loadLayerTransparency() {
    var d = new ActionDescriptor();
    var r = new ActionReference();
    r.putProperty(charIDToTypeID("Chnl"), charIDToTypeID("fsel"));
    d.putReference(charIDToTypeID("null"), r);
    var r2 = new ActionReference();
    r2.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Trsp"));
    d.putReference(charIDToTypeID("T   "), r2);
    executeAction(charIDToTypeID("setd"), d, DialogModes.NO);
}

function whiteCMYK() {
    var c = new SolidColor();
    c.cmyk.cyan = 0; c.cmyk.magenta = 0; c.cmyk.yellow = 0; c.cmyk.black = 0;
    return c;
}

function isSkipped(name) {
    var n = name.toLowerCase();
    for (var i = 0; i < SKIP_NAMES.length; i++) {
        if (n.indexOf(SKIP_NAMES[i]) !== -1) return true;
    }
    return false;
}

function safeName(s) {
    // macOS ukládá názvy v rozložené podobě (NFD) — nejdřív pryč kombinující znaky
    s = s.replace(/[̀-ͯ]/g, "");
    return s.replace(/[ěéĚÉ]/g, "e").replace(/[šŠ]/g, "s").replace(/[čČ]/g, "c")
            .replace(/[řŘ]/g, "r").replace(/[žŽ]/g, "z").replace(/[ýÝ]/g, "y")
            .replace(/[áÁ]/g, "a").replace(/[íÍ]/g, "i").replace(/[úůÚŮ]/g, "u")
            .replace(/[óÓ]/g, "o").replace(/[ďĎťŤňŇ]/g, "d")
            .replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function firstArtLayer(container) {
    for (var i = 0; i < container.layers.length; i++) {
        var L = container.layers[i];
        if (L.typename === "ArtLayer") return L;
        var inner = firstArtLayer(L);
        if (inner) return inner;
    }
    return null;
}

function collectArtLayers(container, out) {
    for (var i = 0; i < container.layers.length; i++) {
        var L = container.layers[i];
        if (L.typename === "ArtLayer") out.push(L);
        else collectArtLayers(L, out);
    }
    return out;
}

function countPathPoints(doc) {
    try {
        var p = doc.pathItems[0], n = 0;
        for (var i = 0; i < p.subPathItems.length; i++) n += p.subPathItems[i].pathPoints.length;
        return n;
    } catch (e) { return -1; }
}

function main() {
    var src = app.activeDocument;
    var oldUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;

    var DPI = src.resolution;                 // čte se z dokumentu (150)
    var K = DPI / 25.4;
    var MARGIN_PX = Math.round(MARGIN_MM * K);
    var PAD_PX = Math.round(Math.max(PAD_MM, MARGIN_MM > 0 ? MARGIN_MM + 2 : 0) * K);

    var docW = src.width.as("px"), docH = src.height.as("px");
    var outDir = Folder.selectDialog("Kam uložit CELÉ prvky? (doporučeno: nová složka)");
    if (!outDir) { app.preferences.rulerUnits = oldUnits; return; }

    var wallBase = safeName(src.name.replace(/\.[^.]+$/, "")) + "-cely";
    var report = [], warns = [], made = 0;

    var jobs = [], all = collectArtLayers(src, []);
    for (var i = 0; i < all.length; i++) {
        if (!isSkipped(all[i].name)) jobs.push(all[i].name);
    }
    if (jobs.length === 0) {
        app.preferences.rulerUnits = oldUnits;
        alert("Nenašel jsem žádnou vrstvu prvku (vrstvy „výplň/pozadí“ se přeskakují).", "Celé prvky");
        return;
    }

    for (var j = 0; j < jobs.length; j++) {
        if (LIMIT > 0 && made >= LIMIT) break;
        var layerName = jobs[j];

        var solo = src.duplicate();
        app.activeDocument = solo;
        var keep = null, cand = collectArtLayers(solo, []);
        for (var c = 0; c < cand.length; c++) {
            if (cand[c].name === layerName) { keep = cand[c]; break; }
        }
        if (!keep) { solo.close(SaveOptions.DONOTSAVECHANGES); continue; }

        try { keep.move(solo, ElementPlacement.PLACEATBEGINNING); } catch (e) {}
        for (var k = solo.layers.length - 1; k >= 0; k--) {
            if (solo.layers[k] !== keep) {
                try { solo.layers[k].remove(); } catch (e) {}
            }
        }
        try { keep.visible = true; } catch (e) {}

        try {
            // ořez na obsah prvku + volný okraj, sevřeno do plátna (co je mimo
            // stěnu, se fyzicky nalepit nedá — tiskne se jen viditelná část)
            var b = keep.bounds;
            var x0 = Math.max(0,    Math.floor(b[0].as("px")) - PAD_PX);
            var y0 = Math.max(0,    Math.floor(b[1].as("px")) - PAD_PX);
            var x1 = Math.min(docW, Math.ceil(b[2].as("px")) + PAD_PX);
            var y1 = Math.min(docH, Math.ceil(b[3].as("px")) + PAD_PX);
            if (x1 - x0 < 4 || y1 - y0 < 4) throw "prvek nemá na plátně žádný obsah";
            solo.crop([x0, y0, x1, y1]);

            var el = firstArtLayer(solo);
            if (!el) throw "v dokumentu nezůstala žádná kreslicí vrstva";
            solo.activeLayer = el;
            loadLayerTransparency();

            if (MARGIN_PX > 0) {
                try { solo.selection.expand(MARGIN_PX); } catch (e) {}
                var white = solo.artLayers.add();
                white.name = "bily okraj";
                white.move(el, ElementPlacement.PLACEAFTER);
                solo.activeLayer = white;
                solo.selection.fill(whiteCMYK());
                solo.activeLayer = el;
            } else if (MARGIN_PX < 0) {
                try { solo.selection.contract(-MARGIN_PX); } catch (e) {}
            }

            solo.selection.makeWorkPath(TOLERANCE);
            try { solo.pathItems[0].name = "CutContour"; } catch (e) {}
            var pts = countPathPoints(solo);
            solo.selection.deselect();

            try {
                if (solo.layers.length > 1) solo.mergeVisibleLayers();
            } catch (e) {}

            var wMM = Math.round((x1 - x0) / K), hMM = Math.round((y1 - y0) / K);
            var fname = wallBase + "-" + safeName(layerName);

            var psdFile = new File(outDir.fsName + "/" + fname + ".psd");
            var psdOpts = new PhotoshopSaveOptions();
            psdOpts.embedColorProfile = true;
            psdOpts.layers = false;
            psdOpts.alphaChannels = false;
            solo.saveAs(psdFile, psdOpts, true, Extension.LOWERCASE);

            var aiFile = new File(outDir.fsName + "/" + fname + "-cesta.ai");
            var aiOpts = new ExportOptionsIllustrator();
            try {
                aiOpts.path = IllustratorPathType.NAMEDPATH;
                aiOpts.pathName = "CutContour";
            } catch (e) {
                aiOpts.path = IllustratorPathType.ALLPATHS;
            }
            solo.exportDocument(aiFile, ExportType.ILLUSTRATORPATHS, aiOpts);

            var over = (wMM > ROLL_MM && hMM > ROLL_MM);
            report.push(layerName + "  —  " + wMM + " × " + hMM + " mm, bodů cesty: " + pts +
                        (over ? "  ⚠ ŠIRŠÍ NEŽ ROLE" : ""));
            if (pts > MAX_POINTS) {
                warns.push("• " + fname + ": cesta má " + pts + " bodů (limit " + MAX_POINTS + ") → zvyš TOLERANCE");
            }
            if (over) {
                warns.push("• " + fname + ": " + wMM + " × " + hMM + " mm — v OBOU směrech víc než role " +
                           ROLL_MM + " mm; vcelku ho vytiskne jen tiskárna se širším médiem, jinak ho stejně rozdělí");
            }
            made++;
        } catch (err) {
            warns.push("• " + layerName + ": " + err);
        }
        solo.close(SaveOptions.DONOTSAVECHANGES);
    }

    app.preferences.rulerUnits = oldUnits;
    app.activeDocument = src;

    var msg = "Hotovo — vyrobeno " + made + " celých prvků do:\n" + outDir.fsName + "\n\n" +
              report.join("\n") + "\n\n" +
              (MARGIN_MM > 0 ? "Bílý okraj: " + MARGIN_MM + " mm"
                             : (MARGIN_MM < 0 ? "Řez " + (-MARGIN_MM) + " mm dovnitř motivu (bez bílého lemu)"
                                              : "Řez přesně po hraně motivu")) +
              ", tolerance cesty " + TOLERANCE + " px.\n\n" +
              "DÁL: na tuhle složku pusť illustrator-cutcontour.jsx —\n" +
              "vyrobí <prvek>-RIP.pdf (přímá barva) i <prvek>-2str.pdf (rastr + cesta).\n\n" +
              "POZOR: prvky se lepí VCELKU přes spáry — spára se pak prořezává na zdi\n" +
              "(vodicí lišta do spáry, řez do 2–3 h po aplikaci, okraj nechat v líci hrany).";

    if (warns.length) msg += "\n\n⚠ UPOZORNĚNÍ:\n" + warns.join("\n");
    alert(msg, "Celé prvky S4244");
}
