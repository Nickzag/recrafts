export type DesignStatus = "candidate" | "accepted";
export type Certainty = "measured" | "observed" | "inferred" | "unknown";
export interface DesignFrontMatter {
  schema: "recrafts.design/v1"; id: string; name: string; version: string; status: DesignStatus;
  release_id: string | null; parent_release: string | null; evidence_revision: string;
  decision_revision: string | null; derived_from: string[]; generated_by: string;
  generated_at: string; confidence: { overall: number }; agent_usable: boolean;
}
export interface FoundationToken {
  id: string; role: string; value?: string | number | boolean; range?: [string | number, string | number];
  certainty: Certainty; confidence: number; source_relationship: string; usage: string; forbidden_usage: string;
}
export type TokenBindings = Partial<Record<"background" | "text" | "border" | "border_width" | "radius" | "padding" | "gap" | "font" | "accent", string>>;
export interface ComponentSpecimen { element: "article" | "button" | "div" | "nav" | "section" | "input"; sample_content: string[]; token_bindings: TokenBindings; state_bindings: Record<string, TokenBindings> }
export interface DesignComponent {
  id: string; role: string; maturity: "observed" | "candidate" | "core" | "extension" | "rejected";
  anatomy: string[]; required_parts: string[]; optional_parts: string[]; allowed_children: string[];
  forbidden_children: string[]; variants: string[]; states: string[]; token_usage: string[];
  content_archetypes: string[]; layout_constraints: string[]; responsive_behavior: string;
  accessibility_behavior: string; allowed_variation: string; unknowns: string[]; specimen: ComponentSpecimen;
}
export interface DesignRegion { id: string; role: string; component_refs: string[] }
export interface DesignComposition { id: string; role: string; required_regions: string[]; optional_regions: string[]; constraints: string[]; layout: { display: "grid" | "flex"; columns: string[]; gap_token: string; region_order: string[] }; regions: DesignRegion[] }
export interface DesignState { id: string; trigger: string; transition: string; precedence: string; mutual_exclusion: string[]; keyboard_behavior: string; state_persistence: string; visual_delta: string; accessibility_semantics: string; certainty: Certainty; visual_tokens: TokenBindings }
export interface DesignViewport { preserved_regions: string[]; collapsed_regions: string[]; relocated_regions: string[]; priority_order: string[]; min_width?: number; max_width?: number }
export interface DesignConstraints { forbidden_patterns: string[]; known_unknowns: string[]; allowed_deviation: string[]; unsupported_behaviors: string[] }
export interface ParsedDesignDocument { frontMatter: DesignFrontMatter; overview: string; structured: { foundations: Record<string, FoundationToken[]>; compositions: DesignComposition[]; components: DesignComponent[]; states: DesignState[]; responsive: { desktop: DesignViewport; compact: DesignViewport; mobile: DesignViewport; content_archetypes: string[] }; agentRules: string[]; constraints: DesignConstraints }; sections: Array<{ key: string; heading: string; body: string }>; source: string }
export interface DesignIr { schema: "recrafts.design-ir/v1"; generated_notice: "GENERATED · DO NOT EDIT · NOT AUTHORING SOURCE"; authoring_source: "design.md"; design_system: Pick<DesignFrontMatter, "id" | "name" | "version" | "status" | "release_id" | "parent_release" | "evidence_revision" | "decision_revision" | "derived_from" | "confidence">; overview: string; foundations: Record<string, FoundationToken[]>; compositions: DesignComposition[]; components: DesignComponent[]; states: DesignState[]; responsive: { desktop: DesignViewport; compact: DesignViewport; mobile: DesignViewport }; content_archetypes: string[]; agent_rules: string[]; constraints: DesignConstraints; agent_usable: boolean }
export interface DesignRelease { schema: "recrafts.design-release/v2"; release_id: string; version: string; release_kind: "promotion" | "rollback"; status: "accepted"; agent_usable: true; parent_release: string | null; candidate_revision: string | null; evidence_revision: string; decision_revision: string; candidate_design_sha256: string; release_design_sha256: string; semantic_ir_sha256: string; preview_artifact_sha256: string; gate_a_report_sha256: string; gate_b_report_sha256: string; decision_receipt_sha256: string; artifact_hashes: Record<string, string>; created_at: string; immutable: true; release_sha256: string }
export interface LoadedDesignRelease { release: DesignRelease; document: ParsedDesignDocument; ir: DesignIr; designSource: string; previewHtml: string }
export function parseDesignMd(source: string): ParsedDesignDocument;
export function compileDesignIr(document: ParsedDesignDocument): DesignIr;
export function loadDesignSystem(source: string, options?: { allowCandidate?: boolean }): { document: ParsedDesignDocument; ir: DesignIr };
export function validateDesign(document: ParsedDesignDocument): { valid: true; errors: [] };
export function validateDesignIr(ir: DesignIr): { valid: true; errors: [] };
export function loadDesignRelease(input: { releaseDirectory: string; expectedReleaseId: string; expectedVersion: string }): Promise<LoadedDesignRelease>;
export function compareVersions(current: string, next: string): -1 | 0 | 1;
export function checkCompatibility(input: { current: string | { version: string }; next: string | { version: string }; requiredChange?: "patch" | "minor" | "major"; explicitPromotion?: boolean }): { compatible: boolean; reason?: string; actual_change?: string; required_change?: string };
