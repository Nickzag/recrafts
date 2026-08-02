import { runValidator } from "./validate-r011r-a.mjs";
const result = await runValidator(process.argv[2] || "examples/golden-candidates/craft-product-ui-r011r/evidence-package", "source-observed-token-coverage");
console.log(JSON.stringify({ validator: result.validator, status: result.status, package_id: result.package_id, token_count: result.token_count, errors: result.errors }, null, 2));
if (result.status !== "pass") process.exitCode = 1;
