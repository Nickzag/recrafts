#!/usr/bin/env node
import { validateR007Package } from "../runtime/r007_validation.mjs";
const result = await validateR007Package(process.argv[2]); console.log(JSON.stringify({ status: result.status, correction_count: result.correction_count }));
