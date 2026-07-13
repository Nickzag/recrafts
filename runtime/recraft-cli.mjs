#!/usr/bin/env node
import { analyzeImages, analyzeWebsite } from "./extraction_runtime.mjs";

const [command, ...args] = process.argv.slice(2);
function option(name, fallback) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback; }
function required(name) { const value = option(name); if (!value) throw new Error(`Missing ${name}`); return value; }

try {
  let result;
  const identity = { hostAgent: option("--host-agent", "unavailable"), model: option("--model", "unavailable"), hostCapabilities: option("--host-capabilities", "files,structured-output").split(",").filter(Boolean) };
  if (command === "analyze-image") result = await analyzeImages({ input: required("--input"), output: required("--output"), single: true, ...identity });
  else if (command === "analyze-images") result = await analyzeImages({ input: required("--input"), output: required("--output"), ...identity });
  else if (command === "analyze-website") result = await analyzeWebsite({ url: required("--url"), output: required("--output"), routes: option("--routes", "").split(",").filter(Boolean), action: option("--action"), screenshot: option("--screenshot"), ...identity });
  else throw new Error("Usage: recraft-cli <analyze-image|analyze-images|analyze-website> [options]");
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(`Recraft extraction failed: ${error.message}`);
  process.exitCode = 1;
}
