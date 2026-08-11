#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { handleEnvelope, protocolInfo } from "./interop_contract.mjs";

if (process.argv.includes("--help")) {
  process.stdout.write("recraft-interop: one JSON request on stdin, one JSON response on stdout\n");
} else if (process.argv.includes("--version")) {
  process.stdout.write("0.5.0-rc.1\n");
} else {
  const raw = readFileSync(0, "utf8");
  let request;
  let response;
  try { request = JSON.parse(raw); response = await handleEnvelope(request); }
  catch { response = { protocol_version: protocolInfo.protocol_version, request_id: "unavailable", operation: "unavailable", status: "failed", host_handshake: {}, host_action: null, artifacts: [], validation: {}, warnings: [], error: { code: "INVALID_JSON", message: "Input must be exactly one valid JSON object" } }; }
  process.stdout.write(`${JSON.stringify(response)}\n`);
  if (response.status === "failed") process.exitCode = 1;
}
