"""Extract numbered sentences from NCERT chapter PDFs (digital via pdftotext -raw, scanned via OCR txt).
Output: src/<key>.json = [{id, page, text}] and src/<key>.txt (compact 'id|p|text' for review)."""
import json, re, subprocess, sys, os, glob

SRC = "/home/user/src"
OUT = os.path.join(os.path.dirname(__file__), "src")
os.makedirs(OUT, exist_ok=True)

CHAPTERS = {
    # key: (kind, path, first_page_offset_for_display)
    "per": ("pdf", f"{SRC}/kech103.pdf", "NCERT XI (2026-27) Unit 3"),
    "d": ("pdf", f"{SRC}/lech104.pdf", "NCERT XII (2026-27) Unit 4"),
    "co": ("pdf", f"{SRC}/lech105.pdf", "NCERT XII (2026-27) Unit 5"),
    "met": ("pdf", f"{SRC}/lech106-min.pdf", "NCERT XII (old) Unit 6"),
    "p15": ("pdf", f"{SRC}/lech107-min.pdf", "NCERT XII (old) Unit 7"),
    "old11": ("ocr", f"{SRC}/ocr11/hi", "NCERT XI Part 2 (old)"),
}

JUNK = re.compile(r"^(Reprint 2026-27|Intext Questions?|Solution|Example \d+\.\d+|Chemistry|\d{1,3}|.*Block Elements$|Coordination Compounds$|General Principles and Processes of Isolation of Elements$|Classification of Elements and Periodicity in Properties$)$")

def pages_pdf(path):
    n = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", path], capture_output=True, text=True).stdout).group(1))
    for p in range(1, n + 1):
        t = subprocess.run(["pdftotext", "-raw", "-f", str(p), "-l", str(p), path, "-"], capture_output=True, text=True).stdout
        yield p, t

def pages_ocr(d):
    for f in sorted(glob.glob(d + "/p*.txt")):
        p = int(re.search(r"p(\d+)\.txt", f).group(1))
        yield p, open(f, encoding="utf-8", errors="ignore").read()

def clean_lines(t):
    out, prev = [], None
    for ln in t.splitlines():
        s = ln.strip()
        if not s or s == prev or JUNK.match(s):
            prev = s
            continue
        out.append(s)
        prev = s
    return out

ABBR = re.compile(r"(e\.g|i\.e|Fig|viz|etc|No|vs|approx|ca|Ex|Eq|Vol|cf|al|St|Dr|Mr)\.$", re.I)

def sentences(lines):
    buf = " ".join(lines)
    buf = re.sub(r"(\w)- (\w)", r"\1\2", buf)  # hyphenation
    buf = re.sub(r"\s+", " ", buf)
    parts = re.split(r"(?<=[.?!])\s+(?=[A-Z(\[])", buf)
    merged = []
    for s in parts:
        if merged and (ABBR.search(merged[-1].split(" ")[-1]) or re.search(r"[A-Z][a-z]?\d*\.$", merged[-1].split(" ")[-1]) and len(merged[-1].split(" ")[-1]) <= 6):
            merged[-1] += " " + s
        else:
            merged.append(s)
    return [m.strip() for m in merged if len(m.strip()) > 2]

def run(key):
    kind, path, label = CHAPTERS[key]
    gen = pages_pdf(path) if kind == "pdf" else pages_ocr(path)
    rows, i = [], 0
    for p, t in gen:
        for s in sentences(clean_lines(t)):
            i += 1
            rows.append({"id": i, "page": p, "text": s})
    json.dump({"label": label, "rows": rows}, open(f"{OUT}/{key}.json", "w"), ensure_ascii=False)
    with open(f"{OUT}/{key}.txt", "w") as fh:
        for r in rows:
            fh.write(f"{r['id']}|{r['page']}|{r['text']}\n")
    print(key, len(rows), "sentences")

if __name__ == "__main__":
    for k in (sys.argv[1:] or CHAPTERS):
        run(k)
