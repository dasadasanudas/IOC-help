/* Exceptions, Pinned, Search. */
(function () {
  const R = window.RES;
  const h = R.h;
  const excState = { ch: "all" };

  R.views.exceptions = function (root) {
    const lines = R.lines.filter((l) => l.exc);
    const chs = R.CHAPTERS.filter((c) => lines.some((l) => l.ch === c.id));
    const body = h("div");
    const chips = h("div", { class: "chips", style: { marginBottom: "10px" } });
    function draw() {
      chips.innerHTML = "";
      chips.append(h("button", { class: "chip" + (excState.ch === "all" ? " on" : ""), onclick: () => { excState.ch = "all"; draw(); } }, "All " + lines.length),
        ...chs.map((c) => h("button", { class: "chip" + (excState.ch === c.id ? " on" : ""), onclick: () => { excState.ch = c.id; draw(); } }, c.name + " " + lines.filter((l) => l.ch === c.id).length)));
      body.innerHTML = "";
      body.append(R.ui.linesByChapter(lines.filter((x) => excState.ch === "all" || x.ch === excState.ch)));
    }
    root.append(h("h2", { class: "view-title" }, "Exceptions"), h("p", { class: "view-sub" }, "Every NCERT line where a trend breaks or a member behaves anomalously."), chips, body);
    draw();
  };

  function exportPins(items) {
    const out = ["Residue · pinned (" + new Date().toISOString().slice(0, 10) + ")", ""];
    R.CHAPTERS.forEach((c) => {
      const xs = items.filter((x) => x.ch === c.id);
      if (!xs.length) return;
      out.push("== " + c.name + " ==");
      xs.forEach((x) => out.push((x.type === "colour" ? R.plain(x.t) + " : " + x.name : (x.exc ? "[!] " : "") + R.plain(x.t) + (x.o && x.o !== x.t ? "\n      NCERT: " + R.plain(x.o) : "")) + "   (" + R.cite(x) + ")"));
      out.push("");
    });
    const a = h("a", { href: URL.createObjectURL(new Blob([out.join("\n")], { type: "text/plain" })), download: "residue-pinned.txt" });
    document.body.append(a);
    a.click();
    a.remove();
  }

  R.views.pinned = function (root) {
    const items = R.all.filter((x) => R.pins.has(x.id));
    root.append(
      h("div", { class: "view-head" },
        h("div", null, h("h2", { class: "view-title" }, "Pinned"), h("p", { class: "view-sub" }, "What you didn't know. Pin anything, anywhere.")),
        items.length ? h("button", { class: "chip", onclick: () => exportPins(items) }, "Export as text") : null
      )
    );
    root.append(items.length ? R.ui.mixed(items, { byChapter: true }) : h("div", { class: "empty-state" }, "Nothing pinned yet. Tap the pin on any line or colour."));
  };

  R.views.search = function (root, opts) {
    const raw = opts.q.trim();
    const norm = (s) => s.toLowerCase().replace(/[\^·.]/g, "").replace(/[–−]/g, "-");
    const terms = norm(raw).split(/\s+/).filter(Boolean);
    const hits = R.all.filter((x) => terms.every((t) => norm(x.hay).includes(t)));
    const one = terms.join("");
    const cmps = Object.values(R.compounds).filter((c) => norm(c.f).replace(/[+\-]/g, "").startsWith(one.replace(/[+\-]/g, ""))).sort((a, b) => b.lines.length - a.lines.length).slice(0, 14);
    root.append(h("h2", { class: "view-title" }, "“" + raw + "”"), h("p", { class: "view-sub" }, hits.length ? hits.length + " matches" : "Nothing in the PDFs matches. Try a formula without charges, like mno4 or fe3."));
    if (cmps.length) root.append(h("h3", { class: "block-h" }, "Compound sheets"), h("div", { class: "chips cmps" }, cmps.map((c) => R.ui.cmpChip(c, false, () => R.app.go("table", { cmp: c.f })))));
    if (hits.length) root.append(R.ui.mixed(hits, { byChapter: true }));
  };
})();
