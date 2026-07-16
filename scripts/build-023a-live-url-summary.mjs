#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [captureDirectory, outputFile] = process.argv.slice(2);
if (!captureDirectory || !outputFile) throw new Error("Usage: node scripts/build-023a-live-url-summary.mjs <capture-directory> <output-file>");
const root = path.resolve(captureDirectory);
const record = JSON.parse(await readFile(path.join(root, "capture-record.json"), "utf8"));
const hashFile = async (name) => createHash("sha256").update(await readFile(path.join(root, name))).digest("hex");
const summary = {
  schema_version: "1.0.0",
  evidence_class: "bounded-live-url-smoke",
  requested_url: "https://www.craft.do/",
  resolved_url: record.url,
  redirect_behavior: record.url === "https://www.craft.do/" ? "none" : "same-host-resolved",
  captured_at: record.captured_at,
  capture_status: record.status,
  source_method: "Playwright Chromium real-browser-capture",
  browser: record.browser,
  viewport: record.viewport,
  dom_css_available: record.dom.length > 0 && record.css_rules.length > 0 && record.computed_styles.length > 0,
  rendered_evidence_available: record.screenshots.length > 0 && record.screenshot_regions.length > 0,
  evidence_counts: {
    network: record.network.length, dom: record.dom.length, css_rules: record.css_rules.length,
    css_variables: record.css_variables.length, computed_styles: record.computed_styles.length,
    screenshots: record.screenshots.length, screenshot_regions: record.screenshot_regions.length,
    assets: record.assets.length, fonts: record.fonts.length
  },
  capture_record_sha256: await hashFile("capture-record.json"),
  viewport_sha256: record.screenshots.find((item) => item.kind === "viewport")?.sha256 ?? null,
  full_page_sha256: record.screenshots.find((item) => item.kind === "full-page")?.sha256 ?? null,
  missing_evidence: record.missing_evidence,
  fallback: { screenshot_available: record.screenshots.length > 0, partial_and_blocked_paths: "fixture-validated by R-006/R-008" },
  stored_payload: "summary-only; page body and screenshot pixels remain outside repository",
  live_url_smoke: record.status === "complete" ? "passed" : "failed",
  universal_url_accuracy: "not-established",
  website_replication_accuracy: "not-established",
  production_ready: false
};
await mkdir(path.dirname(path.resolve(outputFile)), { recursive: true });
await writeFile(path.resolve(outputFile), `${JSON.stringify(summary, null, 2)}\n`);
console.log(path.resolve(outputFile));
