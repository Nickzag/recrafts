export function createRecraftsArtifacts({ brand = "", taste = "" } = {}) {
  const designMd = `# Design System

## Brand Signals

${brand.trim() || "No brand context provided."}

## Taste Signals

${taste.trim() || "No taste context provided."}

## Color

- Ink: #1F2933
- Paper: #F8F5EF
- Signal: #D66A35

## Typography

- Headline: editorial sans
- Body: readable sans

## Layout Rules

- One main idea per page.
- Keep hierarchy clear and editable.
`;

  return {
    designMd,
    designTokens: {
      artifact_id: "artifact_design_tokens_mock",
      type: "design_tokens",
      colors: { ink: "#1F2933", paper: "#F8F5EF", signal: "#D66A35" },
      typography: { headline: "editorial-sans", body: "readable-sans" },
    },
    layoutRules: {
      artifact_id: "artifact_layout_rules_mock",
      rules: ["single_main_idea_per_page", "clear_hierarchy", "editable_blocks"],
    },
    components: {
      artifact_id: "artifact_components_mock",
      components: ["cover", "content_page", "closing_page"],
    },
    templatePatterns: {
      artifact_id: "artifact_template_patterns_mock",
      patterns: ["cover", "insight", "evidence", "closing"],
    },
  };
}
