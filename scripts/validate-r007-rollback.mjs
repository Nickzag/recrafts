#!/usr/bin/env node
import { validateR007Package } from "../runtime/r007_validation.mjs";
const result = await validateR007Package(process.argv[2]); if (result.lineage_event_type !== "rollback-created") throw new Error("Package is not a rollback"); console.log(JSON.stringify(result));
