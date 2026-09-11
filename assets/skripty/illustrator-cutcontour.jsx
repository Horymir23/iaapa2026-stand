/*
  ILLUSTRATOR — SLOŽENÍ DÍLŮ S ŘEZOVOU KONTUROU
  stánek S4244 (IAAPA Expo Europe 2026)
  ---------------------------------------------------------------------------------
  Navazuje na photoshop-orezove-cesty.jsx, který do složky uloží dvojice:
      <díl>.psd          rastr prvku (průhledné pozadí, CMYK)
      <díl>-cesta.ai     samotná ořezová cesta

  Tenhle skript projde složku, každou dvojici spojí do jednoho dokumentu,
  cestu obarví PŘÍMOU barvou „CutContour“ (0/100/0/0, tah bez výplně),
  rastr pošle dozadu a uloží PDF/X-4 připravené pro plotr.

  JAK SPUSTIT
    Illustrator → Soubor → Skripty → Jiný skript… → vyber tenhle soubor,
    pak ukaž na složku s díly. Illustrator nemusí mít nic otevřeného.

  PROČ TO NEJDE PŘÍMO Z PHOTOSHOPU
    Photoshop umí cestu buď zapéct jako ořezovou masku, nebo ji vyexportovat
    jako .ai — ale neumí ji uložit jako přímou barvu, kterou hledá RIP plotru.
    Proto ten mezikrok.
*/

#target illustrator

// ————————————————————————————— NASTAVENÍ —————————————————————————————
var SPOT_NAME   = "CutContour";   // název, na který reagují RIPy řezacích plotrů
var STROKE_PT   = 0.25;           // tloušťka tahu kontury
var PDF_PRESET  = "[PDF/X-4:2008]"; // když preset nenajde, použije se výchozí PDF
var KEEP_SOURCE = true;           // true = .psd a -cesta.ai zůstanou ve složce

// Které verze vyrobit. Standard v oboru je varianta se spot barvou (jedna strana);
// dvoustránkovou chtějí některá pracoviště, kde se řezová data zpracovávají zvlášť.
// Dokud tiskárna neřekne, co chce, vyrábíme obojí — stojí to jen pár sekund navíc.
var MAKE_SPOT   = true;           // <díl>-RIP.pdf     — 1 strana, rastr + kontura ve spot barvě
var MAKE_2PAGE  = true;           // <díl>-2str.pdf    — str. 1 rastr, str. 2 kontura (stejná registrace)
// ——————————————————————————————————————————————————————————————————————

main();

function main() {
    var dir = Folder.selectDialog("Složka s díly (.psd + -cesta.ai)");
    if (!dir) return;

    // Photoshop exportuje cesty ve starém formátu AI bez kreslicích pláten, takže
    // se Illustrator u každého souboru ptá „Převést na kreslicí plátna“ a zastaví
    // tím skript. Potlačíme dialogy — použijí se výchozí volby (oblasti oříznutí).
    var oldLevel = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    try {
        run(dir);
    } finally {
        app.userInteractionLevel = oldLevel;
    }
}

function run(dir) {

    var pathFiles = dir.getFiles(function (f) {
        return f instanceof File && /-cesta\.ai$/i.test(f.name);
    });

    if (!pathFiles.length) {
        alert("Ve složce nejsou žádné soubory „*-cesta.ai“.\n\n" +
              "Nejdřív pusť photoshop-orezove-cesty.jsx nad PSB stěny.", SPOT_NAME);
        return;
    }

    var done = [], skipped = [], failed = [], already = 0;

    // Předem si načteme File objekty všech PSD. Skládat cestu ze stringu je
    // nespolehlivé — macOS vrací názvy v rozložené podobě (NFD) a Illustrator
    // pak hlásí „Unable to set placed item's file“, i když soubor existuje.
    var psdMap = {};
    var psdList = dir.getFiles(function (f) { return f instanceof File && /\.psd$/i.test(f.name); });
    for (var m = 0; m < psdList.length; m++) {
        psdMap[decodeURI(psdList[m].name).replace(/\.psd$/i, "")] = psdList[m];
    }

    for (var i = 0; i < pathFiles.length; i++) {
        var aiFile = pathFiles[i];
        var base = decodeURI(aiFile.name).replace(/-cesta\.ai$/i, "");
        var psdFile = psdMap[base];

        // Už hotové přeskočíme — díky tomu se skript dá pustit opakovaně,
        // dokud nedojede zbytek (Illustratoru po pár desítkách umístění
        // dochází paměť a další soubor už neumístí).
        var outMain = new File(dir.fsName + "/" + base + (MAKE_SPOT ? "-RIP.pdf" : "-2str.pdf"));
        if (outMain.exists) { already++; continue; }

        if (!psdFile || !psdFile.exists) { skipped.push(base + " (chybí .psd)"); continue; }

        var doc = null;
        try {
            doc = app.open(aiFile);

            // --- přímá barva pro řez ---
            var spot = null;
            try { spot = doc.spots.getByName(SPOT_NAME); }
            catch (e) {
                spot = doc.spots.add();
                spot.name = SPOT_NAME;
                spot.colorType = ColorModel.SPOT;
                var cmyk = new CMYKColor();
                cmyk.cyan = 0; cmyk.magenta = 100; cmyk.yellow = 0; cmyk.black = 0;
                spot.color = cmyk;
            }
            var spotColor = new SpotColor();
            spotColor.spot = spot;
            spotColor.tint = 100;

            // --- obarvit všechny cesty v dokumentu ---
            var n = 0;
            for (var p = 0; p < doc.pathItems.length; p++) {
                var pi = doc.pathItems[p];
                pi.filled = false;
                pi.stroked = true;
                pi.strokeColor = spotColor;
                pi.strokeWidth = STROKE_PT;
                pi.name = SPOT_NAME;
                n++;
            }
            if (n === 0) { failed.push(base + " (v .ai není žádná cesta)"); doc.close(SaveOptions.DONOTSAVECHANGES); continue; }

            // --- umístit rastr a zarovnat na kreslicí plátno ---
            var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect; // [l, t, r, b]
            var placed = null, lastErr = null;
            for (var attempt = 0; attempt < 2 && !placed; attempt++) {
                try {
                    var pi2 = doc.placedItems.add();
                    pi2.file = psdFile;
                    placed = pi2;
                } catch (e2) {
                    lastErr = e2;
                    try { app.redraw(); } catch (e3) {}   // dej Illustratoru chvíli uvolnit paměť
                }
            }
            if (!placed) throw lastErr;

            placed.position = [ab[0], ab[1]];
            placed.width  = ab[2] - ab[0];
            placed.height = ab[1] - ab[3];
            placed.zOrder(ZOrderMethod.SENDTOBACK);

            // Vložit rastr natvrdo do dokumentu — Illustrator tím pustí odkaz na
            // soubor, což je právě ten zdroj, který po pár dílech dochází.
            try { placed.embed(); } catch (e4) {}

            // --- verze A: jedna strana, kontura jako přímá barva (standard) ---
            if (MAKE_SPOT) {
                var pdfFile = new File(dir.fsName + "/" + base + "-RIP.pdf");
                var opts = new PDFSaveOptions();
                try { opts.pDFPreset = PDF_PRESET; } catch (e) {}
                opts.preserveEditability = false;
                doc.saveAs(pdfFile, opts);
            }

            // --- verze B: dvě strany — 1. rastr, 2. kontura ---
            // Druhé plátno leží PŘESNĚ o svou šířku vedle prvního, takže obě strany
            // mají shodný počátek i rozměr a řez sedne na tisk bez posunu.
            if (MAKE_2PAGE) {
                var W = ab[2] - ab[0], H = ab[1] - ab[3];
                doc.artboards.add([ab[0] + W, ab[1], ab[2] + W, ab[3]]);

                for (var q = doc.pathItems.length - 1; q >= 0; q--) {
                    var orig = doc.pathItems[q];
                    var copy = orig.duplicate();
                    copy.translate(W, 0);      // na druhé plátno
                    orig.remove();             // ze strany 1 kontura zmizí
                }

                var twoFile = new File(dir.fsName + "/" + base + "-2str.pdf");
                var opts2 = new PDFSaveOptions();
                try { opts2.pDFPreset = PDF_PRESET; } catch (e) {}
                opts2.preserveEditability = false;
                opts2.saveMultipleArtboards = true;
                opts2.artboardRange = "";      // prázdné = všechna plátna
                doc.saveAs(twoFile, opts2);
            }

            done.push(base + "  (cest: " + n + ")");
            doc.close(SaveOptions.DONOTSAVECHANGES);

            if (!KEEP_SOURCE) {
                try { aiFile.remove(); psdFile.remove(); } catch (e) {}
            }
        } catch (err) {
            failed.push(base + " — " + err);
            if (doc) { try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e) {} }
        }
    }

    var msg = "Hotovo — složeno " + done.length + " dílů" +
              (already ? ", " + already + " už bylo hotových (přeskočeno)" : "") + ".\n\n" +
              (done.length ? done.join("\n") + "\n\n" : "") +
              ((failed.length || skipped.length)
                 ? "⟳ SPUSŤ SKRIPT ZNOVU na stejnou složku — hotové díly přeskočí\n" +
                   "   a bude pokračovat tam, kde skončil.\n\n" : "") +
              "Výstup ve stejné složce:\n" +
              (MAKE_SPOT  ? "  • <díl>-RIP.pdf   1 strana, kontura jako přímá barva (standard)\n" : "") +
              (MAKE_2PAGE ? "  • <díl>-2str.pdf  2 strany: 1. rastr, 2. kontura\n" : "") +
              "Kontura: přímá barva „" + SPOT_NAME + "“ 0/100/0/0, tah " + STROKE_PT + " pt, bez výplně.\n\n" +
              "ZKONTROLUJ NA PRVNÍM DÍLU:\n" +
              "• leží rastr přesně pod konturou (zarovnání na plátno)?\n" +
              "• je kontura v Okno → Vzorník opravdu jako PŘÍMÁ barva?\n" +
              "• v Okno → Výstup na výtažky se má " + SPOT_NAME + " ukázat jako samostatný výtažek";

    if (skipped.length) msg += "\n\nPŘESKOČENO:\n" + skipped.join("\n");
    if (failed.length)  msg += "\n\n⚠ CHYBY:\n" + failed.join("\n");

    alert(msg, SPOT_NAME);
}
