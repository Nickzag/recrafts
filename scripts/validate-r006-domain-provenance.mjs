#!/usr/bin/env node
import { validateR006Package } from "../runtime/r006_validation.mjs";
const result = await validateR006Package(process.argv[2]);
console.log(JSON.stringify({ status: result.status, domain_count: result.domain_count }));
