#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const VIEWPORTS = { desktop: { width: 1440, height: 1000 }, compact: { width: 768, height: 1000 }, mobile: { width: 390, height: 844 } };

export async function capturePreviewEvidence({ previewFile, outputDirectory }) {
  previewFile = path.resolve(previewFile);
  outputDirectory = path.resolve(outputDirectory);
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const screenshots = {};
  const allComputed = {};
  try {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(viewport);
      await page.goto(pathToFileURL(previewFile).href, { waitUntil: "load" });
      const file = path.join(outputDirectory, `${name}.png`);
      await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
      screenshots[name] = { file: `${name}.png`, viewport, sha256: sha256(await readFile(file)) };
      allComputed[name] = await page.evaluate(() => {
          const root = getComputedStyle(document.documentElement);
          const specimen = getComputedStyle(document.querySelector("[data-recrafts-specimen]"));
          const visualRegion = getComputedStyle(document.querySelector("[data-recrafts-visual-region]"));
          const infrastructure = document.querySelector("#recrafts-renderer-infrastructure")?.textContent ?? "";
          const tokenNames = [...document.styleSheets].flatMap((sheet) => {
            try { return [...sheet.cssRules].flatMap((rule) => [...rule.cssText.matchAll(/--recrafts-[a-z0-9-]+/g)].map((match) => match[0])); } catch { return []; }
          });
          return {
            root_tokens: Object.fromEntries([...new Set(tokenNames)].sort().map((name) => [name, root.getPropertyValue(name).trim()])),
            specimen: { backgroundColor: specimen.backgroundColor, color: specimen.color, borderTopColor: specimen.borderTopColor, borderTopWidth: specimen.borderTopWidth, borderRadius: specimen.borderRadius, paddingTop: specimen.paddingTop, font: specimen.font },
            visual_region: { backgroundColor: visualRegion.backgroundColor, color: visualRegion.color, font: visualRegion.font },
            infrastructure_selector_audit: /data-recrafts-(?:visual-region|specimen|part|state)/.test(infrastructure) ? "FAIL" : "PASS",
            regions: [...document.querySelectorAll("[data-recrafts-region]")].map((el) => ({ id: el.getAttribute("data-recrafts-region"), visibility: el.getAttribute("data-recrafts-visibility"), display: getComputedStyle(el).display }))
          };
        });
    }
  } finally {
    await browser.close();
  }
  const first = allComputed.desktop || allComputed.compact || allComputed.mobile || {};
  const evidence = {
    schema: "recrafts.browser-evidence/v1", status: first.infrastructure_selector_audit === "PASS" ? "PASS" : "FAIL",
    preview_sha256: sha256(await readFile(previewFile)), browser_engine: "playwright-chromium", screenshots,
    computed_styles: { desktop: allComputed.desktop || null, compact: allComputed.compact || null, mobile: allComputed.mobile || null },
    infrastructure_selector_audit: first.infrastructure_selector_audit,
    infrastructure_affects_visual_region: first.infrastructure_selector_audit !== "PASS"
  };
  await writeFile(path.join(outputDirectory, "computed-styles.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [previewFile, outputDirectory] = process.argv.slice(2);
  if (!previewFile || !outputDirectory) throw new Error("Usage: capture-r012-preview-evidence.mjs <preview.html> <output-directory>");
  const result = await capturePreviewEvidence({ previewFile, outputDirectory });
  process.stdout.write(`${JSON.stringify({ status: result.status, screenshots: Object.keys(result.screenshots) }, null, 2)}\n`);
  if (result.status !== "PASS") process.exitCode = 1;
}
