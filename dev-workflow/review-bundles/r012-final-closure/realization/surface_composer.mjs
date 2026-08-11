export const REQUIRED_WORKBENCH_REGIONS = ["artboard-rail", "creation-canvas", "inspector"];
export const REQUIRED_WORKBENCH_STATES = ["default","selected-artboard","selected-canvas-object","inspector-active","agent-suggestion-visible","modal-open","empty-project","loading-recovery"];

export function defineWorkbenchSurface() {
  return { surface_id: "craftsos-layoutcrafts-workbench-candidate", global_header: false, columns: 3, regions: REQUIRED_WORKBENCH_REGIONS, states: REQUIRED_WORKBENCH_STATES, status: "scaffold-only", canonical_visual_generation: "blocked-by-preflight" };
}
