import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const required = ["screen-manifest.json", "region-manifest.json", "visual-measurements.json", "state-aware-color-observations.json", "source-observed-visual-tokens.json", "component-instances.json", "cross-screen-recurrence.json", "evidence-weighting-report.json", "unknowns.json", "r011r-a-evidence-package.json", "artifact-set.json", "review/owner-decision.json"];
const validationFiles = ["tier-a-region-coverage.json", "visual-measurement-coverage.json", "state-aware-color.json", "source-observed-token-coverage.json", "evidence-weighting.json", "r011r-a-no-oracle.json"];
const requiredRoles = (family) => /workspace-(grid|list)|editor|empty/i.test(family) ? ["application-sidebar", "content-header"] : /settings/i.test(family) ? ["application-sidebar", "content-header", "control"] : ["content-header"];
const readJson = async (directory, relative) => JSON.parse(await readFile(path.join(directory, relative), "utf8"));

export async function runValidator(directory, mode = "all") {
  const errors = [];
  const exists = new Set();
  const walk = async (current, prefix = "") => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const relative = path.join(prefix, entry.name);
      if (entry.isDirectory()) await walk(path.join(current, entry.name), relative);
      else exists.add(relative);
    }
  };
  await walk(directory);
  for (const file of required) if (!exists.has(file)) errors.push("missing required artifact: " + file);
  const manifest = await readJson(directory, "screen-manifest.json");
  const regions = (await readJson(directory, "region-manifest.json")).regions;
  const measurements = (await readJson(directory, "visual-measurements.json")).measurements;
  const colors = (await readJson(directory, "state-aware-color-observations.json")).observations;
  const tokens = (await readJson(directory, "source-observed-visual-tokens.json")).tokens;
  const components = (await readJson(directory, "component-instances.json")).instances;
  const recurrence = (await readJson(directory, "cross-screen-recurrence.json")).recurrence;
  const weighting = await readJson(directory, "evidence-weighting-report.json");
  const packageManifest = await readJson(directory, "r011r-a-evidence-package.json");
  const artifactSet = await readJson(directory, "artifact-set.json");
  const owner = await readJson(directory, "review/owner-decision.json");
  const screenIds = new Set(manifest.screens.map((screen) => screen.screen_id));
  const regionIds = new Set(regions.map((region) => region.region_id));
  const measurementIds = new Set(measurements.map((measurement) => measurement.measurement_id));
  const add = (condition, message) => { if (!condition) errors.push(message); };
  add(manifest.schema_version === "3.1.0" && manifest.protocol_version === "1.2", "screen manifest protocol/schema mismatch");
  add(packageManifest.stage === "R-011R-A" && packageManifest.status === "awaiting-r011r-a-review", "package stage/status mismatch");
  add(packageManifest.owner_verdict === "PENDING" && owner.verdict === "PENDING", "owner review must remain pending");
  add(packageManifest.downstream_generation_authorized === false, "downstream generation must remain blocked");
  add(artifactSet.package_id === packageManifest.package_id && artifactSet.artifact_set_id === packageManifest.artifact_set_id, "Artifact Set identity mismatch");
  for (const screen of manifest.screens) for (const role of requiredRoles(screen.screen_family)) add(regions.some((region) => region.screen_id === screen.screen_id && region.role === role), "Tier A required Region missing: " + screen.screen_id + ":" + role);
  for (const region of regions) {
    add(regionIds.has(region.region_id), "Region identity missing");
    add(region.coordinates.normalized.length === 4 && region.crop_sha256 && /^[a-f0-9]{64}$/.test(region.crop_sha256), "Region geometry/crop hash invalid: " + region.region_id);
    for (const ref of region.measurement_refs) add(measurementIds.has(ref), "Region measurement reference missing: " + region.region_id + ":" + ref);
  }
  for (const measurement of measurements) add(regionIds.has(measurement.region_id) && Boolean(measurement.method), "Measurement coverage invalid: " + measurement.measurement_id);
  add(measurements.length >= regions.length, "Measurement coverage is below Region coverage");
  add(colors.some((color) => ["selected", "active", "focus"].includes(color.state)), "State-aware selected/active/focus evidence missing");
  for (const color of colors) add(regionIds.has(color.region_id) && !(color.state === "available-option" && /selected|active|default/i.test(color.role)), "State-aware color collision: " + color.observation_id);
  add(tokens.length > 0, "Source-observed visual Token list is empty");
  for (const token of tokens) {
    add(token.screen_refs.every((screen) => screenIds.has(screen)), "Token screen reference invalid: " + token.observation_token_id);
    add(token.region_refs.every((region) => regionIds.has(region)), "Token Region reference invalid: " + token.observation_token_id);
    add(token.measurement_refs.every((measurement) => measurementIds.has(measurement)), "Token measurement parent missing: " + token.observation_token_id);
    add(!(token.scope === "marketing-brand" && token.cross_screen_recurrence > 0), "Marketing Token recurrence dominates: " + token.observation_token_id);
  }
  for (const row of recurrence) add(row.recurrence_count === row.screen_refs.length, "Recurrence count mismatch: " + row.recurrence_id);
  add(weighting.status === "pass" && weighting.gates?.tier_a_region_coverage === true && weighting.gates?.source_observed_token_coverage === true, "Evidence weighting gates are not pass");
  add(components.every((instance) => regionIds.has(instance.region_id) && !/^card$/i.test(instance.component_candidate)), "Component candidate is invalid or generic Card");
  const artifactHashes = artifactSet.artifact_hashes || {};
  for (const [relative, expected] of Object.entries(artifactHashes)) {
    if (!exists.has(relative)) errors.push("Artifact Set file missing: " + relative);
    else add(sha(await readFile(path.join(directory, relative))) === expected, "Artifact hash mismatch: " + relative);
  }
  if (mode === "no-oracle" || mode === "all") {
    const forbidden = /(quiet[-_ ]frame|signal[-_ ]column|source-neutral|portable-token|CraftsOS|design\.md)/i;
    for (const relative of exists) {
      add(!relative.endsWith(".png") && !relative.endsWith(".jpg") && !relative.endsWith(".jpeg"), "Raw screenshot must remain outside package: " + relative);
      if (relative.endsWith(".json") || relative.endsWith(".md")) add(!forbidden.test(await readFile(path.join(directory, relative), "utf8")), "Oracle or downstream output marker found: " + relative);
    }
  }
  const status = errors.length ? "failed" : "pass";
  return { status, validator: mode, package_id: packageManifest.package_id, artifact_set_id: packageManifest.artifact_set_id, screen_count: manifest.screens.length, region_count: regions.length, measurement_count: measurements.length, token_count: tokens.length, errors };
}

const main = async () => {
  const directory = process.argv[2];
  const mode = process.argv[3] || "all";
  if (!directory) throw new Error("Usage: node scripts/validate-r011r-a.mjs <package-directory> [mode]");
  const result = await runValidator(directory, mode);
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "pass") process.exitCode = 1;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
