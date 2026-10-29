/* Condensed NCERT: each chapter's lines in the book's own section order, colour-coded by kind. */
(function () {
  const R = window.RES;
  const h = R.h;
  const state = { ch: "per", kind: "all" };

  R.views.currentChapter = () => state.ch;
  R.views.chapters = function (root, opts) {
    if (opts && opts.ch) { state.ch = opts.ch; state.kind = "all"; }
    const rail = h("aside", { class: "ch-rail" }, R.CHAPTERS.map((c) => {
      const n = R.lines.filter((x) => x.ch === c.id).length;
      return h("button", { class: "ch-btn" + (c.id === state.ch ? " on" : ""), onclick: () => { state.ch = c.id; state.kind = "all"; R.app.render(); window.scrollTo({ top: 0 }); } }, c.name, h("span", { class: "n" }, String(n)));
    }));
    const main = h("section");
    root.append(h("div", { class: "chapters" }, rail, main));
    renderMain(main);
    if (opts && opts.line) {
      const el = main.querySelector('[data-line="' + opts.line + '"]');
      if (el) setTimeout(() => { el.scrollIntoView({ block: "center" }); el.classList.add("flash"); }, 30);
    }
  };

  function renderMain(main) {
    const c = R.CH[state.ch];
    const all = R.lines.filter((l) => l.ch === state.ch);
    const kinds = R.KIND_ORDER.filter((k) => all.some((l) => l.kind === k));
    const files = [...new Set(all.map((l) => R.FILES[l.src]))].join(", ");
    main.innerHTML = "";
    main.append(h("div", { class: "ch-top" },
      h("div", null, h("h2", { class: "ch-title" }, c.name), h("p", { class: "ch-src" }, c.src, h("span", { class: "file" }, files)))
    ));
    main.append(h("div", { class: "chips kinds" },
      h("button", { class: "chip" + (state.kind === "all" ? " on" : ""), onclick: () => { state.kind = "all"; renderMain(main); } }, "All " + all.length),
      kinds.map((k) => h("button", { class: "chip kchip" + (state.kind === k ? " on" : ""), "--k": R.KINDS[k].color, onclick: () => { state.kind = state.kind === k ? "all" : k; renderMain(main); } }, h("i"), R.KINDS[k].label + " " + all.filter((l) => l.kind === k).length))
    ));
    const pick = (l) => state.kind === "all" || l.kind === state.kind;
    const secs = R.sectionsOf(state.ch).map((s) => ({ sec: s.sec, lines: s.lines.filter(pick) })).filter((s) => s.lines.length);
    const slug = (s) => "sec-" + state.ch + "-" + s.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    main.append(h("div", { class: "chips sec-index" }, secs.map((s) => h("button", { class: "chip", onclick: () => document.getElementById(slug(s.sec)).scrollIntoView({ behavior: "smooth" }) }, s.sec))));
    secs.forEach((s) => {
      const ul = R.ui.lines(s.lines, false);
      [...ul.children].forEach((li, i) => li.setAttribute("data-line", s.lines[i].id));
      main.append(h("section", { class: "sec", id: slug(s.sec) }, h("h3", { class: "sec-h" }, s.sec, h("span", { class: "n" }, String(s.lines.length))), ul));
    });
  }
})();
