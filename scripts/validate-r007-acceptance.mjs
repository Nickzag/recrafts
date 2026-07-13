#!/usr/bin/env node
import { validateR007Package } from "../runtime/r007_validation.mjs";
const result = await validateR007Package(process.argv[2]); if (result.package_status !== "accepted") throw new Error("Package is not accepted"); console.log(JSON.stringify(result));
