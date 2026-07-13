#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = process.argv[2];
const capture = JSON.parse(await readFile(path.join(root, "capture-status.json"), "utf8"));
if (!["complete", "partial", "blocked", "stale"].includes(capture.status)) throw new Error("Unknown URL lifecycle status");
if (capture.status === "partial" && !(capture.sources ?? []).some((item) => item.missing_evidence?.length)) throw new Error("Partial URL must list missing Evidence");
if (capture.status === "blocked") await readFile(path.join(root, "blocked-reason.json"));
console.log(JSON.stringify({ status: "pass", lifecycle_status: capture.status }));
