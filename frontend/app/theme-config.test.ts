import { describe, expect, it } from "vitest";
import { THEME_PRESETS, getThemeCssVariables } from "./theme-config";

describe("theme visual contract", () => {
  it("emits the complete visual variable set for every preset", () => {
    for (const preset of THEME_PRESETS) {
      const variables = getThemeCssVariables(preset);

      expect(variables["--theme-bg"]).toBe(preset.tokens.bg);
      expect(variables["--theme-background-fallback"]).toBe(preset.visuals.background.fallback);
      expect(variables["--theme-scene-texture"]).toBe(preset.visuals.scene.texture);
      expect(variables["--theme-surface-card-hover-shadow"]).toBe(preset.visuals.surfaces.cardHoverShadow);
      expect(variables["--theme-control-primary-fill"]).toBe(preset.visuals.controls.primaryFill);
      expect(variables["--theme-signature-label"]).toBe(preset.visuals.signature.label);
    }
  });

  it("keeps the paper and cyber scenes materially distinct", () => {
    const paper = THEME_PRESETS.find((preset) => preset.id === "paper");
    const cyber = THEME_PRESETS.find((preset) => preset.id === "cyber");

    expect(paper).toBeDefined();
    expect(cyber).toBeDefined();
    expect(paper?.visuals.scene.texture).not.toBe(cyber?.visuals.scene.texture);
    expect(paper?.visuals.controls.primaryFill).not.toBe(cyber?.visuals.controls.primaryFill);
    expect(paper?.visuals.signature.displayFont).not.toBe(cyber?.visuals.signature.displayFont);
  });
});
