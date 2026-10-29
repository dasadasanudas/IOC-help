/* Shared UI pieces: wells, pins, NCERT line rows, colour rows. */
(function () {
  const R = window.RES;
  const h = R.h;
  R.ui = {};

  R.ui.well = function (hex, size, delay) {
    return h("span", { class: "well" + (hex ? "" : " clear"), style: { width: size + "px", height: size + "px" }, "--c": hex || "#fff", "--d": (delay || 0) + "s", "aria-hidden": "true" });
  };

  R.ui.pinBtn = function (id, cls) {
    const b = h("button", { class: (cls || "pin") + (R.pins.has(id) ? " on" : ""), "aria-label": "Pin", title: "Pin (didn't know this)", "data-pin": id, html: R.icon("pin", 17) });
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      R.pins.toggle(id);
    });
    return b;
  };
  R.pins.on((id) => {
    document.querySelectorAll('[data-pin="' + id + '"]').forEach((b) => {
      const on = R.pins.has(id);
      if (b.classList.contains("pin")) b.classList.toggle("on", on);
      if (b.classList.contains("ghost")) {
        b.classList.toggle("pinned", on);
        const label = b.querySelector(".lbl");
        if (label) label.textContent = on ? "Pinned" : "Pin";
      }
    });
    R.app && R.app.refreshTabs();
  });

  R.ui.page = (x) => h("span", { class: "pg", title: R.cite(x) }, "p." + x.page);
  /* p.N on a line: click to see the other wording (NCERT original under the condensed line, or vice versa) */
  R.ui.pageBtn = function (l) {
    const other = R.text.other(l);
    if (!other) return h("span", { class: "pg", title: R.cite(l) + (R.text.mode() === "cond" ? " · kept in NCERT's words" : "") }, "p." + l.page);
    const b = h("button", { class: "pg alt", title: R.cite(l) + " · show " + (R.text.mode() === "orig" ? "condensed line" : "NCERT's wording"), "aria-expanded": "false" }, "p." + l.page);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const li = b.closest(".ln");
      const tx = li.querySelector(".tx");
      let o = tx.querySelector(".orig");
      if (o) { o.remove(); b.classList.remove("open"); b.setAttribute("aria-expanded", "false"); return; }
      o = h("span", { class: "orig" }, h("span", { class: "olbl" }, R.text.mode() === "orig" ? "Condensed" : "NCERT · " + R.cite(l)), h("span", { html: R.chem(other) }));
      tx.append(o);
      b.classList.add("open");
      b.setAttribute("aria-expanded", "true");
    });
    return b;
  };

  R.ui.lineRow = function (l, showFrom) {
    const k = R.KINDS[l.kind];
    return h("li", { class: "ln k-" + l.kind + (l.exc ? " exc" : ""), "--k": k.color },
      h("div", { class: "tx" },
        showFrom ? h("span", { class: "from" }, R.CH[l.ch].name + " · " + l.sec) : null,
        l.exc ? h("span", { class: "tag" }, "Exception") : null,
        l.tab ? h("span", { class: "tag tab", title: "Retyped from a table, figure or equation on this page" }, "Table/eq.") : null,
        h("span", { class: "main", html: R.chem(R.text.of(l)) })
      ),
      R.ui.pageBtn(l),
      R.ui.pinBtn(l.id)
    );
  };

  R.ui.lines = function (list, showFrom) {
    return h("ul", { class: "lines" }, list.map((l) => R.ui.lineRow(l, showFrom)));
  };

  /* lines grouped by chapter, chapters in book order */
  R.ui.linesByChapter = function (list) {
    const wrap = h("div");
    R.CHAPTERS.forEach((c) => {
      const ls = list.filter((l) => l.ch === c.id);
      if (!ls.length) return;
      wrap.append(h("h3", { class: "block-h" }, c.name + " · " + ls.length), R.ui.lines(ls.sort((a, b) => a.order - b.order), true));
    });
    return wrap;
  };

  R.ui.colourRow = function (c, onClick) {
    return h("li", { class: "crow", onclick: onClick || null },
      R.ui.well(c.hex, 34),
      h("div", { class: "tx" }, h("div", { class: "f", html: R.chem(c.t) }), h("div", { class: "nm" }, c.name)),
      h("span", { class: "ctx" }, R.CH[c.ch].name),
      R.ui.page(c),
      R.ui.pinBtn(c.id)
    );
  };
  R.ui.colourList = (list) => h("ul", { class: "lines crows" }, list.map((c) => R.ui.colourRow(c, () => R.app.go("colours", { pick: c.id }))));

  /* mixed: lines then colours */
  R.ui.mixed = function (items, opts) {
    const o = opts || {};
    const lines = items.filter((x) => x.type === "line");
    const cols = items.filter((x) => x.type === "colour");
    return h("div", null,
      lines.length ? (o.byChapter ? R.ui.linesByChapter(lines) : h("div", null, h("h3", { class: "block-h" }, "NCERT lines · " + lines.length), R.ui.lines(lines, true))) : null,
      cols.length ? h("div", null, h("h3", { class: "block-h" }, "Colours · " + cols.length), R.ui.colourList(cols)) : null
    );
  };

  R.ui.cmpChip = function (c, on, onClick) {
    return h("button", { class: "chip cmp" + (on ? " on" : ""), onclick: onClick },
      h("span", { html: R.chem(c.f) }), h("span", { class: "n" }, String(c.lines.length)));
  };

  R.ui.fillIcons = function (root) {
    (root || document).querySelectorAll("[data-icon]").forEach((el) => {
      const span = document.createElement("span");
      span.innerHTML = R.icon(el.getAttribute("data-icon"), 18);
      el.prepend(span.firstChild);
      el.removeAttribute("data-icon");
    });
  };
})();
