import path from "node:path";
import { runFidelityRound } from "../realization/fidelity_runtime.mjs";

const root = process.cwd();
const outputDirectory = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "examples/golden-candidates/crafts-ui-multi-image/fidelity/r004-v2");
const result = await runFidelityRound({
  baselinePackageDirectory: path.join(root, "examples/golden-candidates/crafts-ui-multi-image/packages/package-ffa63ca8b0ea69af"),
  baselineRealizationDirectory: path.join(root, "examples/golden-candidates/crafts-ui-multi-image/realizations/r003b-v2"),
  ownerReviewFile: path.join(root, "review/visual-realization-review.md"),
  outputDirectory,
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
