/* Colours view: a colour field you can pick from (every compound sits at its own colour), plus the full wall. */
(function () {
  const R = window.RES;
  const h = R.h;

  /* colour maths */
  const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  function oklab([r, g, b]) {
    r = lin(r); g = lin(g); b = lin(b);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function hslToRgb(hh, s, l) {
    const k = (n) => (n + hh / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hh = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      hh = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh *= 60;
    }
    return [hh, s, l];
  }
  // field mapping: x = hue, y = lightness 0.93 (top) → 0.14 (bottom), fixed saturation
  const L_TOP = 0.93, L_BOT = 0.14, SAT = 0.78;
  const fieldColour = (fx, fy) => hslToRgb(fx * 360, SAT, L_TOP - fy * (L_TOP - L_BOT));
  const neutralColour = (fy) => { const v = 255 - fy * (255 - 18); return [v, v, v + 4]; };

  const SW = R.colours.map((f) => {
    if (!f.hex) return Object.assign(f, { lab: oklab([255, 255, 255]), neutral: true, colourless: true, fy: 0.03 });
    const rgb = hexToRgb(f.hex);
    const lab = oklab(rgb);
    const chroma = Math.hypot(lab[1], lab[2]);
    const [hh, , l] = rgbToHsl(rgb);
    const neutral = chroma < 0.035;
    return Object.assign(f, {
      lab,
      neutral,
      fx: hh / 360,
      fy: neutral ? Math.min(0.97, Math.max(0.03, 1 - (lab[0] - 0.18) / 0.8)) : Math.min(0.98, Math.max(0.02, (L_TOP - l) / (L_TOP - L_BOT))),
    });
  });

  const state = { pick: hexToRgb("#1D3D8F"), sel: null };

  function nearest(rgb, n) {
    const p = oklab(rgb);
    return SW.map((s) => ({ s, d: Math.hypot(s.lab[0] - p[0], s.lab[1] - p[1], s.lab[2] - p[2]) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, n);
  }

  R.ui.swatchGrid = function (list, onPick) {
    return h("div", { class: "wall" }, list.map((f, i) =>
      h("button", { class: "swatch" + (R.pins.has(f.id) ? " on" : ""), "data-sw": f.id, title: f.name + " · " + R.cite(f), onclick: () => onPick(f) },
        R.ui.well(f.hex, 76, -(i % 9)),
        h("span", { class: "f", html: R.chem(f.t) }),
        h("span", { class: "nm" }, f.name)
      )
    ));
  };

  R.views.colours = function (root, opts) {
    const canvas = h("canvas", { width: 720, height: 340 });
    const field = h("div", { class: "field", "aria-label": "Colour field: drag to pick a colour" }, canvas);
    const neutral = h("div", { class: "neutral", "aria-label": "Whites, greys, blacks, colourless" });
    const cross = h("div", { class: "cross" });
    const tip = h("div", { class: "tip", hidden: true });
    const panel = h("div", { class: "picked" });
    const groupState = { g: "all" };

    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++) {
        const [r, g, b] = fieldColour(x / (canvas.width - 1), y / (canvas.height - 1));
        const i = (y * canvas.width + x) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);

    SW.forEach((s) => {
      const d = h("span", { class: "dot" + (s.colourless ? " clear" : ""), "--c": s.hex || "#fff", "data-dot": s.id, style: s.neutral ? { left: (22 + ((parseInt(s.id.slice(-3), 36) % 5) * 5)) + "px", top: s.fy * 100 + "%" } : { left: s.fx * 100 + "%", top: s.fy * 100 + "%" } });
      d.addEventListener("pointerenter", () => { tip.hidden = false; tip.innerHTML = R.chem(s.t) + " · " + s.name; place(tip, d); });
      d.addEventListener("pointerleave", () => (tip.hidden = true));
      d.addEventListener("pointerdown", (e) => { e.stopPropagation(); choose(s); });
      (s.neutral ? neutral : field).appendChild(d);
    });

    function place(el, anchor) {
      const wr = root.querySelector(".field-wrap").getBoundingClientRect();
      const ar = anchor.getBoundingClientRect();
      el.style.left = ar.left + ar.width / 2 - wr.left + "px";
      el.style.top = ar.top - wr.top + "px";
    }

    function choose(s) {
      state.sel = s.id;
      const host = s.neutral ? neutral : field;
      if (cross.parentNode !== host) host.appendChild(cross);
      cross.style.setProperty("--c", s.hex || "#ffffff");
      cross.style.left = s.neutral ? "50%" : s.fx * 100 + "%";
      cross.style.top = s.fy * 100 + "%";
      state.pick = hexToRgb(s.hex || "#ffffff");
      renderPanel();
    }

    function drag(el, map) {
      const go = (e) => {
        const r = el.getBoundingClientRect();
        const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        if (cross.parentNode !== el) el.appendChild(cross);
        cross.style.left = (el === neutral ? 50 : fx * 100) + "%";
        cross.style.top = fy * 100 + "%";
        state.pick = map(fx, fy);
        state.sel = null;
        cross.style.setProperty("--c", toHex(...state.pick));
        renderPanel();
      };
      el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); go(e); el.addEventListener("pointermove", go); });
      el.addEventListener("pointerup", () => el.removeEventListener("pointermove", go));
      el.addEventListener("pointercancel", () => el.removeEventListener("pointermove", go));
    }
    drag(field, fieldColour);
    drag(neutral, (fx, fy) => neutralColour(fy));

    function renderPanel() {
      const hex = toHex(...state.pick);
      const res = nearest(state.pick, 12);
      SW.forEach((s) => { const d = root.querySelector('[data-dot="' + s.id + '"]'); d && d.classList.toggle("hit", res.slice(0, 6).some((r) => r.s === s)); });
      panel.innerHTML = "";
      const sel = state.sel && R.byId[state.sel];
      if (sel) {
        panel.append(
          h("div", { class: "picked-h" }, R.ui.well(sel.hex, 58),
            h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { class: "t", html: R.chem(sel.t) }), h("div", { class: "s" }, sel.name)),
            R.ui.pinBtn(sel.id)),
          h("div", { class: "said" }, h("div", { class: "said-h" }, "The NCERT line · " + R.CH[sel.ch].name + " · p." + sel.page),
            sel.lines.length ? sel.lines.map((l) => h("p", { html: R.chem(R.text.of(l)) })) : h("p", { class: "muted" }, "Stated on " + R.cite(sel) + ".")
          ),
          h("div", { class: "s near-h" }, "Nearby colours")
        );
      } else {
        panel.append(h("div", { class: "picked-h" }, R.ui.well(hex, 54), h("div", null, h("div", { class: "t" }, "Closest stated colours"), h("div", { class: "s" }, "Drag across the field, or tap a dot"))));
      }
      res.filter(({ s }) => !sel || s !== sel).slice(0, sel ? 8 : 12).forEach(({ s }) =>
        panel.append(h("button", { class: "match", onclick: () => choose(s) },
          R.ui.well(s.hex, 34),
          h("div", null, h("div", { class: "f", html: R.chem(s.t) }), h("div", { class: "nm" }, s.name)),
          h("span", { class: "ctx" }, R.CH[s.ch].name)
        ))
      );
    }

    const wall = h("div");
    const gchips = h("div", { class: "chips", style: { margin: "0 0 30px" } });
    function drawWall() {
      gchips.innerHTML = "";
      const groups = R.COLOUR_GROUPS.filter((g) => SW.some((s) => s.grp === g));
      gchips.append(h("button", { class: "chip" + (groupState.g === "all" ? " on" : ""), onclick: () => { groupState.g = "all"; drawWall(); } }, "All " + SW.length),
        ...groups.map((g) => h("button", { class: "chip" + (groupState.g === g ? " on" : ""), onclick: () => { groupState.g = g; drawWall(); } }, g + " " + SW.filter((s) => s.grp === g).length)));
      wall.innerHTML = "";
      (groupState.g === "all" ? groups : [groupState.g]).forEach((g) =>
        wall.append(h("section", { class: "wall-section" }, h("h3", null, g), R.ui.swatchGrid(SW.filter((s) => s.grp === g), (s) => { choose(s); root.querySelector(".finder").scrollIntoView({ behavior: "smooth", block: "start" }); })))
      );
    }

    root.append(
      h("h2", { class: "view-title" }, "Colours"),
      h("p", { class: "view-sub" }, "Only colours the PDFs state. Pick a colour, see who wears it. Tap one for its NCERT line."),
      h("div", { class: "finder" },
        h("div", null, h("div", { class: "field-wrap", style: { position: "relative" } }, field, neutral, tip), h("div", { class: "field-legend" }, h("span", null, "red"), h("span", null, "yellow"), h("span", null, "green"), h("span", null, "blue"), h("span", null, "violet"), h("span", null, "red"))),
        panel
      ),
      gchips,
      wall
    );
    drawWall();
    const start = (opts && opts.pick && R.byId[opts.pick]) || SW.find((s) => s.t === "KMnO4") || SW[0];
    choose(start);
  };
})();
