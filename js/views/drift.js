/* Drift: one item at a time, full screen. Passive; no scoring. */
(function () {
  const R = window.RES;
  const h = R.h;

  function pool(id) {
    if (id === "all" || id === "lines") return R.lines;
    if (id === "exc") return R.lines.filter((l) => l.exc);
    if (id === "colour") return R.colours;
    if (id === "pinned") return R.all.filter((x) => R.pins.has(x.id));
    return R.lines.filter((x) => x.ch === id);
  }

  R.drift = function (startPool) {
    const rootEl = document.getElementById("drift-root");
    let list = [], i = 0, playing = false, secs = 10, timer = null, current = startPool;

    const sel = h("select", { "aria-label": "What to drift through" },
      [["lines", "All NCERT lines"], ["exc", "Exceptions"], ["colour", "Colours"], ["pinned", "Pinned"]].map(([v, t]) => h("option", { value: v }, t)),
      R.CHAPTERS.map((c) => h("option", { value: c.id }, c.name))
    );
    sel.value = current;
    const stage = h("div", { class: "drift-stage" });
    const count = h("div", { class: "drift-count" });
    const prog = h("div", { class: "drift-progress" });
    const playBtn = h("button", { class: "ghost", "aria-label": "Auto-advance" });
    const pinWrap = h("span");
    const speedBtns = [6, 10, 20].map((s) => h("button", { class: "ghost" + (s === secs ? " on" : ""), "aria-label": s + " seconds per item", onclick: () => { secs = s; speedBtns.forEach((b, j) => b.classList.toggle("on", [6, 10, 20][j] === s)); schedule(); } }, s + "s"));
    const close = () => { clearTimeout(timer); document.removeEventListener("keydown", onKey); rootEl.innerHTML = ""; document.body.style.overflow = ""; };

    const shell = h("div", { class: "drift", role: "dialog", "aria-label": "Drift" },
      prog,
      h("div", { class: "drift-bar" },
        h("div", { class: "drift-brand", html: "Residue<span>.</span> drift" }),
        h("div", { style: { display: "flex", gap: "10px", alignItems: "center" } }, sel, h("button", { class: "ghost", "aria-label": "Close", html: R.icon("x"), onclick: close }))
      ),
      stage,
      h("div", { class: "drift-foot" },
        count,
        h("div", { style: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" } },
          h("button", { class: "ghost", "aria-label": "Previous", html: R.icon("left", 20), onclick: () => go(-1) }),
          playBtn, speedBtns,
          h("button", { class: "ghost", "aria-label": "Next", html: R.icon("right", 20), onclick: () => go(1) }),
          pinWrap
        ),
        h("div", { class: "keys" }, "← → · space · P · esc")
      )
    );

    function setPlay(p) {
      playing = p;
      playBtn.classList.toggle("on", p);
      playBtn.innerHTML = R.icon(p ? "pause" : "play") + "<span>" + (p ? "Pause" : "Auto") + "</span>";
      schedule();
    }
    playBtn.onclick = () => setPlay(!playing);

    function schedule() {
      clearTimeout(timer);
      prog.className = "drift-progress";
      if (!playing || !list.length) return;
      void prog.offsetWidth;
      prog.style.animationDuration = secs + "s";
      prog.className = "drift-progress run";
      timer = setTimeout(() => go(1), secs * 1000);
    }

    function load(id) {
      current = id;
      list = R.shuffle(pool(id));
      i = 0;
      show(1);
    }

    function show(dir) {
      const x = list[i];
      stage.innerHTML = "";
      count.textContent = list.length ? i + 1 + " / " + list.length : "0 / 0";
      pinWrap.innerHTML = "";
      if (!x) {
        stage.append(h("div", { class: "drift-card in", style: { textAlign: "center", fontSize: "22px", color: "#cfd8ee" } }, "Nothing here yet. Pin something first, or pick another pool."));
        return;
      }
      const pb = h("button", { class: "ghost" + (R.pins.has(x.id) ? " pinned" : ""), "data-pin": x.id, html: R.icon("pin", 17) + '<span class="lbl">' + (R.pins.has(x.id) ? "Pinned" : "Pin") + "</span>", onclick: () => R.pins.toggle(x.id) });
      pinWrap.append(pb);
      let card;
      if (x.type === "line") {
        card = h("div", { class: "drift-card" },
          h("div", { class: "drift-kind", "--kd": x.exc ? "#F59A45" : "#9DB4EE" }, (x.exc ? "Exception · " : R.KINDS[x.kind].label + " · ") + R.CH[x.ch].name + " · " + x.sec + " · p." + x.page),
          h("div", { class: "drift-title line", html: R.chem(R.text.of(x)) })
        );
      } else {
        card = h("div", { class: "drift-card" },
          h("div", { class: "drift-kind", "--kd": "#F08DB4" }, x.grp + " · " + R.CH[x.ch].name + " · p." + x.page),
          h("div", { class: "drift-colour" }, R.ui.well(x.hex, 180), h("div", null, h("div", { class: "drift-title", style: { margin: 0 }, html: R.chem(x.t) }), h("ul", { class: "drift-lines", style: { marginTop: "14px" } }, h("li", null, x.name))))
        );
      }
      card.classList.add(dir < 0 ? "back" : "in");
      stage.append(card);
      schedule();
    }

    function go(d) {
      if (!list.length) return;
      i = (i + d + list.length) % list.length;
      show(d);
    }

    function onKey(e) {
      if (e.target.tagName === "SELECT") return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") { e.preventDefault(); setPlay(!playing); }
      else if (e.key === "Escape") close();
      else if (e.key.toLowerCase() === "p" && list[i]) R.pins.toggle(list[i].id);
    }

    sel.onchange = () => load(sel.value);
    document.addEventListener("keydown", onKey);
    rootEl.innerHTML = "";
    rootEl.append(shell);
    document.body.style.overflow = "hidden";
    setPlay(false);
    load(current);
  };
})();
