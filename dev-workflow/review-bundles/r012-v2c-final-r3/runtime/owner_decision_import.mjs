import { createHash } from "node:crypto";
import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSchema, loadSchema } from "./schema_validator.mjs";

const decisionSchema = loadSchema(new URL("../contracts/owner-decision.schema.json", import.meta.url));
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

export async function importOwnerDecision({ packageDirectory, decisionFile, approvedPackageDirectory, interoperabilityFixture = false }) {
  const [decision, sourceManifest, packageManifest, coverage, readiness] = await Promise.all([
    readJson(decisionFile),
    readJson(path.join(packageDirectory, "source-manifest.json")),
    readJson(path.join(packageDirectory, "recrafts-package.json")),
    readJson(path.join(packageDirectory, "validation/critical-system-coverage.json")),
    readJson(path.join(packageDirectory, "validation/realization-readiness.json"))
  ]);
  assertSchema(decision, decisionSchema, "Owner Decision");
  if (decision.reviewed_package_id !== sourceManifest.package_id || packageManifest.package_id !== sourceManifest.package_id) throw Object.assign(new Error("Owner Decision does not match the reviewed package"), { code: "HOST_ACTION_REQUIRED" });
  if (packageManifest.status !== "awaiting-owner-review" || readiness.canonical_visual_generation_authorized === true) throw Object.assign(new Error("Owner Decision import requires an awaiting-review package"), { code: "PACKAGE_INVALID" });
  if (coverage.status !== "passed") throw Object.assign(new Error("Owner Decision cannot promote a package with incomplete canonical classification coverage"), { code: "PACKAGE_INVALID" });
  const fixtureDecision = decision.decision_source === "deterministic-interoperability-fixture";
  if (fixtureDecision !== interoperabilityFixture) throw Object.assign(new Error("Fixture decisions require explicit interoperability fixture mode and cannot represent project-owner approval"), { code: "HOST_ACTION_REQUIRED" });
  const approvedPackageId = `package-${hash({ reviewed_package_id: decision.reviewed_package_id, decision_set_id: decision.decision_set_id, verdict: decision.verdict, decision_source: decision.decision_source }).slice(0, 16)}`;
  if (approvedPackageId === sourceManifest.package_id) throw Object.assign(new Error("Owner Decision must create a new package identity"), { code: "PACKAGE_INVALID" });
  await cp(packageDirectory, approvedPackageDirectory, { recursive: true });
  const decisionFields = { owner_decision_set_id: decision.decision_set_id, decision_status: decision.decision_status, decision_source: decision.decision_source };
  await Promise.all([
    writeJson(path.join(approvedPackageDirectory, "source-manifest.json"), { ...sourceManifest, package_id: approvedPackageId, ...decisionFields }),
    writeJson(path.join(approvedPackageDirectory, "recrafts-package.json"), { ...packageManifest, package_id: approvedPackageId, supersedes_package_id: sourceManifest.package_id, ...decisionFields, status: "ready-for-realization" }),
    writeJson(path.join(approvedPackageDirectory, "review/owner-decision-set.json"), { ...decision, approved_package_id: approvedPackageId, confirmed_candidates: [], rejected_candidates: [] }),
    writeJson(path.join(approvedPackageDirectory, "validation/realization-readiness.json"), { status: "ready", canonical_visual_generation_authorized: true, blockers: [], owner_decision_set_id: decision.decision_set_id, decision_status: decision.decision_status, decision_source: decision.decision_source })
  ]);
  const designFile = path.join(approvedPackageDirectory, "design.md");
  const design = await readFile(designFile, "utf8");
  await writeFile(designFile, design.replace(`package_id: ${sourceManifest.package_id}`, `package_id: ${approvedPackageId}`));
  return { approved_package_id: approvedPackageId, previous_package_id: sourceManifest.package_id, decision_set_id: decision.decision_set_id, decision_status: decision.decision_status, decision_source: decision.decision_source };
}
