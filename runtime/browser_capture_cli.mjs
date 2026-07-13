#!/usr/bin/env node
import path from "node:path";
import { capturePublicUrl } from "./browser_capture.mjs";

const [url, output = "browser-capture"] = process.argv.slice(2);
if (!url) {
  process.stderr.write("Usage: recraft-capture <public-https-url> [output-directory]\n");
  process.exitCode = 2;
} else {
  try {
    const record = await capturePublicUrl({ url, outputDirectory: path.resolve(output) });
    process.stdout.write(`${JSON.stringify({ status: record.status, capture_record: path.join(path.resolve(output), "capture-record.json"), missing_evidence: record.missing_evidence })}\n`);
    if (record.status !== "complete") process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
