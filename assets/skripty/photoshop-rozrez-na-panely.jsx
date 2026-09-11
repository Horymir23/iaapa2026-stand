/*
  PHOTOSHOP — ROZŘEZÁNÍ CELOSTĚNOVÉ GRAFIKY NA PANELY
  stánek S4244 (IAAPA Expo Europe 2026)
  ---------------------------------------------------------------------------------
  Vezme hotový PSB celé stěny a uloží z něj jeden soubor na každý panel:
  čistý formát 986 × 2474 mm + spadávka 5 mm dokola = 996 × 2484 mm.

  Spadávka na DĚLICÍCH hranách není žádný trik — protože je motiv celoplošný,
  přesah je prostě pokračování grafiky do spáry. Přesně to tiskárna potřebuje,
  aby po řezu na formát nezůstal na hraně bílý vlas.

  JAK SPUSTIT
    1. otevři v Photoshopu „Delší zeď.psb“ (nebo „Kratší zeď.psb“)
    2. Soubor → Skripty → Načíst… → vyber tenhle soubor
    3. skript se sám zeptá, kam ukládat

  POZOR NA PAMĚŤ
    Zdroj má 2 GB a 516 Mpx. Skript pro každý panel duplikuje dokument, takže
    Photoshop potřebuje volné místo na odkládací disk (počítej 20+ GB) a chvíli
    to trvá. Nech to běžet a nepracuj mezitím v Photoshopu.

  ROZMĚRY vycházejí z data/stand-spec.json (stav k 24. 8. 2026): panel 986 mm,
  spára 7 mm (obojí potvrzeno GES), počet panelů 6 / 3. CELKOVÁ délka delší stěny
  je zatím odhad → pozice řezů se mohou o pár mm změnit, viz open_questions.
*/

#target photoshop

// ————————————————————————————— NASTAVENÍ —————————————————————————————
var PANEL_W = 986;    // čistá šířka panelu (mm)
var PANEL_H = 2474;   // čistá výška grafické plochy (mm)
var GAP     = 7;      // spára mezi panely (mm)
var BLEED   = 5;      // spadávka dokola (mm) — musí odpovídat okraji v dokumentu
var FORMAT  = "TIF";  // "TIF" (doporučeno) nebo "JPG"
var JPG_Q   = 12;     // kvalita JPG 1–12, uplatní se jen u FORMAT = "JPG"
// ——————————————————————————————————————————————————————————————————————

var PITCH   = PANEL_W + GAP;
var CROP_W  = PANEL_W + 2 * BLEED;    // 996 mm
var CROP_H  = PANEL_H + 2 * BLEED;    // 2484 mm

if (app.documents.length === 0) {
    alert("Nejdřív otevři PSB celé stěny (Delší zeď.psb nebo Kratší zeď.psb).", "Rozřez na panely");
} else {
    main();
}

function main() {
    var src = app.activeDocument;

    // jednotky na mm, ať se dá počítat v milimetrech
    var oldUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.MM;

    var docW = src.width.as("mm");
    var docH = src.height.as("mm");

    // kolik panelů se do šířky vejde: docW = n*PANEL_W + (n-1)*GAP + 2*BLEED
    var n = Math.round((docW - 2 * BLEED + GAP) / PITCH);
    var expectedW = n * PANEL_W + (n - 1) * GAP + 2 * BLEED;

    if (Math.abs(docW - expectedW) > 1 || Math.abs(docH - (PANEL_H + 2 * BLEED)) > 1) {
        app.preferences.rulerUnits = oldUnits;
        alert("Rozměry dokumentu nesedí na očekávané hodnoty.\n\n" +
              "Dokument:  " + Math.round(docW) + " × " + Math.round(docH) + " mm\n" +
              "Očekáváno: " + expectedW + " × " + (PANEL_H + 2 * BLEED) + " mm" +
              "  (" + n + " panelů + spadávka " + BLEED + " mm)\n\n" +
              "Zkontroluj spadávku a počet panelů v nastavení skriptu.", "Rozřez na panely");
        return;
    }

    var outDir = Folder.selectDialog("Kam uložit rozřezané panely?");
    if (!outDir) { app.preferences.rulerUnits = oldUnits; return; }

    // základ názvu ze zdrojového souboru, bez diakritiky a mezer
    var base = src.name.replace(/\.[^.]+$/, "");
    base = base.replace(/[ěéĚÉ]/g, "e").replace(/[šŠ]/g, "s").replace(/[čČ]/g, "c")
               .replace(/[řŘ]/g, "r").replace(/[žŽ]/g, "z").replace(/[ýÝ]/g, "y")
               .replace(/[áÁ]/g, "a").replace(/[íÍ]/g, "i").replace(/[úůÚŮ]/g, "u")
               .replace(/[ďĎťŤňŇ]/g, "d").replace(/\s+/g, "-");

    var saved = [];
    for (var i = 0; i < n; i++) {
        var x0 = i * PITCH;              // levý okraj výřezu (už včetně spadávky)
        var dup = src.duplicate();
        app.activeDocument = dup;

        // crop bere [vlevo, nahoře, vpravo, dole]
        dup.crop([UnitValue(x0, "mm"), UnitValue(0, "mm"),
                  UnitValue(x0 + CROP_W, "mm"), UnitValue(CROP_H, "mm")]);
        dup.flatten();

        var name = base + "-P" + (i + 1) + "-z-" + n;
        var file, opts;
        if (FORMAT === "JPG") {
            file = new File(outDir.fsName + "/" + name + ".jpg");
            opts = new JPEGSaveOptions();
            opts.quality = JPG_Q;
            opts.embedColorProfile = true;
        } else {
            file = new File(outDir.fsName + "/" + name + ".tif");
            opts = new TiffSaveOptions();
            opts.imageCompression = TIFFEncoding.TIFFLZW;
            opts.layers = false;
            opts.embedColorProfile = true;
        }
        dup.saveAs(file, opts, true, Extension.LOWERCASE);
        dup.close(SaveOptions.DONOTSAVECHANGES);

        saved.push("P" + (i + 1) + ":  " + x0 + "–" + (x0 + CROP_W) + " mm");
    }

    app.preferences.rulerUnits = oldUnits;

    alert("Hotovo — uloženo " + n + " panelů do:\n" + outDir.fsName + "\n\n" +
          saved.join("\n") + "\n\n" +
          "Každý soubor: " + CROP_W + " × " + CROP_H + " mm  (čistý formát " +
          PANEL_W + " × " + PANEL_H + " + spadávka " + BLEED + " mm)\n" +
          "Formát: " + FORMAT + (FORMAT === "JPG" ? " (kvalita " + JPG_Q + ")" : " (LZW, bez vrstev)") + "\n\n" +
          "Tiskárně řekni: čistý formát je " + PANEL_W + " × " + PANEL_H + " mm,\n" +
          "spadávka " + BLEED + " mm dokola, řez na formát — ne po kontuře.",
          "Rozřez na panely");
}
