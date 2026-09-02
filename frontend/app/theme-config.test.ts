import { describe, expect, it } from "vitest";
import { THEME_PRESETS, getThemeCssVariables } from "./theme-config";

describe("theme visual contract", () => {
  it("emits the complete visual variable set for every preset", () => {
    for (const preset of THEME_PRESETS) {
      const variables = getThemeCssVariables(preset);

      expect(variables["--theme-bg"]).toBe(preset.tokens.bg);
      expect(variables["--theme-background-fallback"]).toBe(preset.visuals.background.fallback);
      expect(variables["--theme-sidebar-image"]).toBe(preset.visuals.sidebar.image ? `url("${preset.visuals.sidebar.image}")` : "none");
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

  it("keeps the default white and black presets as quiet baseline themes", () => {
    const light = THEME_PRESETS.find((preset) => preset.id === "default");
    const dark = THEME_PRESETS.find((preset) => preset.id === "midnight");

    expect(light?.name).toBe("默认白");
    expect(dark?.name).toBe("默认黑");
    expect(light?.visuals.background.image).toBe("");
    expect(dark?.visuals.background.image).toBe("");
    expect(light?.visuals.background.fallback).toBe("#f6f8fa");
    expect(dark?.visuals.background.fallback).toBe("#0d1117");
    expect(light?.visuals.scene.texture).toBe("none");
    expect(dark?.visuals.scene.texture).toBe("none");
  });

  it("uses the bundled wallpaper and translucent panels for the EVA preset", () => {
    const eva = THEME_PRESETS.find((preset) => preset.id === "eva-asuka");

    expect(eva?.visuals.background.image).toBe("/theme/asuka.png");
    expect(eva?.visuals.sidebar.image).toBe("/theme/asuka.leff-bar.jpg");
    expect(eva?.tokens.panel).toBe("#1b0e13a6");
  });
});
