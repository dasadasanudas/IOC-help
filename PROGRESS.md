# Residue · progress

## v0.4 (2026-10-11): own gap audit, history/GK removed, condensed wording
- Gap audit: every PDF sentence not yet used was listed and checked by me; the useful ones were added (tools/adds/*.txt). 2,001 verified candidate lines.
- History/GK/trivia dropped (triads, octaves, discoverers, Werner biography, ancient Indian metallurgy, filler, duplicate summary lines): 1,899 lines shown.
- Every line is rewritten crisp (tools/condense/<ch>.txt, key|text; "-" drop, "=" keep, "§Sec§" move). The NCERT original is kept in each line ("o").
- Header toggle: Condensed / NCERT words (remembered). Click a line's p.N to open the other wording under it. Search covers both. Pinned export includes both.
- Pins keyed on the original wording, so v0.3 pins carry over.

## Next phase (asked, not started)
- Advanced layer from J.D. Lee and other books (e.g. Prussian blue vs Turnbull's blue), with a Main / Main+Adv toggle.

## v0.3 (2026-10-11): PDF-only rebuild
- All memory-written content removed (old fact cards, old colour list, salt analysis).
- 1,758 NCERT lines, each verified against the PDF sentence(s) it cites (tools/build_lines.py, letters-only coverage >= 0.88; table/equation retypes flagged "Table/eq.").
  per 121 · hyd 154 · s 204 · g13 91 · g14 109 · g15 205 · g16 166 · g17 112 · g18 52 · d 167 · f 59 · co 177 · met 141. Exceptions: 256.
- 139 colours, each stated in its cited sentence (tools/build_colours.py). Hex is only a rendering of the stated colour name.
- Modes: Condensed NCERT (section order, kind colour-coding + filter), Elements & compounds (element -> compounds written in lines -> compound sheet), Exceptions ledger, Colours (gradient field picker + wall, each linked to its NCERT line), Pinned (+ text export), Drift, search.
- Sources: kech103, lech104, lech105 (2026-27); lech106/lech107 (2020-21); old XI Part 2 units 9-11 (OCR, formulas retyped).

## Not in the PDFs (so not in the app)
- "NH3 acts as a weak field ligand" is not stated literally; the PDF's [Ni(NH3)6]2+ sp3d2 outer-orbital lines are included instead.
- Salt analysis (not in any supplied PDF).

## Extending
Add a line: picks/<ch>.txt `<sentence ids> text` (ids from tools/src/<key>.txt), then `python3 tools/build_lines.py`.
Add a colour: picks_colours.txt, then `python3 tools/build_colours.py`.
