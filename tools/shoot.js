// Headless check from file:// : node tools/shoot.js <outdir> [steps.json]
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const out = process.argv[2] || "/tmp/shots";
  require("fs").mkdirSync(out, { recursive: true });
  const steps = process.argv[3] ? JSON.parse(require("fs").readFileSync(process.argv[3], "utf8")) : [{ shot: "home" }];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && !/ERR_FAILED|net::/.test(m.text()) && errors.push("console: " + m.text()));
  await page.route(/^https?:/, (r) => r.abort());
  await page.goto("file://" + path.resolve(__dirname, "../index.html"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  for (const s of steps) {
    if (s.click) await page.click(s.click);
    if (s.type) await page.fill(s.type[0], s.type[1]);
    if (s.key) await page.keyboard.press(s.key);
    if (s.eval) console.log("eval:", JSON.stringify(await page.evaluate(s.eval)));
    if (s.scroll != null) await page.evaluate((y) => window.scrollTo(0, y), s.scroll);
    if (s.mouse) { await page.mouse.move(s.mouse[0], s.mouse[1]); await page.mouse.down(); await page.mouse.move(s.mouse[2], s.mouse[3], { steps: 6 }); await page.mouse.up(); }
    if (s.vp) await page.setViewportSize({ width: s.vp[0], height: s.vp[1] });
    await page.waitForTimeout(s.wait || 450);
    if (s.shot) await page.screenshot({ path: path.join(out, s.shot + ".png"), fullPage: !!s.full });
  }
  console.log(errors.length ? errors.join("\n") : "no errors");
  await browser.close();
})();
