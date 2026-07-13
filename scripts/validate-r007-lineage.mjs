#!/usr/bin/env node
import { validateR007Package } from "../runtime/r007_validation.mjs";
const result = await validateR007Package(process.argv[2]); console.log(JSON.stringify({ status: result.status, lineage_event_type: result.lineage_event_type }));
