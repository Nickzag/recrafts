import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REQUIRED = new Map([
  ["network", "network-response"], ["dom", "dom-node"], ["css_rules", "css-rule"],
  ["computed_styles", "computed-style"], ["screenshots", "screenshot"],
  ["screenshot_regions", "screenshot-region"], ["assets", "asset"], ["fonts", "font"]
]);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const uniqueRecords = (items) => [...new Map(items.map((item) => [JSON.stringify(item), item])).values()];
const canonicalUrl = (value) => { const url = new URL(value); url.hash = ""; return url.href; };
const pngSize = (bytes) => ({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
const isPrivateAddress = (address) => /^(?:127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])|::1$|fc|fd|fe80)/i.test(address);

export async function assertPublicCaptureUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Browser capture requires a public HTTPS URL");
  if (/localhost/i.test(url.hostname) || /checkout|subscription|download/i.test(url.pathname)) throw new Error("Browser capture URL crosses a safety boundary");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Browser capture URL resolves to a private network");
  return url;
}

export async function validateBrowserCapture(record, captureDirectory, { expectedUrl } = {}) {
  if (record?.fixture_kind !== "real-browser-capture") throw new Error("Capture must declare fixture_kind real-browser-capture");
  if (!record.captured_at || !record.browser?.name || !record.browser?.version) throw new Error("Real browser capture metadata is incomplete");
  if (expectedUrl && canonicalUrl(record.url) !== canonicalUrl(expectedUrl)) throw new Error("Capture URL does not match requested URL");
  const missing = [];
  for (const [key, type] of REQUIRED) {
    if (!Array.isArray(record[key]) || record[key].length === 0) missing.push(type);
    else if (uniqueRecords(record[key]).length !== record[key].length) missing.push(`duplicate-${type}`);
  }
  for (const screenshot of record.screenshots ?? []) {
    try {
      const file = path.resolve(captureDirectory, screenshot.file);
      if (!file.startsWith(`${path.resolve(captureDirectory)}${path.sep}`)) throw new Error("outside capture directory");
      await access(file);
      const bytes = await readFile(file);
      if (!bytes.length || (screenshot.sha256 && screenshot.sha256 !== sha(bytes))) throw new Error("pixel digest mismatch");
      const declared = /^(\d+)x(\d+)$/.exec(screenshot.viewport ?? "");
      const png = bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
      if (!declared || !png || bytes.readUInt32BE(16) !== Number(declared[1]) || bytes.readUInt32BE(20) !== Number(declared[2])) throw new Error("pixel dimensions do not match declared viewport");
    } catch { if (!missing.includes("screenshot")) missing.push("screenshot"); }
  }
  return { status: missing.length ? "partial" : "complete", missing_evidence: missing };
}

export async function capturePublicUrl({ url: value, outputDirectory, viewport = { width: 1440, height: 900 } }) {
  const requested = await assertPublicCaptureUrl(value);
  const { chromium } = await import("playwright");
  await mkdir(path.join(outputDirectory, "regions"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const network = [];
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    page.on("response", (response) => {
      if (network.length < 250) network.push({ url: response.url(), status: response.status(), content_type: response.headers()["content-type"] ?? null, etag: response.headers().etag ?? null, last_modified: response.headers()["last-modified"] ?? null, resource_type: response.request().resourceType() });
    });
    const response = await page.goto(requested.href, { waitUntil: "networkidle", timeout: 45000 });
    const finalUrl = new URL(page.url());
    if (finalUrl.hostname !== requested.hostname) throw new Error("Cross-host redirect is not allowed");
    if (!response || response.status() >= 400) throw new Error(`Browser navigation failed with HTTP ${response?.status() ?? "unknown"}`);
    const extracted = await page.evaluate(() => {
      const selectorFor = (element) => {
        if (element.id) return `#${CSS.escape(element.id)}`;
        const name = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (!parent) return name;
        const peers = [...parent.children].filter((item) => item.tagName === element.tagName);
        return peers.length === 1 ? `${selectorFor(parent)} > ${name}` : `${selectorFor(parent)} > ${name}:nth-of-type(${peers.indexOf(element) + 1})`;
      };
      const nodes = [...document.querySelectorAll("header,nav,main,section,article,h1,h2,h3,button,a")].slice(0, 160);
      const dom = nodes.map((node) => ({ selector: selectorFor(node), tag: node.tagName.toLowerCase(), role: node.getAttribute("role"), text: (node.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 240) }));
      const cssRules = [];
      for (const sheet of [...document.styleSheets]) {
        try { for (const rule of [...sheet.cssRules]) { if (cssRules.length >= 300) break; cssRules.push({ selector: rule.selectorText ?? null, css_text: rule.cssText.slice(0, 1000), stylesheet: sheet.href ?? "inline" }); } } catch { cssRules.push({ selector: null, css_text: "cross-origin stylesheet; rule text unavailable", stylesheet: sheet.href }); }
      }
      const rootStyle = getComputedStyle(document.documentElement);
      const cssVariables = [...rootStyle].filter((name) => name.startsWith("--")).slice(0, 160).map((name) => ({ name, value: rootStyle.getPropertyValue(name).trim() }));
      const computedStyles = nodes.slice(0, 40).map((node) => { const style = getComputedStyle(node); return { selector: selectorFor(node), display: style.display, position: style.position, color: style.color, background_color: style.backgroundColor, font_family: style.fontFamily, font_size: style.fontSize, font_weight: style.fontWeight, line_height: style.lineHeight, border_radius: style.borderRadius, padding: style.padding, gap: style.gap }; });
      const assets = [...document.querySelectorAll("img,source,link[rel='stylesheet'],script[src]")].slice(0, 250).map((node) => ({ kind: node.tagName.toLowerCase(), url: node.currentSrc || node.src || node.href || node.getAttribute("srcset") }));
      const fonts = [...document.fonts].map((font) => ({ family: font.family, style: font.style, weight: font.weight, status: font.status }));
      if (!fonts.length) fonts.push({ family: rootStyle.fontFamily, status: document.fonts.status, note: "No enumerated custom FontFace; computed root family recorded" });
      return { title: document.title, dom, cssRules, cssVariables, computedStyles, assets, fonts };
    });
    const html = await page.content();
    const screenshotFile = `viewport-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: path.join(outputDirectory, screenshotFile), type: "png" });
    const screenshotBytes = await readFile(path.join(outputDirectory, screenshotFile));
    const fullPageFile = "full-page.png";
    await page.screenshot({ path: path.join(outputDirectory, fullPageFile), type: "png", fullPage: true });
    const fullPageBytes = await readFile(path.join(outputDirectory, fullPageFile));
    const fullPageSize = pngSize(fullPageBytes);
    const screenshots = [
      { kind: "viewport", viewport: `${viewport.width}x${viewport.height}`, file: screenshotFile, sha256: sha(screenshotBytes), bytes: screenshotBytes.length },
      { kind: "full-page", viewport: `${fullPageSize.width}x${fullPageSize.height}`, file: fullPageFile, sha256: sha(fullPageBytes), bytes: fullPageBytes.length }
    ];
    const screenshotRegions = [];
    for (const [index, selector] of ["header", "main h1", "main"].entries()) {
      const locator = page.locator(selector).first();
      const box = await locator.boundingBox().catch(() => null);
      if (!box) continue;
      const file = `regions/region-${index + 1}.png`;
      await locator.screenshot({ path: path.join(outputDirectory, file), type: "png" }).catch(() => null);
      screenshotRegions.push({ selector, screenshot_index: 0, box, file });
    }
    const record = {
      fixture_kind: "real-browser-capture", status: "complete", url: finalUrl.href, captured_at: new Date().toISOString(),
      browser: { name: "chromium", version: browser.version() }, viewport, title: extracted.title, content_sha256: sha(html),
      network: uniqueRecords(network), dom: uniqueRecords(extracted.dom), css_rules: uniqueRecords(extracted.cssRules), css_variables: uniqueRecords(extracted.cssVariables),
      computed_styles: uniqueRecords(extracted.computedStyles), screenshots, screenshot_regions: uniqueRecords(screenshotRegions),
      assets: uniqueRecords(extracted.assets), fonts: uniqueRecords(extracted.fonts)
    };
    const validation = await validateBrowserCapture(record, outputDirectory, { expectedUrl: requested.href });
    record.status = validation.status; record.missing_evidence = validation.missing_evidence;
    const writeJson = (name, value) => writeFile(path.join(outputDirectory, name), `${JSON.stringify(value, null, 2)}\n`);
    await Promise.all([
      writeJson("capture-record.json", record),
      writeJson("capture-metadata.json", { url: record.url, captured_at: record.captured_at, browser: record.browser, viewport, status: record.status, missing_evidence: record.missing_evidence, content_sha256: record.content_sha256 }),
      writeJson("network-responses.json", record.network), writeJson("dom-evidence.json", record.dom),
      writeJson("css-evidence.json", { rules: record.css_rules, variables: record.css_variables }),
      writeJson("computed-style-evidence.json", record.computed_styles), writeJson("screenshot-evidence.json", record.screenshots),
      writeJson("asset-evidence.json", record.assets), writeJson("font-evidence.json", record.fonts),
      writeJson("capture-log.json", { stages: ["navigate", "network", "dom", "css", "computed-style", "screenshot", "regions", "assets", "fonts"], status: record.status })
    ]);
    return record;
  } finally { await browser.close(); }
}
