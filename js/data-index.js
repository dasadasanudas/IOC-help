/* Runs after every data file: ids, kinds, formulas, element tags, lookups. Nothing here adds content. */
(function () {
  const R = window.RES;
  const hash = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };
  const SYMSET = new Set(R.SYMBOLS);

  /* ---- formulas written in a line ---- */
  const NOT_FORMULA = new Set(["UV", "IR", "NB", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII", "CNS", "HCP", "CCP", "BCC", "FCC", "VSEPR", "CFSE", "CI", "IB", "NMR", "LPG", "CNG"]);
  const ROMAN = /^[IVX]+$/;
  function parseSyms(core) {
    const parts = core.match(/[A-Z][a-z]?/g);
    if (!parts || parts.join("") !== core) return null;
    return parts.every((p) => SYMSET.has(p)) ? parts : null;
  }
  R.formulasIn = function (text) {
    const out = [];
    const clean = text.replace(/\*\*/g, "").replace(/[–−]/g, "-");
    const re = /[\[(]*[A-Z][A-Za-z0-9()\[\]·.]*(?:\^\d*[+\-]{1,2})?/g;
    let m;
    while ((m = re.exec(clean))) {
      let tok = m[0];
      if (/[a-z]/.test(clean[m.index - 1] || "")) continue; // inside a word
      tok = tok.replace(/[.]+$/, "").replace(/\((?:I|II|III|IV|V|VI|VII|VIII|0)\)/g, "");
      // balance brackets
      const bal = (o, c) => { while (tok.startsWith(o) && (tok.split(o).length - 1) > (tok.split(c).length - 1)) tok = tok.slice(1); while (tok.endsWith(c) && (tok.split(c).length - 1) > (tok.split(o).length - 1)) tok = tok.slice(0, -1); };
      bal("(", ")"); bal("[", "]");
      tok = tok.replace(/\((?:g|l|s|aq)\)$/, "");
      while (/^\(.*\)$/.test(tok) && !/\)[^)]*\(/.test(tok.slice(1, -1).replace(/\([^()]*\)/g, ""))) { const inner = tok.slice(1, -1); if ((inner.split("(").length) !== (inner.split(")").length)) break; tok = inner; }
      bal("(", ")");
      tok = tok.replace(/\.(?=\d*[A-Z])/g, "·");
      if (!tok || NOT_FORMULA.has(tok) || ROMAN.test(tok)) continue;
      const core = tok.replace(/\^\d*[+\-]+$/, "").replace(/·x/g, "·").replace(/[\d()[\]·]/g, "");
      const syms = parseSyms(core);
      if (!syms) continue;
      if (syms.length < 2 && !/\d/.test(tok) && !/\^/.test(tok)) continue;
      if (/^[A-Z][a-z]?\^?\d*[+\-]?$/.test(tok) && !/\^/.test(tok) && syms.length < 2 && !/\d$/.test(tok)) continue;
      out.push({ f: tok, syms: [...new Set(syms)] });
    }
    return out;
  };

  /* common NCERT names, so "potassium permanganate" lands on the KMnO4 sheet too (navigation only) */
  const ALIAS = [
    ["potassium permanganate", "KMnO4"], ["potassium dichromate", "K2Cr2O7"], ["sodium dichromate", "Na2Cr2O7"], ["sodium chromate", "Na2CrO4"], ["potassium manganate", "K2MnO4"],
    ["ammonia", "NH3"], ["nitric acid", "HNO3"], ["sulphuric acid", "H2SO4"], ["phosphine", "PH3"], ["ozone", "O3"], ["diborane", "B2H6"], ["borax", "Na2B4O7·10H2O"],
    ["orthoboric acid", "H3BO3"], ["boric acid", "H3BO3"], ["hydrogen peroxide", "H2O2"], ["sulphur dioxide", "SO2"], ["sulphur trioxide", "SO3"], ["quick lime", "CaO"], ["quicklime", "CaO"],
    ["slaked lime", "Ca(OH)2"], ["sodium carbonate", "Na2CO3"], ["washing soda", "Na2CO3"], ["sodium hydrogencarbonate", "NaHCO3"], ["baking soda", "NaHCO3"], ["sodium hydroxide", "NaOH"],
    ["caustic soda", "NaOH"], ["carbon monoxide", "CO"], ["carbon dioxide", "CO2"], ["dinitrogen", "N2"], ["dioxygen", "O2"], ["dihydrogen", "H2"], ["hydrogen chloride", "HCl"],
    ["hydrochloric acid", "HCl"], ["phosphorus pentachloride", "PCl5"], ["phosphorus trichloride", "PCl3"], ["calcium carbonate", "CaCO3"], ["calcium oxide", "CaO"], ["calcium hydroxide", "Ca(OH)2"],
    ["heavy water", "D2O"], ["silicon dioxide", "SiO2"], ["silica", "SiO2"], ["nitrogen dioxide", "NO2"], ["nitric oxide", "NO"], ["nitrous oxide", "N2O"], ["hypochlorous acid", "HOCl"],
    ["phosphoric acid", "H3PO4"], ["phosphorous acid", "H3PO3"], ["hydrogen sulphide", "H2S"], ["silver nitrate", "AgNO3"], ["copper sulphate", "CuSO4"], ["zinc oxide", "ZnO"],
  ];
  const ALIAS_RE = ALIAS.map(([n, f]) => [new RegExp("\\b" + n + "\\b", "i"), f]);

  const NAME_TO_SYM = {};
  R.NAMES.forEach((n, i) => (NAME_TO_SYM[n.toLowerCase()] = R.SYMBOLS[i]));
  Object.assign(NAME_TO_SYM, { sulfur: "S", aluminum: "Al", cesium: "Cs" });
  delete NAME_TO_SYM.lead;
  const NAME_RE = Object.keys(NAME_TO_SYM).map((n) => [new RegExp("\\b" + n + "\\b"), NAME_TO_SYM[n]]);
  const HO_ONLY = (syms) => syms.every((s) => s === "H" || s === "O");

  function tag(x, text) {
    const fs = R.formulasIn(text);
    ALIAS_RE.forEach(([re, f]) => { if (re.test(text)) fs.push({ f, syms: R.formulasIn(f)[0] ? R.formulasIn(f)[0].syms : [] }); });
    const el = new Set();
    fs.forEach((o) => o.syms.forEach((s) => { if ((s !== "H" && s !== "O") || HO_ONLY(o.syms)) el.add(s); }));
    const lower = text.toLowerCase();
    NAME_RE.forEach(([re, s]) => { if (re.test(lower)) el.add(s); });
    x.cmp = [...new Set(fs.map((o) => o.f))];
    x.cmpSyms = {};
    fs.forEach((o) => (x.cmpSyms[o.f] = o.syms));
    x.el = [...el];
  }

  /* ---- kind (colour coding) inferred from the line itself ---- */
  const COLOUR_RE = /\b(colou?r(ed|less)?|violet|purple|crimson|yellow|orange|pink|brown|green|blue|black ppt|white ppt|red)\b/i;
  function kindOf(l) {
    if (l.exc) return "exc";
    const t = (l.t + " " + (l.o || "")).toLowerCase();
    const s = (l.sec || "").toLowerCase();
    if (/prepar|manufactur|is obtained by|are obtained by|obtained by|is made by|synthesi|extracted/.test(t) || /preparation|manufacture/.test(s)) return "prep";
    if (/→|⇌|⇄/.test(l.t)) return "rxn";
    if (/\buses?\b/.test(s) || /\b(is|are) used\b|\bused (in|as|for|to)\b|\bapplications?\b/.test(t)) return "use";
    if (/structure|hybridi|tetrahedral|octahedral|square planar|pyramid|bond angle|bond length|trigonal|linear|bipyramid|\bsp\^?\d|dsp|shape|geometry|bridg/.test(t)) return "struct";
    if (COLOUR_RE.test(l.t)) return "colour";
    return "prop";
  }

  R.lines.forEach((l, i) => {
    l.type = "line";
    l.o = l.o || l.t;
    l.id = "l-" + hash(l.ch + "|" + l.o);
    l.kind = kindOf(l);
    l.order = i;
    tag(l, l.t + " \n " + l.o);
    l.hay = R.plain(l.t + " " + l.o + " " + R.CH[l.ch].name + " " + l.sec + " " + l.cmp.join(" ")).toLowerCase();
  });

  /* colours: link each to the NCERT line(s) that cite the same sentence */
  const bySent = {};
  R.lines.forEach((l) => (l.ids || []).forEach((n) => (bySent[l.src + ":" + n] = bySent[l.src + ":" + n] || []).push(l)));
  R.colours.forEach((c) => {
    c.type = "colour";
    c.id = "c-" + hash(c.src + "|" + c.t + "|" + c.name);
    const seen = new Set();
    c.lines = [];
    c.ids.forEach((n) => (bySent[c.src + ":" + n] || []).forEach((l) => { if (!seen.has(l.id)) { seen.add(l.id); c.lines.push(l); } }));
    tag(c, c.t);
    c.hay = R.plain(c.t + " " + c.name + " " + c.grp + " " + R.CH[c.ch].name + " colour " + c.cmp.join(" ")).toLowerCase();
  });

  R.all = R.lines.concat(R.colours);
  R.byId = {};
  R.all.forEach((x) => (R.byId[x.id] = x));

  R.counts = {};
  R.lines.forEach((x) => x.el.forEach((s) => (R.counts[s] = (R.counts[s] || 0) + 1)));

  /* compound index: formula -> lines that write it */
  R.compounds = {};
  R.lines.forEach((l) => l.cmp.forEach((f) => {
    const c = (R.compounds[f] = R.compounds[f] || { f, syms: l.cmpSyms[f], lines: [], colours: [] });
    c.lines.push(l);
  }));
  R.colours.forEach((c) => c.cmp.forEach((f) => R.compounds[f] && R.compounds[f].colours.push(c)));
  R.compoundsOf = (el) => Object.values(R.compounds).filter((c) => c.syms.includes(el)).sort((a, b) => b.lines.length - a.lines.length || a.f.length - b.f.length);

  R.sectionsOf = function (ch) {
    const out = [];
    const seen = {};
    R.lines.forEach((l) => {
      if (l.ch !== ch) return;
      if (!seen[l.sec]) {
        seen[l.sec] = { sec: l.sec, lines: [] };
        out.push(seen[l.sec]);
      }
      seen[l.sec].lines.push(l);
    });
    return out;
  };
  R.cite = (x) => (R.FILES[x.src] || x.src) + ", page " + x.page;
})();
