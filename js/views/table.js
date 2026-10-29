/* Elements & compounds: periodic table filled by how many NCERT lines mention each element.
   Click an element -> its compounds (as written in the lines) -> a compound sheet of every line that writes it. */
(function () {
  const R = window.RES;
  const h = R.h;
  const state = { el: "Mn", cmp: null };
  const vals = Object.values(R.counts).sort((a, b) => a - b);
  const q = (p) => vals[Math.floor(p * (vals.length - 1))];
  const steps = [q(0.2), q(0.4), q(0.6), q(0.8), q(0.92)];
  const alpha = (n) => (!n ? 0 : n <= steps[0] ? 0.14 : n <= steps[1] ? 0.28 : n <= steps[2] ? 0.62 : n <= steps[3] ? 0.74 : n <= steps[4] ? 0.86 : 1);

  R.views.table = function (root, opts) {
    if (opts && opts.cmp && R.compounds[opts.cmp]) {
      state.cmp = opts.cmp;
      const syms = R.compounds[opts.cmp].syms.filter((s) => s !== "H" && s !== "O");
      state.el = opts.el || syms[0] || R.compounds[opts.cmp].syms[0];
    } else if (opts && opts.el) { state.el = opts.el; state.cmp = null; }
    const grid = h("div", { class: "ptable" });
    R.SYMBOLS.forEach((s, i) => {
      const [r, c] = R.position(i + 1);
      const n = R.counts[s] || 0;
      const a = alpha(n);
      const t = h("button", {
        class: "tile" + (n ? "" : " empty") + (a > 0.5 ? " dark" : "") + (s === state.el ? " sel" : ""),
        style: { gridRow: r, gridColumn: c },
        "--a": a,
        "--dl": (i * 0.004).toFixed(3) + "s",
        title: R.NAMES[i] + (n ? " · " + n + " lines" : ""),
        "aria-label": R.NAMES[i] + ", " + n + " lines",
        onclick: () => {
          if (!n) return;
          state.el = s;
          state.cmp = null;
          grid.querySelectorAll(".tile.sel").forEach((x) => x.classList.remove("sel"));
          t.classList.add("sel");
          renderPanel(panel);
          panel.scrollIntoView({ behavior: "smooth", block: "start" });
        },
      }, h("span", { class: "sym" }, s), n ? h("span", { class: "n" }, String(n)) : null);
      grid.appendChild(t);
    });
    grid.appendChild(h("div", { class: "series-label", style: { gridRow: 9, gridColumn: "1 / 4" } }, "Lanthanoids"));
    grid.appendChild(h("div", { class: "series-label", style: { gridRow: 10, gridColumn: "1 / 4" } }, "Actinoids"));

    const panel = h("section", { class: "el-panel" });
    root.append(
      h("div", { class: "ptable-wrap" }, grid),
      h("div", { class: "legend" }, h("span", null, "fewer"), h("span", { class: "ramp" }), h("span", null, "more NCERT lines")),
      panel
    );
    renderPanel(panel);
    if (opts && opts.cmp) setTimeout(() => panel.scrollIntoView({ block: "start" }), 30);
  };

  function renderPanel(panel) {
    const el = state.el;
    const z = R.SYMBOLS.indexOf(el) + 1;
    const lines = R.lines.filter((l) => l.el.includes(el));
    const cmps = R.compoundsOf(el);
    const shown = cmps.slice(0, 60);
    if (state.cmp && !shown.some((c) => c.f === state.cmp) && R.compounds[state.cmp]) shown.unshift(R.compounds[state.cmp]);
    panel.innerHTML = "";
    panel.append(
      h("div", { class: "el-head" },
        h("div", { class: "el-id" },
          h("div", { class: "el-sym" }, el),
          h("div", { class: "el-meta" }, h("h2", null, R.NAMES[z - 1]), h("p", null, "Z = " + z + " · " + R.groupOf(z) + " · " + lines.length + " NCERT lines · " + cmps.length + " compounds written in them"))
        )
      )
    );
    if (shown.length) {
      panel.append(
        h("h3", { class: "block-h" }, "Compounds"),
        h("div", { class: "chips cmps" },
          h("button", { class: "chip" + (state.cmp ? "" : " on"), onclick: () => { state.cmp = null; renderPanel(panel); } }, "All lines"),
          shown.map((c) => R.ui.cmpChip(c, state.cmp === c.f, () => { state.cmp = state.cmp === c.f ? null : c.f; renderPanel(panel); }))
        ),
        ...(cmps.length > shown.length ? [h("p", { class: "more-note" }, (cmps.length - shown.length) + " more appear once each; search finds them.")] : [])
      );
    }
    if (state.cmp) {
      const c = R.compounds[state.cmp];
      panel.append(h("div", { class: "sheet-h" }, h("span", { class: "sheet-f", html: R.chem(c.f) }), h("span", { class: "sheet-n" }, c.lines.length + (c.lines.length === 1 ? " line" : " lines") + " across " + new Set(c.lines.map((l) => l.ch)).size + " chapter(s)")));
      if (c.colours.length) panel.append(h("h3", { class: "block-h" }, "Stated colour"), R.ui.colourList(c.colours));
      panel.append(R.ui.linesByChapter(c.lines.slice()));
    } else {
      panel.append(R.ui.linesByChapter(lines));
    }
  }
})();
