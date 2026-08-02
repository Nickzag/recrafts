import { readFileSync } from "node:fs";
import { validateSchema } from "./schema_validator.mjs";

const observationSchema = JSON.parse(readFileSync(new URL("../contracts/source-observation.schema.json", import.meta.url), "utf8"));
const deliverySchema = JSON.parse(readFileSync(new URL("../contracts/delivery-readiness.schema.json", import.meta.url), "utf8"));
const greenFamilies = /green|forest|lime|lemongrass|emerald/i;
const cutCorners = /cut|chamfer|notch/i;
const hex = /#[0-9a-f]{3,8}\b/ig;

const requiredComponentFields = [
  "purpose", "scope", "anatomy", "required_slots", "variants", "states", "interaction", "keyboard",
  "responsive_behavior", "accessibility_semantics", "token_dependencies", "content_constraints",
  "allowed_compositions", "forbidden_compositions", "evidence_refs", "claim_refs", "validation_rules"
];

export function validateSourceNeutralArtifactSet(value) {
  const errors = [];
  for (const [index, observation] of (value.source_observations ?? []).entries()) {
    errors.push(...validateSchema(observation, observationSchema).map((error) => `source_observations[${index}] ${error}`));
  }
  if (!(value.source_observations ?? []).length) errors.push("At least one source observation is required");

  const observationValues = new Set((value.source_observations ?? [])
    .filter((item) => item.source_specificity === "high")
    .flatMap((item) => typeof item.value === "string" ? (item.value.match(hex) ?? [item.value]) : []));
  const grammarText = JSON.stringify(value.core_grammar?.rules ?? []);
  for (const observed of observationValues) {
    if (grammarText.toLowerCase().includes(String(observed).toLowerCase())) errors.push(`Core Grammar contains exact source value ${observed}`);
  }
  if (!value.core_grammar?.grammar_id || !(value.core_grammar?.rules ?? []).length) errors.push("Core Grammar requires an identity and rules");

  const themes = value.themes ?? [];
  const byId = new Map(themes.map((theme) => [theme.theme_id, theme]));
  for (const id of ["theme-derived", "theme-alternative-a", "theme-alternative-b"]) if (!byId.has(id)) errors.push(`Missing required theme ${id}`);
  if (byId.get("theme-alternative-a") && greenFamilies.test(byId.get("theme-alternative-a").primary_family ?? "")) errors.push("theme-alternative-a must use a non-green primary family");
  if (byId.get("theme-alternative-b") && cutCorners.test(byId.get("theme-alternative-b").boundary_form ?? "")) errors.push("theme-alternative-b must avoid cut corners");
  for (const theme of themes) if (theme.core_grammar_ref !== value.core_grammar?.grammar_id) errors.push(`${theme.theme_id} does not preserve the shared Core Grammar`);

  const observationIds = new Set((value.source_observations ?? []).map((item) => item.observation_id));
  for (const token of value.tokens ?? []) {
    if (token.status === "portable" && !(token.source_observation_refs ?? []).length) errors.push(`${token.token_id} lacks source-observation provenance`);
    if ((token.source_observation_refs ?? []).some((ref) => !observationIds.has(ref))) errors.push(`${token.token_id} references an unknown source observation`);
  }

  for (const component of (value.components ?? []).filter((item) => item.maturity === "core")) {
    for (const field of requiredComponentFields) {
      const fieldValue = component[field];
      if (fieldValue === undefined || fieldValue === "" || (Array.isArray(fieldValue) && fieldValue.length === 0)) errors.push(`${component.component_id} Core component missing ${field}`);
    }
    if (!(component.validation_rules ?? []).some((rule) => /preview/i.test(rule))) errors.push(`${component.component_id} Core component lacks preview validation`);
  }

  errors.push(...validateSchema(value.delivery ?? {}, deliverySchema).map((error) => `delivery ${error}`));
  const delivery = value.delivery ?? {};
  const requiredPasses = ["identity_legal_gate", "source_distance_gate", "machine_contract_gate", "accessibility_gate", "responsive_gate"];
  if (["pilot-ready", "production-ready"].includes(delivery.status)) {
    if (!delivery.owner_visual_review) errors.push("pilot-ready requires owner visual review");
    for (const gate of requiredPasses) if (delivery[gate] !== "pass") errors.push(`${delivery.status} requires ${gate} pass`);
  }
  if (delivery.status === "production-ready" && !delivery.production_validation) errors.push("production-ready requires production validation");
  return { status: errors.length ? "blocked" : delivery.status, errors };
}
