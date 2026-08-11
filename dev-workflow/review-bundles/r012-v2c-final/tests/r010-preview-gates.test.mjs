import assert from "node:assert/strict";
import test from "node:test";
import { validatePreviewAccessibility, validatePreviewCoverage } from "../runtime/preview_accessibility.mjs";

const types = ["cover", "problem", "insight", "mechanism", "evidence", "use-case", "result", "cta"];
const coverage = () => ({
  coverage_id: "coverage-1",
  system_previews: ["system-board", "core-component-sheet", "theme-comparison", "source-distance-comparison"].map((type) => ({ type, file: `${type}.html` })),
  web: ["web-a", "web-b"].flatMap((structure) => [320, 390, 768, 1024, 1440].map((viewport) => ({ structure, viewport, file: `${structure}-${viewport}.png`, topology: structure === "web-b" ? "asymmetric-stacked" : "offset-split" }))),
  posters: [{ theme: "theme-derived", composition: "photographic-field", file: "poster-a.png" }, { theme: "theme-alternative-a", composition: "measured-bars", file: "poster-b.png" }],
  carousel: types.map((page_type, index) => ({ page_type, file: `carousel-${index + 1}.png` })), carousel_contact_sheet: "carousel-contact.png",
  slides: types.map((page_type, index) => ({ page_type, file: `slide-${index + 1}.png` })), slide_contact_sheet: "slide-contact.png",
  real_imagery: [{ kind: "commerce-object", license: "CC0", semantic_overlay: true, file: "object.jpg" }, { kind: "infrastructure-place", license: "CC-BY", semantic_overlay: true, file: "place.jpg" }],
  status: "pass"
});

test("complete cross-media preview coverage passes", () => {
  assert.deepEqual(validatePreviewCoverage(coverage()).errors, []);
});

test("contact sheets cannot substitute for individual Carousel, Slide or real-image previews", () => {
  const value = coverage();
  value.carousel = [{ page_type: "contact-sheet", file: value.carousel_contact_sheet }];
  value.slides = [];
  value.real_imagery[0].semantic_overlay = false;
  const result = validatePreviewCoverage(value);
  assert.ok(result.errors.some((error) => /eight individual Carousel/i.test(error)));
  assert.ok(result.errors.some((error) => /eight individual Slide/i.test(error)));
  assert.ok(result.errors.some((error) => /semantic overlay/i.test(error)));
});

test("semantic HTML, focus, reduced motion, contrast and stress cases pass", () => {
  const html = `<!doctype html><html><head><style>a:focus-visible,button:focus-visible{outline:3px solid #ffbf47;outline-offset:3px}.tap{min-width:44px;min-height:44px}@media (prefers-reduced-motion: reduce){*{animation:none!important;scroll-behavior:auto!important}}</style></head><body><header><nav><a href="#main">Skip</a></nav></header><main id="main"><h1>Instrument field</h1><figure><img src="object.jpg" alt="Measured package"><figcaption>42 units</figcaption></figure><button class="tap">Inspect</button><pre><code>42ms</code></pre></main></body></html>`;
  const result = validatePreviewAccessibility({ html, contrast_pairs: [{ contrast_ratio: 7, normal_text_status: "pass", non_text_status: "pass" }], stress_cases: ["320px", "390px", "200%-text-zoom", "long-en", "long-zh", "large-currency", "negative-value", "empty-data", "error-state", "no-image"] });
  assert.equal(result.status, "pass");
});

test("prose-only reduced-motion and invalid controls fail implementation readiness", () => {
  const html = `<html><body><div>prefers-reduced-motion supported</div><a>Open</a><div role="button">Go</div><img src="x.jpg"></body></html>`;
  const result = validatePreviewAccessibility({ html, contrast_pairs: [{ contrast_ratio: 2, normal_text_status: "fail", non_text_status: "fail" }], stress_cases: [] });
  assert.ok(result.errors.some((error) => /reduced motion/i.test(error)));
  assert.ok(result.errors.some((error) => /valid href/i.test(error)));
  assert.ok(result.errors.some((error) => /button/i.test(error)));
  assert.ok(result.errors.some((error) => /alt/i.test(error)));
});
