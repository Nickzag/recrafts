#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(process.argv[2] ?? "examples/golden-candidates/spade-source-neutral-v2");
const html = path.join(root, "comparison/old-vs-new/contact-sheet.html");
const output = path.join(root, "comparison/old-vs-new/preview-contact-sheet.png");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1800 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.screenshot({ path: output, type: "png", fullPage: true });
} finally {
  await browser.close();
}
process.stdout.write(`${JSON.stringify({ status: "complete", output })}\n`);
