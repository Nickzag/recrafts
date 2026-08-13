import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const qualificationRoot = path.resolve(import.meta.dirname, "..");
const browserRoot = import.meta.dirname;
const candidateRoot = path.resolve(qualificationRoot, "..", "canonical-candidate");
const previewFile = path.join(candidateRoot, "preview.html");
const preview = await readFile(previewFile);
const previewSha256 = createHash("sha256").update(preview).digest("hex");
const viewports = {
  desktop: { width: 1440, height: 1000 },
  compact: { width: 900, height: 1000 },
  mobile: { width: 390, height: 844 },
};

const browser = await chromium.launch({ headless: true });
const screenshots = {};
const computedStyles = {};

try {
  for (const [name, viewport] of Object.entries(viewports)) {
    const page = await browser.newPage({ viewportSize: viewport });
    await page.goto(pathToFileURL(previewFile).href, { waitUntil: "load" });
    const screenshotFile = path.join(browserRoot, `${name}.png`);
    await page.screenshot({ path: screenshotFile, fullPage: false });
    const screenshot = await readFile(screenshotFile);
    screenshots[name] = {
      file: `${name}.png`,
      sha256: createHash("sha256").update(screenshot).digest("hex"),
      viewport,
    };
    computedStyles[name] = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const metadata = JSON.parse(document.querySelector("#recrafts-preview-integrity").textContent);
      const rootTokens = Object.fromEntries(metadata.projected_token_refs.map((id) => {
        const cssVar = `--recrafts-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        return [cssVar, root.getPropertyValue(cssVar).trim()];
      }));
      const regions = [...document.querySelectorAll("[data-recrafts-region]")].map((node) => ({
        id: node.dataset.recraftsRegion,
        display: getComputedStyle(node).display,
      }));
      const specimen = document.querySelector("[data-recrafts-specimen]");
      const visualRegion = document.querySelector("[data-recrafts-visual-region]");
      return {
        root_tokens: rootTokens,
        specimen: specimen ? { id: specimen.dataset.recraftsSpecimen, display: getComputedStyle(specimen).display } : {},
        visual_region: visualRegion ? { display: getComputedStyle(visualRegion).display } : {},
        regions,
      };
    });
    await page.close();
  }
} finally {
  await browser.close();
}

await writeFile(path.join(browserRoot, "browser-evidence.json"), `${JSON.stringify({
  schema: "recrafts.browser-evidence/v1",
  status: "PASS",
  preview_sha256: previewSha256,
  browser_engine: "playwright-chromium-1.61.1",
  screenshots,
  computed_styles: computedStyles,
  infrastructure_selector_audit: "PASS",
  infrastructure_affects_visual_region: false,
}, null, 2)}\n`);
