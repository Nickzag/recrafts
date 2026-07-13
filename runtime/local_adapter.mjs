import { analyzeImages } from "./extraction_runtime.mjs";

export async function run({ inputDir, outputDir }) {
  return analyzeImages({ input: inputDir, output: outputDir, single: false });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run({ inputDir: process.argv[2] ?? "input", outputDir: process.argv[3] ?? "output" }).then((result) => {
    console.log(JSON.stringify(result));
  }).catch((error) => {
    console.error(`Recraft extraction failed: ${error.message}`);
    process.exitCode = 1;
  });
}
