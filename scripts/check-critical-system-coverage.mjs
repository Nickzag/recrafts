import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [packageDirectory, outputFile] = process.argv.slice(2);
if (!packageDirectory || !outputFile) throw new Error("Usage: node scripts/check-critical-system-coverage.mjs <package-dir> <output-file>");
const readJson = async (file) => JSON.parse(await readFile(path.join(packageDirectory, file), "utf8"));
const tokens = (await readJson("tokens.json")).tokens;
const components = (await readJson("components.json")).components;
const layout = await readJson("layout.json");
const acceptable = (token) => token && (token.status === "confirmed" || (token.status === "observed" && token.confidence >= 0.75) || (token.status === "suggested" && token.accepted_preview_only === true));
const requirements = {
  "app-background": acceptable(tokens.find((token) => token.id === "app.background")),
  "primary-surface": acceptable(tokens.find((token) => token.id === "surface.primary")),
  "secondary-surface": acceptable(tokens.find((token) => token.id === "surface.secondary")),
  "primary-text": acceptable(tokens.find((token) => token.id === "text.primary")),
  "secondary-text": acceptable(tokens.find((token) => token.id === "text.secondary")),
  "subtle-border": acceptable(tokens.find((token) => token.id === "border.subtle")),
  "accent-policy": acceptable(tokens.find((token) => token.id === "accent.rule")),
  "radius-direction": acceptable(tokens.find((token) => token.id === "radius.direction")),
  "spacing-direction": acceptable(tokens.find((token) => token.id === "spacing.direction")),
  "typography-direction": acceptable(tokens.find((token) => token.id === "typography.direction")),
  "three-column-shell": acceptable(tokens.find((token) => token.id === "shell.three-column")) && layout.app_shell === "three-column-workbench",
};
const criticalComponents = ["Button","IconButton","NavigationRail","ToolbarGroup","InspectorPanel","InspectorSection","PropertyRow","EditorCanvas","FloatingControlIsland","Modal","EmptyState","LoadingSkeleton"];
requirements["minimum-component-contracts"] = criticalComponents.every((name) => components.some((component) => component.name === name && component.evidence_refs?.length));
const requiredStates = ["default","selected-artboard","selected-canvas-object","inspector-active","agent-suggestion-visible","modal-open","empty-project","loading-recovery"];
requirements["required-state-contracts"] = requiredStates.every((state) => layout.required_states?.includes(state));
const missing = Object.entries(requirements).filter(([, passed]) => !passed).map(([name]) => name);
const result = { status: missing.length ? "blocked" : "passed", requirements, missing, preview_only_fallbacks: tokens.filter((token) => token.accepted_preview_only).map((token) => token.id), canonical_promotion_of_fallbacks: false };
await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
if (missing.length) process.exitCode = 1;
