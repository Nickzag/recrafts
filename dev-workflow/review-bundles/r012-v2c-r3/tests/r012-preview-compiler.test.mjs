import assert from "node:assert/strict";
import test from "node:test";
import { canonical } from "./r012-design-parser.test.mjs";
import * as preview from "../runtime/design_preview_renderer.mjs";

test("Preview compiles Tokens, Component anatomy/states, Composition topology, and responsive specimens", () => {
  assert.ok(preview.RENDERER_INFRASTRUCTURE_ALLOWLIST);
  const result = preview.renderDesignPreview({ designSource: canonical, generatedAt: "2026-08-09T00:00:00.000Z" });
  assert.match(result.html, /--recrafts-color-surface:\s*#f7f7f5/);
  assert.match(result.html, /data-recrafts-part="thumbnail"/);
  assert.match(result.html, /data-recrafts-state="state\.selected"/);
  assert.match(result.html, /data-recrafts-composition="composition\.workspace"/);
  assert.match(result.html, /data-recrafts-region="sidebar"/);
  assert.match(result.html, /data-recrafts-viewport="compact"/);
  assert.match(result.html, /data-recrafts-stress="dense"/);
  assert.deepEqual(result.integrity.projected_component_refs, ["component.document-row"]);
  assert.deepEqual(result.integrity.projected_state_refs, ["state.default", "state.selected"]);
  assert.deepEqual(result.integrity.viewport_coverage, ["desktop", "compact", "mobile"]);

  const changed = preview.renderDesignPreview({ designSource: canonical.replace('value: "#f7f7f5"', 'value: "#101010"'), generatedAt: "2026-08-09T00:00:00.000Z" });
  assert.match(changed.html, /--recrafts-color-surface:\s*#101010/);
  assert.notEqual(changed.integrity.projected_style_sha256, result.integrity.projected_style_sha256);
});

test("Renderer infrastructure is allowlisted, isolated, and excluded from Design Token projection", () => {
  const { html, integrity } = preview.renderDesignPreview({ designSource: canonical, generatedAt: "2026-08-09T00:00:00.000Z" });
  const infrastructure = html.match(/<style id="recrafts-renderer-infrastructure">([\s\S]*?)<\/style>/)?.[1] ?? "";
  const projected = html.match(/<style id="recrafts-design-projected">([\s\S]*?)<\/style>/)?.[1] ?? "";
  assert.ok(infrastructure.length > 0);
  assert.doesNotMatch(infrastructure, /data-recrafts-(?:visual-region|specimen|part|state)/);
  for (const value of Object.values(preview.RENDERER_INFRASTRUCTURE_ALLOWLIST)) assert.ok(infrastructure.includes(value));
  for (const value of Object.values(preview.RENDERER_INFRASTRUCTURE_ALLOWLIST)) assert.ok(!projected.includes(value) || canonical.includes(value), `infrastructure value leaked into projected styles: ${value}`);
  assert.equal(integrity.infrastructure_affects_visual_region, false);
});

test("Preview Integrity rejects style, body, metadata, coverage, and full-artifact tampering", () => {
  const result = preview.renderDesignPreview({ designSource: canonical, generatedAt: "2026-08-09T00:00:00.000Z" });
  const mutations = [
    result.html.replace("--recrafts-color-surface:#f7f7f5", "--recrafts-color-surface:#ff00ff"),
    result.html.replace("Document title", "Tampered title"),
    result.html.replace('"preview_content_sha256":"', '"preview_content_sha256":"0'),
    result.html.replace('data-recrafts-viewport="mobile"', 'data-recrafts-viewport="removed"'),
    result.html.replace('data-recrafts-part="thumbnail"', 'data-recrafts-part="fabricated"')
  ];
  for (const html of mutations) assert.throws(() => preview.validatePreviewIntegrity({ designSource: canonical, html }), /Schema validation|integrity|hash|stale|projection|tamper|coverage/i);
});
