"""picks/<ch>.txt -> ../data/lines/<ch>.js, verifying every line against the PDF sentences it cites.
Pick format:  '@src <key>' selects the sentence dump; '# Section' starts a section;
'<ids>[!] <text>' where ids = 12 or 12+13; '!' marks an exception/anomaly."""
import json, re, sys, os
from difflib import SequenceMatcher

HERE = os.path.dirname(os.path.abspath(__file__))
LABELS = {}

def letters(s):
    s = s.replace("→", "").replace("®", "")
    return re.sub(r"[^a-z]", "", s.lower())

def coverage(mine, src):
    a, b = letters(mine), letters(src)
    if not a:
        return 1.0
    sm = SequenceMatcher(None, a, b, autojunk=False)
    return sum(m.size for m in sm.get_matching_blocks() if m.size >= 3) / len(a)

def load_src(key):
    d = json.load(open(f"{HERE}/src/{key}.json"))
    return d["label"], {r["id"]: r for r in d["rows"]}

def build(ch, report):
    path = f"{HERE}/picks/{ch}.txt"
    src_key, label, rows = None, None, None
    sec = None
    out, bad = [], []
    for n, raw in enumerate(open(path, encoding="utf-8"), 1):
        line = raw.rstrip("\n")
        if not line.strip():
            continue
        if line.startswith("@src"):
            src_key = line.split()[1]
            label, rows = load_src(src_key)
            continue
        if line.startswith("#"):
            sec = line[1:].strip()
            continue
        m = re.match(r"^([\d+]+)([!T]*)\s+(.*)$", line)
        if not m:
            bad.append((n, "unparsed", line))
            continue
        ids = [int(x) for x in m.group(1).split("+")]
        exc = "!" in m.group(2)
        tab = "T" in m.group(2)
        need = 0.2 if tab else 0.88
        text = m.group(3).strip()
        missing = [i for i in ids if i not in rows]
        if missing:
            bad.append((n, f"missing ids {missing}", text))
            continue
        srctext = " ".join(rows[i]["text"] for i in ids)
        # allow neighbours for sentences split across pages
        cov = coverage(text, srctext)
        if cov < need:
            wide = " ".join(rows[i]["text"] for i in range(min(ids) - 8, max(ids) + 9) if i in rows)
            cov = max(cov, coverage(text, wide))
        page = rows[ids[0]]["page"]
        out.append({"sec": sec, "ids": ids, "t": text, "exc": exc, "tab": tab, "src": src_key, "page": page, "cov": round(cov, 3)})
        if cov < need:
            bad.append((n, f"cov {cov:.2f}", text))
    global ADDS
    if ADDS is None: ADDS = load_adds()
    for key, lab, rws, ids, exc, tab, text, sc, where in ADDS.get(ch, []):
        need = 0.2 if tab else 0.88
        srctext = " ".join(rws[i]["text"] for i in ids)
        cov = coverage(text, srctext)
        if cov < need:
            wide = " ".join(rws[i]["text"] for i in range(min(ids) - 8, max(ids) + 9) if i in rws)
            cov = max(cov, coverage(text, wide))
        out.append({"sec": sc, "ids": ids, "t": text, "exc": exc, "tab": tab, "src": key, "page": rws[ids[0]]["page"], "cov": round(cov, 3)})
        if cov < need: bad.append((where, f"cov {cov:.2f}", text))
    # book order: sections keep first-appearance order, items inside a section sorted by (src, first sentence id)
    secorder = []
    for it in out:
        if it["sec"] not in secorder: secorder.append(it["sec"])
    srcorder = []
    for it in out:
        if it["src"] not in srcorder: srcorder.append(it["src"])
    out.sort(key=lambda it: (secorder.index(it["sec"]), srcorder.index(it["src"]), min(it["ids"])))
    # drop exact duplicate texts
    seen = set(); ded = []
    for it in out:
        if it["t"] in seen: continue
        seen.add(it["t"]); ded.append(it)
    return label, ded, bad

def clean_verbatim(t):
    t = t.replace("®", "→").replace("\uf0ae", "→")
    t = re.sub(r"\s+", " ", t).strip()
    return t

def placements():
    """(src -> sorted [(id, ch, sec)]) from the main picks files"""
    P = {}
    for fn in sorted(os.listdir(f"{HERE}/picks")):
        if not fn.endswith(".txt"): continue
        ch = fn[:-4]; key = None; sec = None
        for l in open(f"{HERE}/picks/{fn}", encoding="utf-8"):
            if l.startswith("@src"): key = l.split()[1]; continue
            if l.startswith("#"): sec = l[1:].strip(); continue
            m = re.match(r"^([\d+]+)[!T]*\s", l)
            if m and key:
                for i in m.group(1).split("+"): P.setdefault(key, []).append((int(i), ch, sec))
    for k in P: P[k].sort()
    return P

def load_adds():
    """adds/<src>.txt lines: '<ids>[!T][=] [text]' ; '=' takes the PDF text verbatim. Optional '@ch <ch> <section>' forces placement for following lines until '@auto'."""
    P = placements(); res = {}
    d = f"{HERE}/adds"
    if not os.path.isdir(d): return res
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".txt"): continue
        key = fn[:-4]; label, rows = load_src(key); force = None
        for n, raw in enumerate(open(f"{d}/{fn}", encoding="utf-8"), 1):
            line = raw.rstrip("\n")
            if not line.strip() or line.startswith("//"): continue
            if line.startswith("@ch"):
                p = line.split(None, 2); force = (p[1], p[2].strip()); continue
            if line.startswith("@auto"): force = None; continue
            m = re.match(r"^([\d+]+)([!T=]*)\s*(.*)$", line)
            if not m: print("  unparsed add", fn, n, line[:80]); continue
            ids = [int(x) for x in m.group(1).split("+")]
            fl = m.group(2); text = m.group(3).strip()
            if "=" in fl or not text: text = clean_verbatim(" ".join(rows[i]["text"] for i in ids))
            if force: ch, sec = force
            else:
                ch, sec = P[key][0][1], P[key][0][2]
                for j, c, sc in P[key]:
                    if j <= ids[0]: ch, sec = c, sc
                    else: break
            res.setdefault(ch, []).append((key, label, rows, ids, "!" in fl, "T" in fl, text, sec, f"adds/{fn}:{n}"))
    return res

ADDS = None

import hashlib
def key_of(t): return hashlib.md5(t.encode("utf-8")).hexdigest()[:6]
def load_condense(ch):
    p = f"{HERE}/condense/{ch}.txt"; m = {}
    if os.path.exists(p):
        for raw in open(p, encoding="utf-8"):
            raw = raw.rstrip("\n")
            if not raw.strip() or raw.startswith("//"): continue
            k, _, v = raw.partition("|")
            m[k.strip()] = v.strip()
    return m

def emit(ch, label, items):
    C = load_condense(ch)
    keep = []
    for it in items:
        k = key_of(it["t"]); it["key"] = k
        v = C.get(k)
        if v == "-": continue
        it["o"] = it["t"]; it["sec0"] = it["sec"]
        if v and v.startswith("§"):
            sec, _, v = v[1:].partition("§"); it["sec"] = sec.strip(); v = v.strip()
        if v and v != "=": it["t"] = v
        keep.append(it)
    os.makedirs(f"{HERE}/dump", exist_ok=True)
    with open(f"{HERE}/dump/{ch}.txt", "w", encoding="utf-8") as f:
        for it in items:
            f.write(f"{it['key']}|{'!' if it['exc'] else ''}{'T' if it['tab'] else ''}|{it.get('sec0', it['sec'])}|{it.get('o', it['t'])}\n")
    order = []
    for it in items:
        s0 = it.get("sec0", it["sec"])
        if s0 not in order: order.append(s0)
    so = []
    for it in keep:
        if it["src"] not in so: so.append(it["src"])
    keep.sort(key=lambda it: (order.index(it["sec"]) if it["sec"] in order else 999, so.index(it["src"]), min(it["ids"])))
    items = keep
    js = ["/* Generated by tools/build_lines.py from picks/%s.txt. Every line is from: %s. Do not edit by hand. */" % (ch, label), "(function () {", "  const R = window.RES;"]
    js.append("  R.addLines(%s, %s, %s);" % (json.dumps(ch), json.dumps(label), json.dumps([{k: v for k, v in it.items() if k not in ("cov", "key", "sec0")} for it in items], ensure_ascii=False, indent=0).replace("\n", "")))
    js.append("})();")
    os.makedirs(f"{HERE}/../data/lines", exist_ok=True)
    open(f"{HERE}/../data/lines/{ch}.js", "w", encoding="utf-8").write("\n".join(js) + "\n")

if __name__ == "__main__":
    chs = sys.argv[1:] or [f[:-4] for f in sorted(os.listdir(f"{HERE}/picks")) if f.endswith(".txt")]
    total = 0
    for ch in chs:
        label, items, bad = build(ch, True)
        emit(ch, label, items)
        total += len(items)
        print(f"{ch}: {len(items)} lines, {sum(i['exc'] for i in items)} exceptions, {len(bad)} flagged")
        for b in bad:
            print("   ", b[0], b[1], "|", b[2][:150])
    print("total", total)
