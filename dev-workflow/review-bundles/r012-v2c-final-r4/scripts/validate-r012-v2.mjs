#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseDesignMd, compileDesignIr } from "../packages/recrafts-design/index.mjs";
import { validatePreviewIntegrity } from "../runtime/design_preview_renderer.mjs";

const base = path.join(process.cwd(), "examples/golden-candidates/recrafts-design-v1");
const designSource = await readFile(path.join(base, "design-system/design.md"), "utf8");
const preview = await readFile(path.join(base, "design-system/preview.html"), "utf8");
const readiness = JSON.parse(await readFile(path.join(base, "qualification/readiness.json"), "utf8"));
const result = JSON.parse(await readFile(path.join(base, "qualification/result.json"), "utf8"));
compileDesignIr(parseDesignMd(designSource));
validatePreviewIntegrity({ designSource, html: preview });
const publicFiles = (await readdir(path.join(base, "design-system"))).sort();
if (publicFiles.some((file) => !["assets", "design.md", "preview.html"].includes(file))) throw new Error(`Public Design System contains internal artifact: ${publicFiles.join(", ")}`);
if (readiness.status !== "candidate" || readiness.agent_usable !== false || readiness.owner_decision !== "MISSING" || readiness.release_promotion !== "BLOCKED") throw new Error("Golden fixture manufactured acceptance");
if (readiness.real_source_source_fidelity !== "NOT_RUN" || readiness.blind_agent_status !== "PENDING" || readiness.linux_status !== "LINUX_PENDING") throw new Error("Qualification status overclaims real execution");
if (result.gate_a.gate_a_runtime_qualification !== "PASS" || result.gate_a.real_source_source_fidelity !== "NOT_RUN" || result.blind.blind_agent_status !== "PENDING" || result.linux.readiness !== "LINUX_PENDING") throw new Error("Generated qualification result violates frozen boundaries");
process.stdout.write(`${JSON.stringify({ status: "PASS", public_files: publicFiles, release_promotion: "BLOCKED", linux_status: "LINUX_PENDING" }, null, 2)}\n`);

