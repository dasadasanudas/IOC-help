/* Residue core: namespace, element table, chem markup, helpers, pins. Classic script (works from file://). */
(function () {
  const R = (window.RES = window.RES || {});
  R.colours = R.colours || [];
  R.lines = R.lines || [];
  R.views = {};

  R.SYMBOLS = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" ");
  R.NAMES = "Hydrogen Helium Lithium Beryllium Boron Carbon Nitrogen Oxygen Fluorine Neon Sodium Magnesium Aluminium Silicon Phosphorus Sulphur Chlorine Argon Potassium Calcium Scandium Titanium Vanadium Chromium Manganese Iron Cobalt Nickel Copper Zinc Gallium Germanium Arsenic Selenium Bromine Krypton Rubidium Strontium Yttrium Zirconium Niobium Molybdenum Technetium Ruthenium Rhodium Palladium Silver Cadmium Indium Tin Antimony Tellurium Iodine Xenon Caesium Barium Lanthanum Cerium Praseodymium Neodymium Promethium Samarium Europium Gadolinium Terbium Dysprosium Holmium Erbium Thulium Ytterbium Lutetium Hafnium Tantalum Tungsten Rhenium Osmium Iridium Platinum Gold Mercury Thallium Lead Bismuth Polonium Astatine Radon Francium Radium Actinium Thorium Protactinium Uranium Neptunium Plutonium Americium Curium Berkelium Californium Einsteinium Fermium Mendelevium Nobelium Lawrencium Rutherfordium Dubnium Seaborgium Bohrium Hassium Meitnerium Darmstadtium Roentgenium Copernicium Nihonium Flerovium Moscovium Livermorium Tennessine Oganesson".split(" ");
  const SYMSET = new Set(R.SYMBOLS);

  R.position = function (z) {
    if (z === 1) return [1, 1];
    if (z === 2) return [1, 18];
    if (z <= 4) return [2, z - 2];
    if (z <= 10) return [2, z + 8];
    if (z <= 12) return [3, z - 10];
    if (z <= 18) return [3, z];
    if (z <= 36) return [4, z - 18];
    if (z <= 54) return [5, z - 36];
    if (z <= 56) return [6, z - 54];
    if (z === 57) return [6, 3];
    if (z <= 71) return [9, z - 54];
    if (z <= 86) return [6, z - 68];
    if (z <= 88) return [7, z - 86];
    if (z === 89) return [7, 3];
    if (z <= 103) return [10, z - 86];
    return [7, z - 100];
  };
  R.groupOf = function (z) {
    const [r, c] = R.position(z);
    if (r >= 9) return r === 9 ? "Lanthanoid" : "Actinoid";
    return "Group " + c + " · Period " + r;
  };

  const range = (a, b) => R.SYMBOLS.slice(R.SYMBOLS.indexOf(a), R.SYMBOLS.indexOf(b) + 1);
  R.GROUP_TAGS = {
    g1: ["Li", "Na", "K", "Rb", "Cs", "Fr"],
    g2: ["Be", "Mg", "Ca", "Sr", "Ba", "Ra"],
    g13: ["B", "Al", "Ga", "In", "Tl"],
    g14: ["C", "Si", "Ge", "Sn", "Pb"],
    g15: ["N", "P", "As", "Sb", "Bi"],
    g16: ["O", "S", "Se", "Te", "Po"],
    g17: ["F", "Cl", "Br", "I", "At"],
    g18: ["He", "Ne", "Ar", "Kr", "Xe", "Rn"],
    d3: range("Sc", "Zn"),
    Ln: range("La", "Lu"),
    An: range("Ac", "Lr"),
  };

  /* Element detection inside text: formula-like tokens only (so "In the" never tags indium). */
  const NAME_TO_SYM = {};
  R.NAMES.forEach((n, i) => (NAME_TO_SYM[n.toLowerCase()] = R.SYMBOLS[i]));
  Object.assign(NAME_TO_SYM, { sulfur: "S", aluminum: "Al", cesium: "Cs" });
  delete NAME_TO_SYM.lead; // "leads to"
  R.detectElements = function (text) {
    const found = new Set();
    const clean = text.replace(/\*\*/g, "");
    const tokens = clean.match(/[A-Za-z0-9()[\]^+\-−·.]+/g) || [];
    for (const raw of tokens) {
      const tok = raw.replace(/\((?:I|II|III|IV|V|VI|VII|VIII|0)\)/g, "").replace(/^[(\[]+|[)\].,]+$/g, "");
      const core = tok.replace(/\((?:I|II|III|IV|V|VI|VII|VIII|0)\)/g, "").replace(/\^[+\-−]?\d*[+\-−]?/g, "").replace(/[()[\]·.+\-−]/g, "").replace(/\d+/g, "");
      if (!core) continue;
      const parts = core.match(/[A-Z][a-z]?/g);
      if (!parts || parts.join("") !== core) continue;
      if (!parts.every((p) => SYMSET.has(p))) continue;
      const formulaLike = parts.length >= 2 || /\d/.test(tok) || /\^/.test(tok) || /\((I|II|III|IV|V|VI|VII|VIII|0)\)/.test(raw);
      if (formulaLike) parts.forEach((p) => p !== "H" && p !== "O" && found.add(p));
    }
    const lower = clean.toLowerCase();
    for (const name in NAME_TO_SYM) {
      if (new RegExp("\\b" + name + "\\b").test(lower)) found.add(NAME_TO_SYM[name]);
    }
    return [...found];
  };

  /* Chem markup → HTML. Digits after letter/)/] = subscript; ^x = superscript; sub immediately followed by ^x stacks; **bold**. */
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const SUP = /^([+\-−–]?\d+[+\-−–]?|[+\-−–])/;
  R.chem = function (s) {
    let out = "";
    let i = 0;
    while (i < s.length) {
      if (s.startsWith("**", i)) {
        const j = s.indexOf("**", i + 2);
        if (j > i) {
          out += "<strong>" + R.chem(s.slice(i + 2, j)) + "</strong>";
          i = j + 2;
          continue;
        }
      }
      const ch = s[i];
      if (ch === "^") {
        const m = s.slice(i + 1).match(SUP);
        if (m) {
          out += "<sup>" + m[1].replace(/[-–]/g, "−") + "</sup>";
          i += 1 + m[1].length;
          continue;
        }
      }
      if (/\d/.test(ch) && i > 0 && /[A-Za-z)\]]/.test(s[i - 1]) && !/[a-z]{3}$/.test(s.slice(Math.max(0, i - 3), i))) {
        let j = i;
        while (j < s.length && (/\d/.test(s[j]) || (s[j] === "." && /\d/.test(s[j + 1] || "")))) j++;
        const sub = s.slice(i, j);
        const m = s[j] === "^" ? s.slice(j + 1).match(SUP) : null;
        if (m) {
          out += '<span class="stack"><span>' + m[1].replace(/[-–]/g, "−") + "</span><span>" + sub + "</span></span>";
          i = j + 1 + m[1].length;
          continue;
        }
        out += "<sub>" + sub + "</sub>";
        i = j;
        continue;
      }
      out += esc(ch);
      i++;
    }
    return out;
  };
  R.plain = (s) => s.replace(/\*\*/g, "").replace(/\^/g, "");

  /* DOM helper */
  R.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs)
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "html") el.innerHTML = v;
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
        else if (k.startsWith("--")) el.style.setProperty(k, v);
        else el.setAttribute(k, v === true ? "" : v);
      }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    }
    return el;
  };

  R.icon = function (name, size) {
    const s = size || 18;
    const paths = {
      pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
      search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
      x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
      shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.3-1.74l6.46-9.52A4 4 0 0 1 17.03 5H22"/><path d="M2 6h1.97a4 4 0 0 1 3.3 1.74l6.46 9.52A4 4 0 0 0 17.03 19H22"/>',
      left: '<path d="m15 18-6-6 6-6"/>',
      right: '<path d="m9 18 6-6-6-6"/>',
      play: '<polygon points="6 3 20 12 6 21 6 3"/>',
      download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
      pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    };
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + "</svg>";
  };

  /* Text mode: condensed rewrite (default) or NCERT's original wording */
  const TKEY = "residue-text-v1";
  let tmode = "cond";
  try { tmode = localStorage.getItem(TKEY) === "orig" ? "orig" : "cond"; } catch (e) {}
  R.text = {
    mode: () => tmode,
    set(m) { tmode = m === "orig" ? "orig" : "cond"; try { localStorage.setItem(TKEY, tmode); } catch (e) {} },
    of: (x) => (x.type === "line" && tmode === "orig" && x.o ? x.o : x.t),
    other: (x) => (x.type === "line" && x.o && x.o !== x.t ? (tmode === "orig" ? x.t : x.o) : null),
  };

  /* Pins (localStorage; works from file:// in Chrome/Edge) */
  const KEY = "residue-pins-v3";
  let pins;
  try {
    pins = new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch (e) {
    pins = new Set();
  }
  const listeners = [];
  R.pins = {
    has: (id) => pins.has(id),
    size: () => pins.size,
    all: () => pins,
    toggle(id) {
      pins.has(id) ? pins.delete(id) : pins.add(id);
      try {
        localStorage.setItem(KEY, JSON.stringify([...pins]));
      } catch (e) {}
      listeners.forEach((fn) => fn(id));
    },
    on: (fn) => listeners.push(fn),
  };

  R.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
})();
