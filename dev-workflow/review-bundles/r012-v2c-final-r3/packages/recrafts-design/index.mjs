export { parseDesignMd } from "./src/parser.mjs";
export { compileDesignIr, validateDesign, validateDesignIr, semanticDesignIrHashInput } from "./src/compiler.mjs";
export { checkCompatibility, compareVersions } from "./src/compatibility.mjs";
export { CANONICAL_SECTIONS, CERTAINTIES, COMPONENT_MATURITIES, DESIGN_SCHEMA, DESIGN_STATUSES } from "./src/schema.mjs";
import { parseDesignMd } from "./src/parser.mjs";
import { compileDesignIr } from "./src/compiler.mjs";
export { loadDesignRelease } from "./src/consumer.mjs";
export function loadDesignSystem(source, { allowCandidate = false } = {}) { const document = parseDesignMd(source); if (document.frontMatter.status === "accepted") throw new Error("Accepted design.md requires the governed Design Release loader"); if (!allowCandidate) throw new Error("Candidate Design System is blocked unless allowCandidate is explicitly true"); return { document, ir: compileDesignIr(document) }; }
