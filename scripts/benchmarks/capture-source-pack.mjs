#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

export function detectImageMetadata(bytes) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return { format: "png", extension: ".png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes.length >= 30 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    const chunk = bytes.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { format: "webp", extension: ".webp", width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
    if (chunk === "VP8 " && bytes.length >= 30) return { format: "webp", extension: ".webp", width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L" && bytes.length >= 25) {
      const b0 = bytes[21]; const b1 = bytes[22]; const b2 = bytes[23]; const b3 = bytes[24];
      return { format: "webp", extension: ".webp", width: 1 + b0 + ((b1 & 0x3f) << 8), height: 1 + ((b1 & 0xc0) >> 6) + (b2 << 2) + ((b3 & 0x0f) << 10) };
    }
    return { format: "webp", extension: ".webp", width: null, height: null };
  }
  if (bytes.length >= 10 && ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) return { format: "gif", extension: ".gif", width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  return { format: "unknown", extension: ".bin", width: null, height: null };
}

export function selectBehanceProjectModuleUrls(assets, projectId) {
  const unique = new Set();
  for (const asset of assets ?? []) {
    if (asset.kind !== "img" || typeof asset.url !== "string") continue;
    const url = new URL(asset.url);
    if (url.hostname !== "mir-s3-cdn-cf.behance.net" || !/\/project_modules\/1400_webp\//.test(url.pathname) || (projectId && !url.pathname.includes(projectId))) continue;
    unique.add(url.href);
  }
  return [...unique];
}

export function selectDownloadTransport(environment = process.env) {
  return environment.HTTPS_PROXY || environment.https_proxy || environment.ALL_PROXY || environment.all_proxy ? "curl" : "fetch";
}

export async function downloadProjectModule(url, environment = process.env) {
  if (selectDownloadTransport(environment) === "curl") {
    const result = spawnSync("curl", ["--fail", "--silent", "--show-error", "--proto", "=https", "--max-time", "30", "--connect-timeout", "10", url], { maxBuffer: 30 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`project module download failed: ${result.stderr?.toString() || result.status}`);
    const bytes = result.stdout;
    if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new Error("project module byte limit failed");
    return bytes;
  }
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000), headers: { "user-agent": "Recrafts-Benchmark-Capture/1.0" } });
  if (!response.ok || response.type === "opaqueredirect") throw new Error(`project module download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new Error("project module byte limit failed");
  return bytes;
}

export async function captureSourcePack(config) {
  const sourcePackRoot = path.resolve(config.source_pack_root);
  const captureBin = path.resolve(config.recraft_capture_bin);
  if (!captureBin.includes(`${path.sep}node_modules${path.sep}.bin${path.sep}`) || !existsSync(captureBin)) throw new Error("capture requires an installed recraft-capture binary");
  if (existsSync(sourcePackRoot) && readdirSync(sourcePackRoot).length) throw new Error("Source Pack output must be empty");
  const pageRoot = path.join(sourcePackRoot, "page");
  mkdirSync(pageRoot, { recursive: true });
  mkdirSync(path.join(sourcePackRoot, "sections"), { recursive: true });
  mkdirSync(path.join(sourcePackRoot, "contact-sheet"), { recursive: true });
  const startedAt = new Date().toISOString();
  const result = spawnSync(captureBin, [config.source_url, pageRoot], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`installed Recrafts capture failed: ${result.stderr || result.stdout}`);
  const capture = json(path.join(pageRoot, "capture-record.json"));
  const projectId = new URL(config.source_url).pathname.match(/\/gallery\/(\d+)/)?.[1] ?? null;
  const projectModuleUrls = config.asset_mode === "behance-project-modules" ? selectBehanceProjectModuleUrls(capture.assets, projectId) : [];
  const visualRecords = [...(capture.screenshots ?? []), ...(capture.screenshot_regions ?? [])].filter((item) => item.file);
  const files = [];
  for (const [index, record] of visualRecords.entries()) {
    const source = path.join(pageRoot, record.file);
    const extension = path.extname(source) || ".png";
    const target = path.join(sourcePackRoot, "sections", `section-${String(index + 1).padStart(2, "0")}${extension}`);
    copyFileSync(source, target);
    const bytes = readFileSync(target);
    const metadata = detectImageMetadata(bytes);
    files.push({ path: path.relative(sourcePackRoot, target).split(path.sep).join("/"), sha256: sha(bytes), width: metadata.width, height: metadata.height, media_type: `image/${metadata.format}`, source_record: record.evidence_type ?? record.kind ?? "capture-visual", analysis_source: projectModuleUrls.length === 0 });
  }
  for (const [index, url] of projectModuleUrls.entries()) {
    const bytes = await downloadProjectModule(url);
    const metadata = detectImageMetadata(bytes);
    if (metadata.format === "unknown") throw new Error("project module image format is unsupported");
    const target = path.join(sourcePackRoot, "sections", `project-module-${String(index + 1).padStart(2, "0")}${metadata.extension}`);
    writeFileSync(target, bytes);
    files.push({ path: path.relative(sourcePackRoot, target).split(path.sep).join("/"), sha256: sha(bytes), width: metadata.width, height: metadata.height, media_type: `image/${metadata.format}`, source_record: "behance-project-module", source_url: url, analysis_source: true });
  }
  if (!files.length) throw new Error("capture produced no visual Source Pack records");
  const contactSource = files.find((item) => item.analysis_source) ?? files[0];
  const contactPath = `contact-sheet/review-reference${path.extname(contactSource.path)}`;
  const contact = path.join(sourcePackRoot, contactPath);
  copyFileSync(path.join(sourcePackRoot, contactSource.path), contact);
  const contactBytes = readFileSync(contact); const contactMetadata = detectImageMetadata(contactBytes);
  files.push({ path: contactPath, sha256: sha(contactBytes), width: contactMetadata.width, height: contactMetadata.height, media_type: `image/${contactMetadata.format}`, source_record: "review-contact-reference", analysis_source: false });
  const animatedModuleCount = (capture.assets ?? []).filter((asset) => asset.kind === "img" && /\/project_modules\/1400\/[^/]+\.gif$/i.test(asset.url ?? "") && (!projectId || asset.url.includes(projectId))).length;
  const pack = { source_pack_id: config.source_pack_id, corpus_id: config.corpus_id, source_url: config.source_url, capture_id: capture.capture_id, capture_status: animatedModuleCount ? "partial" : capture.status, browser_capture_status: capture.status, missing_sources: animatedModuleCount ? ["animated-project-modules"] : [], captured_at: capture.captured_at, viewport: capture.viewport, browser: capture.browser, capture_scope: projectModuleUrls.length ? "isolated-public-static-project-modules" : "browser-screenshots", project_module_count: projectModuleUrls.length, animated_module_exclusion_count: animatedModuleCount, files, redistribution_status: "local-only", redistribution_policy: "metadata-and-hashes-only" };
  writeJson(path.join(sourcePackRoot, "source-pack.json"), pack);
  writeJson(path.join(sourcePackRoot, "capture-log.json"), { started_at: startedAt, completed_at: new Date().toISOString(), installed_capture_binary: captureBin, status: capture.status, stdout_sha256: sha(result.stdout), stderr_sha256: sha(result.stderr) });
  const checksums = ["source-pack.json", "capture-log.json", ...files.map((item) => item.path)].sort().map((file) => `${sha(readFileSync(path.join(sourcePackRoot, file)))}  ${file}`).join("\n");
  writeFileSync(path.join(sourcePackRoot, "checksums.sha256"), `${checksums}\n`);
  return pack;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const configFile = process.argv[2];
  if (!configFile) throw new Error("Usage: capture-source-pack <config.json>");
  const result = await captureSourcePack(json(path.resolve(configFile)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
