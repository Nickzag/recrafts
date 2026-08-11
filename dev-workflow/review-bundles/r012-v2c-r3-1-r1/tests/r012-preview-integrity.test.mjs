import assert from "node:assert/strict";
import test from "node:test";
import { canonical } from "./r012-design-parser.test.mjs";

const preview = await import("../runtime/design_preview_renderer.mjs").catch(() => ({}));

test("preview is a deterministic projection of design.md with required coverage", () => {
  assert.equal(typeof preview.renderDesignPreview, "function");
  const result = preview.renderDesignPreview({ designSource: canonical, generatedAt: "2026-08-09T00:00:00.000Z" });
  for (const label of ["Foundations", "Core Components", "Composition", "Stress Cases", "Empty", "Dense", "Sparse", "Long content", "Loading", "Error", "Compact viewport", "Mobile viewport"]) assert.match(result.html, new RegExp(label, "i"));
  assert.match(result.html, new RegExp(result.integrity.design_sha256));
  assert.equal(preview.validatePreviewIntegrity({ designSource: canonical, html: result.html }).valid, true);
});

test("preview validator fails closed for stale source and renderer-only rules", () => {
  const result = preview.renderDesignPreview({ designSource: canonical, generatedAt: "2026-08-09T00:00:00.000Z" });
  assert.throws(() => preview.validatePreviewIntegrity({ designSource: `${canonical}\nchanged`, html: result.html }), /stale|hash/i);
  assert.throws(() => preview.validatePreviewIntegrity({ designSource: canonical, html: result.html.replace("</body>", "<div data-recrafts-rule=\"unsupported.rule\"></div></body>") }), /integrity|hash|not present|unsupported/i);
});
