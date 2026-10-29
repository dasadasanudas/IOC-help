/* App shell: tabs, search, routing between views. */
(function () {
  const R = window.RES;
  const h = R.h;
  const TABS = [
    { id: "chapters", label: "Condensed NCERT" },
    { id: "table", label: "Elements & compounds" },
    { id: "exceptions", label: "Exceptions" },
    { id: "colours", label: "Colours" },
    { id: "pinned", label: "Pinned" },
  ];
  const state = { tab: "chapters", q: "", opts: {} };
  const view = document.getElementById("view");
  const tabs = document.getElementById("tabs");
  const q = document.getElementById("q");
  const qClear = document.getElementById("q-clear");

  R.app = {
    state,
    render() {
      view.innerHTML = "";
      view.style.animation = "none";
      void view.offsetWidth;
      view.style.animation = "";
      if (state.q.trim()) R.views.search(view, { q: state.q });
      else R.views[state.tab](view, state.opts || {});
      state.opts = {};
      R.app.refreshTabs();
    },
    go(tab, opts) {
      state.tab = tab;
      state.opts = opts || {};
      state.q = "";
      q.value = "";
      qClear.hidden = true;
      R.app.render();
      window.scrollTo({ top: 0 });
    },
    refreshTabs() {
      tabs.innerHTML = "";
      TABS.forEach((t) => {
        const n = t.id === "pinned" ? R.pins.size() : 0;
        tabs.append(h("button", { class: "tab" + (state.tab === t.id && !state.q.trim() ? " on" : ""), onclick: () => R.app.go(t.id) }, t.label, n ? h("span", { class: "count" }, String(n)) : null));
      });
    },
  };

  let deb;
  q.addEventListener("input", () => {
    qClear.hidden = !q.value;
    clearTimeout(deb);
    deb = setTimeout(() => { state.q = q.value; R.app.render(); }, 140);
  });
  qClear.addEventListener("click", () => { q.value = ""; qClear.hidden = true; state.q = ""; R.app.render(); q.focus(); });
  const tm = document.getElementById("textmode");
  const paintTm = () => tm.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.m === R.text.mode()));
  tm.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.dataset.m === R.text.mode()) return;
    const y = window.scrollY;
    R.text.set(b.dataset.m);
    paintTm();
    state.opts = { keep: true };
    R.app.render();
    window.scrollTo({ top: y });
  });
  paintTm();
  document.getElementById("drift-open").addEventListener("click", () => {
    const pool = state.tab === "chapters" ? R.views.currentChapter() : state.tab === "exceptions" ? "exc" : state.tab === "colours" ? "colour" : state.tab === "pinned" && R.pins.size() ? "pinned" : "lines";
    R.drift(pool);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== q && !document.querySelector(".drift")) { e.preventDefault(); q.focus(); }
  });

  document.getElementById("stamp").textContent = R.lines.length + " NCERT lines · " + R.colours.length + " stated colours · every one cited to its PDF page";
  R.ui.fillIcons(document);
  R.app.render();
})();
