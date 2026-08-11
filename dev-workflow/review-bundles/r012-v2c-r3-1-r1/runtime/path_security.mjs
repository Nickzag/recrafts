import { existsSync } from "node:fs";
import { lstat, realpath, readdir } from "node:fs/promises";
import path from "node:path";

const forbidden = /(?:^|[\\/])(?:oracle|expected-[^\\/]*)(?:[\\/]|$)/i;
const inside = (child, root) => { const relative = path.relative(root, child); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); };
const assertLocalString = (value) => {
  if (typeof value !== "string" || !value) throw Object.assign(new Error("Path is required"), { code: "SCHEMA_VALIDATION_FAILED" });
  if (/^[a-z]+:\/\//i.test(value)) throw Object.assign(new Error("Remote URL is not a local path"), { code: "UNSAFE_INPUT_PATH" });
  if (value.split(/[\\/]+/).includes("..")) throw Object.assign(new Error("Path traversal is not allowed"), { code: "UNSAFE_INPUT_PATH" });
};
const safeStat = async (file, code) => {
  const stat = await lstat(file).catch(() => null);
  if (!stat) throw Object.assign(new Error("Input not found"), { code: "INPUT_NOT_FOUND" });
  if (!stat.isFile() && !stat.isDirectory()) throw Object.assign(new Error("Special filesystem objects are not allowed"), { code });
  return stat;
};

export async function resolveWorkingRoot(value) {
  assertLocalString(value);
  const root = await realpath(path.resolve(value));
  const stat = await safeStat(root, "UNSAFE_INPUT_PATH");
  if (!stat.isDirectory()) throw Object.assign(new Error("Working root must be a directory"), { code: "UNSAFE_INPUT_PATH" });
  return root;
}

export async function resolveSafeInput({ value, workingRoot, allowedTypes = ["file", "directory"] }) {
  assertLocalString(value);
  const resolved = await realpath(path.resolve(workingRoot, value)).catch(() => null);
  if (!resolved) throw Object.assign(new Error("Input not found"), { code: "INPUT_NOT_FOUND" });
  if (!inside(resolved, workingRoot) || forbidden.test(resolved)) throw Object.assign(new Error("Unsafe input path"), { code: "UNSAFE_INPUT_PATH" });
  const stat = await safeStat(resolved, "UNSAFE_INPUT_PATH");
  if ((stat.isFile() && !allowedTypes.includes("file")) || (stat.isDirectory() && !allowedTypes.includes("directory"))) throw Object.assign(new Error("Unsupported input type"), { code: "UNSAFE_INPUT_PATH" });
  return resolved;
}

export async function resolveSafeOutput({ value, workingRoot, inputs = [] }) {
  assertLocalString(value);
  const candidate = path.resolve(workingRoot, value);
  const parent = await realpath(path.dirname(candidate));
  const parentStat = await safeStat(parent, "UNSAFE_OUTPUT_PATH");
  if (!parentStat.isDirectory()) throw Object.assign(new Error("Output parent must be a directory"), { code: "UNSAFE_OUTPUT_PATH" });
  const resolved = path.join(parent, path.basename(candidate));
  if (!inside(resolved, workingRoot) || forbidden.test(resolved)) throw Object.assign(new Error("Unsafe output path"), { code: "UNSAFE_OUTPUT_PATH" });
  for (const input of inputs) if (inside(resolved, input) || inside(input, resolved)) throw Object.assign(new Error("Input/output containment is not allowed"), { code: "UNSAFE_OUTPUT_PATH" });
  if (existsSync(resolved)) {
    const stat = await safeStat(resolved, "UNSAFE_OUTPUT_PATH");
    if (!stat.isDirectory()) throw Object.assign(new Error("Output must be a directory"), { code: "UNSAFE_OUTPUT_PATH" });
    if ((await readdir(resolved)).length) throw Object.assign(new Error("Output is not empty"), { code: "OUTPUT_NOT_EMPTY" });
  }
  return resolved;
}

export function toArtifactPath({ file, outputRoot }) {
  const relative = path.relative(outputRoot, file);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw Object.assign(new Error("Artifact escapes output root"), { code: "UNSAFE_OUTPUT_PATH" });
  return relative.split(path.sep).join("/");
}
