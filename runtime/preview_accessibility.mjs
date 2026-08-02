const requiredSystem = new Set(["system-board", "core-component-sheet", "theme-comparison", "source-distance-comparison"]);
const requiredPages = new Set(["cover", "problem", "insight", "mechanism", "evidence", "use-case", "result", "cta"]);
const requiredViewports = new Set([320, 390, 768, 1024, 1440]);
const requiredStress = new Set(["320px", "390px", "200%-text-zoom", "long-en", "long-zh", "large-currency", "negative-value", "empty-data", "error-state", "no-image"]);

const missing = (required, actual) => [...required].filter((item) => !actual.has(item));

export function validatePreviewCoverage(value) {
  const errors = [];
  const systemTypes = new Set((value.system_previews ?? []).map((item) => item.type));
  if (missing(requiredSystem, systemTypes).length) errors.push("System preview coverage is incomplete");
  for (const structure of ["web-a", "web-b"]) {
    const viewports = new Set((value.web ?? []).filter((item) => item.structure === structure).map((item) => item.viewport));
    if (missing(requiredViewports, viewports).length) errors.push(`${structure} is missing required responsive viewports`);
  }
  const webB = (value.web ?? []).filter((item) => item.structure === "web-b");
  if (webB.some((item) => /centered-full-height|viewport-rails|source-position/i.test(item.topology ?? ""))) errors.push("Web B preserves a forbidden source-like Hero topology");
  if ((value.posters ?? []).length < 2 || new Set((value.posters ?? []).map((item) => item.composition)).size < 2) errors.push("Two independently composed posters are required");
  const carouselTypes = new Set((value.carousel ?? []).map((item) => item.page_type));
  if ((value.carousel ?? []).length < 8 || missing(requiredPages, carouselTypes).length) errors.push("Eight individual Carousel pages are required; a contact sheet is not a substitute");
  const slideTypes = new Set((value.slides ?? []).map((item) => item.page_type));
  if ((value.slides ?? []).length < 8 || missing(requiredPages, slideTypes).length) errors.push("Eight individual Slide pages are required; a contact sheet is not a substitute");
  if (!value.carousel_contact_sheet) errors.push("Carousel contact sheet is required in addition to individual pages");
  if (!value.slide_contact_sheet) errors.push("Slide contact sheet is required in addition to individual pages");
  if ((value.real_imagery ?? []).length < 2) errors.push("Two licensed or original real-image previews are required");
  for (const image of value.real_imagery ?? []) {
    if (!image.license) errors.push(`${image.kind ?? "image"} lacks a source/license record`);
    if (!image.semantic_overlay) errors.push(`${image.kind ?? "image"} lacks a plausible semantic overlay`);
  }
  return { status: errors.length ? "fail" : "pass", errors };
}

export function validatePreviewAccessibility({ html = "", contrast_pairs = [], stress_cases = [] }) {
  const errors = [];
  if (!/<main\b/i.test(html) || !/<nav\b/i.test(html)) errors.push("Landmark structure requires nav and main");
  if (!/<h1\b/i.test(html)) errors.push("Heading hierarchy requires one h1");
  if (/<a\b(?![^>]*\bhref\s*=)[^>]*>/i.test(html)) errors.push("Every link requires a valid href");
  if (/<(?:div|span)\b[^>]*\brole\s*=\s*["']button["']/i.test(html)) errors.push("Interactive actions must use a native button");
  for (const image of html.match(/<img\b[^>]*>/ig) ?? []) if (!/\balt\s*=\s*["'][^"']*["']/i.test(image)) errors.push("Every image requires explicit alt behavior");
  if (/<img\b/i.test(html) && (!/<figure\b/i.test(html) || !/<figcaption\b/i.test(html))) errors.push("Evidence imagery requires figure and figcaption semantics");
  if (!/:focus-visible\b/i.test(html)) errors.push("Visible focus implementation is missing");
  if (!/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(html) || !/animation\s*:\s*none/i.test(html)) errors.push("Reduced motion must be implemented in CSS, not prose only");
  if (!/min-(?:width|height)\s*:\s*(?:4[4-9]|[5-9]\d)px/i.test(html)) errors.push("Minimum touch target implementation is missing");
  for (const pair of contrast_pairs) if (pair.contrast_ratio < 4.5 || pair.normal_text_status !== "pass" || pair.non_text_status !== "pass") errors.push("A declared contrast pair fails required usage");
  const absentStress = missing(requiredStress, new Set(stress_cases));
  if (absentStress.length) errors.push(`Content stress coverage missing: ${absentStress.join(", ")}`);
  return { status: errors.length ? "fail" : "pass", errors, checks: { contrast_pairs: contrast_pairs.length, stress_cases: stress_cases.length } };
}
