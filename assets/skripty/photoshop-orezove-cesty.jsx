/*
  PHOTOSHOP — PRVKY JAKO NÁLEPKY S OŘEZOVOU CESTOU
  stánek S4244 (IAAPA Expo Europe 2026)
  ---------------------------------------------------------------------------------
  Z otevřeného PSB celé stěny vyrobí pro každý prvek a každý panel, do kterého
  prvek zasahuje, jeden soubor: prvek + bílý okraj + uzavřená ořezová cesta.

  CO SKRIPT DĚLÁ na jeden díl
    1. osamostatní vrstvu prvku (ostatní včetně bílého podkladu zahodí)
    2. ořízne na panel (996 × 2484 mm = čistý formát 986 × 2474 + spadávka 5)
    3. z průhlednosti vrstvy udělá výběr a rozšíří ho o bílý okraj
    4. pod prvek vloží bílou výplň v rozsahu rozšířeného výběru
    5. z výběru vytvoří cestu se zadanou tolerancí a pojmenuje ji „CutContour“
    6. uloží PDF (cesta se zachová) a vypíše počet bodů cesty

  CO MUSÍŠ DODĚLAT RUČNĚ
    Photoshop cestu uloží jako ořezovou, NE jako přímou barvu. V Illustratoru
    proto PDF otevři, cestu obarvi přímou barvou „CutContour“ (0/100/0/0),
    tah bez výplně, a ulož PDF/X-4. Bez toho ji plotr nenajde.

  JAK SPUSTIT
    1. otevři v Photoshopu „Delší zeď.psb“ (nebo „Kratší zeď.psb“)
    2. Soubor → Skripty → Načíst… → tenhle soubor
    3. skript se zeptá, kam ukládat

  NEŽ TO PUSTÍŠ NA VŠECHNO
    Nech LIMIT = 1. Vyrobí to jeden díl jako vzorek, na kterém si ověříš okraj,
    toleranci cesty i celý postup v Illustratoru. Teprve pak LIMIT = 0 (= vše).

  POZOR NA PAMĚŤ
    Zdroj má ~1,5 GB. Skript duplikuje dokument jednou na prvek a pak lehčeji
    na každý panel. Počítej s desítkami GB na odkládacím disku a nech to běžet.
*/

#target photoshop

// ————————————————————————————— NASTAVENÍ —————————————————————————————
var MARGIN_MM  = -0.7;   // KLADNÉ číslo = bílý okraj kolem prvku (kiss-cut), pro prvky
                         //   s měkkým přechodem do průhledna; standard 2–3 mm.
                         // NULA = cesta přesně po hraně motivu.
                         // ZÁPORNÉ = řez dovnitř motivu („inset“) — pro prvky s OSTROU
                         //   hranou. Tolerance plotru je ±0,5 mm, takže −0,7 mm zajistí,
                         //   že se nikde neobjeví bílý vlas; ubere to 0,7 mm z hrany,
                         //   což na hladké kostce nikdo nepozná. Bílá výplň se v tomhle
                         //   režimu NEPŘIDÁVÁ, takže na panelu není vidět žádný lem.
var TOLERANCE  = 3.0;    // tolerance cesty v px (2–5). Nižší = tisíce bodů, plotr to odmítne.
var MAX_POINTS = 600;    // nad tolik bodů skript varuje — cestu je potřeba zjednodušit
var PANEL_W_MM = 986;    // čistá šířka panelu
var PANEL_H_MM = 2474;   // čistá výška grafické plochy
var GAP_MM     = 7;      // spára mezi panely
var BLEED_MM   = 5;      // spadávka v dokumentu (musí odpovídat okraji v PSB)
var LIMIT      = 0;      // 0 = všechny díly, N = jen prvních N (vzorek)
var SKIP_NAMES = ["výplň", "vyplnary", "vyplň", "background", "pozadí", "pozadi"];
// ——————————————————————————————————————————————————————————————————————

var DPI = 150;
var K = DPI / 25.4;                       // mm → px
var PITCH_PX  = (PANEL_W_MM + GAP_MM) * K;
var CROP_W_PX = Math.round((PANEL_W_MM + 2 * BLEED_MM) * K);   // 5882
var CROP_H_PX = Math.round((PANEL_H_MM + 2 * BLEED_MM) * K);   // 14669
var MARGIN_PX = Math.round(MARGIN_MM * K);

if (app.documents.length === 0) {
    alert("Nejdřív otevři PSB celé stěny (Delší zeď.psb nebo Kratší zeď.psb).", "Ořezové cesty");
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
    // macOS ukládá názvy v ROZLOŽENÉ podobě (NFD): „í“ je „i“ + kombinující čárka.
    // Bez tohohle kroku projde základní písmeno a z háčků a čárek se stanou
    // pomlčky — z „Kratší zeď“ vznikne „Krats-i-zed“ místo „Kratsi-zed“.
    s = s.replace(/[̀-ͯ]/g, "");
    return s.replace(/[ěéĚÉ]/g, "e").replace(/[šŠ]/g, "s").replace(/[čČ]/g, "c")
            .replace(/[řŘ]/g, "r").replace(/[žŽ]/g, "z").replace(/[ýÝ]/g, "y")
            .replace(/[áÁ]/g, "a").replace(/[íÍ]/g, "i").replace(/[úůÚŮ]/g, "u")
            .replace(/[óÓ]/g, "o").replace(/[ďĎťŤňŇ]/g, "d")
            .replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

// první kreslicí vrstva, i kdyby byla zanořená ve skupině
function firstArtLayer(container) {
    for (var i = 0; i < container.layers.length; i++) {
        var L = container.layers[i];
        if (L.typename === "ArtLayer") return L;
        var inner = firstArtLayer(L);
        if (inner) return inner;
    }
    return null;
}

// všechny kreslicí vrstvy včetně těch ve skupinách
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

    var docW = src.width.as("px"), docH = src.height.as("px");
    var n = Math.round((docW - 2 * BLEED_MM * K + GAP_MM * K) / PITCH_PX);

    if (Math.abs(docH - CROP_H_PX) > 2 || n < 1) {
        app.preferences.rulerUnits = oldUnits;
        alert("Rozměry dokumentu nesedí.\n\nDokument: " + Math.round(docW) + " × " + Math.round(docH) +
              " px\nOčekávaná výška: " + CROP_H_PX + " px, panelů: " + n +
              "\n\nZkontroluj spadávku v nastavení skriptu.", "Ořezové cesty");
        return;
    }

    var outDir = Folder.selectDialog("Kam uložit díly s ořezovou cestou?");
    if (!outDir) { app.preferences.rulerUnits = oldUnits; return; }

    var wallBase = safeName(src.name.replace(/\.[^.]+$/, ""));
    var report = [], warns = [], made = 0;

    // seznam vrstev ke zpracování — i ze skupin, bez podkladových výplní
    var jobs = [], all = collectArtLayers(src, []);
    for (var i = 0; i < all.length; i++) {
        if (!isSkipped(all[i].name)) jobs.push(all[i].name);
    }
    if (jobs.length === 0) {
        app.preferences.rulerUnits = oldUnits;
        alert("Nenašel jsem žádnou vrstvu prvku.\n\nVrstvy s názvem obsahujícím " +
              "„výplň“ nebo „pozadí“ se přeskakují — zkontroluj pojmenování.", "Ořezové cesty");
        return;
    }

    for (var j = 0; j < jobs.length; j++) {
        var layerName = jobs[j];

        // 1) osamostatnit vrstvu v duplikátu
        var solo = src.duplicate();
        app.activeDocument = solo;
        var keep = null, cand = collectArtLayers(solo, []);
        for (var c = 0; c < cand.length; c++) {
            if (cand[c].name === layerName) { keep = cand[c]; break; }
        }
        if (!keep) { solo.close(SaveOptions.DONOTSAVECHANGES); continue; }

        // vytáhnout vrstvu z případné skupiny nahoru, pak smazat všechno ostatní
        try { keep.move(solo, ElementPlacement.PLACEATBEGINNING); } catch (e) {}
        for (var k = solo.layers.length - 1; k >= 0; k--) {
            if (solo.layers[k] !== keep) {
                try { solo.layers[k].remove(); } catch (e) {}
            }
        }
        try { keep.visible = true; } catch (e) {}

        var b = keep.bounds;              // [left, top, right, bottom] v px
        var bx0 = b[0].as("px"), bx1 = b[2].as("px");

        for (var p = 0; p < n; p++) {
            if (LIMIT > 0 && made >= LIMIT) break;

            var x0 = Math.round(p * PITCH_PX);
            var x1 = x0 + CROP_W_PX;
            if (bx1 <= x0 || bx0 >= x1) continue;        // prvek na tento panel nezasahuje

            var piece = solo.duplicate();
            app.activeDocument = piece;
            try {
                piece.crop([x0, 0, x1, CROP_H_PX]);

                var el = firstArtLayer(piece);
                if (!el) throw "v dílu nezůstala žádná kreslicí vrstva";
                piece.activeLayer = el;
                loadLayerTransparency();

                // kladný okraj = rozšířit a podložit bílou; záporný = řez dovnitř motivu
                if (MARGIN_PX > 0) {
                    try { piece.selection.expand(MARGIN_PX); } catch (e) {}
                    var white = piece.artLayers.add();
                    white.name = "bily okraj";
                    white.move(el, ElementPlacement.PLACEAFTER);
                    piece.activeLayer = white;
                    piece.selection.fill(whiteCMYK());
                    piece.activeLayer = el;
                } else if (MARGIN_PX < 0) {
                    try { piece.selection.contract(-MARGIN_PX); } catch (e) {}
                }

                // cesta z výběru
                piece.selection.makeWorkPath(TOLERANCE);
                try { piece.pathItems[0].name = "CutContour"; } catch (e) {}
                var pts = countPathPoints(piece);
                piece.selection.deselect();

                // Sloučit jen když je co slučovat — „Sloučení viditelných“ není
                // dostupné nad jedinou vrstvou (režim řezu dovnitř bílou nepřidává).
                try {
                    if (piece.layers.length > 1) piece.mergeVisibleLayers();
                } catch (e) {}

                var fname = wallBase + "-P" + (p + 1) + "-" + safeName(layerName);

                // 1) RASTR jako PSD — spolehlivě nese průhlednost i CMYK profil
                //    a Illustrator ho umí umístit. (PDF z Photoshopu Illustrator
                //    hlásí jako „neznámý obrazový konstrukt“.)
                var psdFile = new File(outDir.fsName + "/" + fname + ".psd");
                var psdOpts = new PhotoshopSaveOptions();
                psdOpts.embedColorProfile = true;
                psdOpts.layers = false;
                psdOpts.alphaChannels = false;
                piece.saveAs(psdFile, psdOpts, true, Extension.LOWERCASE);

                // 2) CESTA zvlášť do .ai — Photoshop PDF obyčejné cesty NEUKLÁDÁ,
                //    přenese se jen ořezová maska. Tohle je jediná spolehlivá cesta.
                var aiFile = new File(outDir.fsName + "/" + fname + "-cesta.ai");
                var aiOpts = new ExportOptionsIllustrator();
                try {
                    aiOpts.path = IllustratorPathType.NAMEDPATH;
                    aiOpts.pathName = "CutContour";
                } catch (e) {
                    aiOpts.path = IllustratorPathType.ALLPATHS;
                }
                piece.exportDocument(aiFile, ExportType.ILLUSTRATORPATHS, aiOpts);

                report.push("P" + (p + 1) + " · " + layerName + "  —  bodů cesty: " + pts);
                if (pts > MAX_POINTS) {
                    warns.push("• " + fname + ": cesta má " + pts + " bodů (limit " + MAX_POINTS +
                               ") → zvyš TOLERANCE");
                }
                made++;
            } catch (e) {
                warns.push("• " + layerName + " P" + (p + 1) + ": " + e);
            }
            piece.close(SaveOptions.DONOTSAVECHANGES);
        }

        solo.close(SaveOptions.DONOTSAVECHANGES);
        if (LIMIT > 0 && made >= LIMIT) break;
    }

    app.preferences.rulerUnits = oldUnits;
    app.activeDocument = src;

    var msg = "Hotovo — vyrobeno " + made + " dílů do:\n" + outDir.fsName + "\n\n" +
              report.join("\n") + "\n\n" +
              "Každý díl: " + CROP_W_PX + " × " + CROP_H_PX + " px = " +
              (PANEL_W_MM + 2 * BLEED_MM) + " × " + (PANEL_H_MM + 2 * BLEED_MM) + " mm\n" +
              (MARGIN_MM > 0 ? "Bílý okraj: " + MARGIN_MM + " mm (" + MARGIN_PX + " px)"
                             : (MARGIN_MM < 0 ? "Řez dovnitř motivu: " + (-MARGIN_MM) + " mm (bez bílého okraje)"
                                              : "Řez přesně po hraně motivu")) +
              ", tolerance cesty " + TOLERANCE + " px\n\n" +
              "DÁL V ILLUSTRATORU: otevři PDF, cestu obarvi PŘÍMOU barvou\n" +
              "„CutContour“ (0/100/0/0), tah bez výplně, ulož PDF/X-4.\n\n" +
              (LIMIT > 0 ? "POZOR: LIMIT = " + LIMIT + ", tohle je jen vzorek.\n" +
                           "Pro všechny díly nastav LIMIT = 0.\n\n" : "") +
              "Pozn.: díl končící na hraně panelu má cestu vedenou po hraně —\n" +
              "tam se řeže rovně podél spáry, ne po obrysu prvku.";

    if (warns.length) msg += "\n\n⚠ UPOZORNĚNÍ:\n" + warns.join("\n");
    alert(msg, "Ořezové cesty S4244");
}
