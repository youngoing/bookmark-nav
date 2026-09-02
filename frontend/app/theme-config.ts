import type { ThemeId, ThemeMode } from "@loomark/shared";

export type { ThemeId, ThemeMode } from "@loomark/shared";

export type ThemeTokens = {
  bg: string;
  panel: string;
  panelElevated: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentDark: string;
  controlBg: string;
  controlHover: string;
  controlSelected: string;
  controlSelectedText: string;
  onAccent: string;
  textSubtle: string;
  textFaint: string;
  iconMuted: string;
  inputBorder: string;
  focusRing: string;
  danger: string;
  dangerSurface: string;
  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  backdrop: string;
  tableHeader: string;
  faviconBg: string;
  upgradeSurface: string;
  skeleton: string;
  skeletonShine: string;
  radius: string;
  cardShadow: string;
};

export type ThemeBackground = {
  image: string;
  fallback: string;
  position: string;
  size: "cover" | "contain";
  overlay: string;
};

export type ThemeScene = {
  canvasBlendMode: string;
  canvasOpacity: string;
  texture: string;
  textureOpacity: string;
  foreground: string;
  foregroundOpacity: string;
  foregroundAccent: string;
  foregroundAccentOpacity: string;
  animationDuration: string;
};

export type ThemeSurfaces = {
  borderColor: string;
  backdropFilter: string;
  chromeShadow: string;
  cardEdge: string;
  cardHoverBorder: string;
  cardHoverShadow: string;
  cardHoverTransform: string;
  brandRadius: string;
  brandShadow: string;
};

export type ThemeControls = {
  primaryFill: string;
  primaryHoverFill: string;
  primaryShadow: string;
  selectedFill: string;
  selectedShadow: string;
  fieldShadow: string;
};

export type ThemeSignature = {
  label: string;
  labelColor: string;
  labelFont: string;
  rule: string;
  mark: string;
  markRadius: string;
  markShadow: string;
  displayFont: string;
  displayShadow: string;
};

export type ThemeVisuals = {
  background: ThemeBackground;
  scene: ThemeScene;
  surfaces: ThemeSurfaces;
  controls: ThemeControls;
  signature: ThemeSignature;
};

export type ThemePreset = {
  id: ThemeId;
  name: string;
  description: string;
  mode: Exclude<ThemeMode, "system">;
  preview: string;
  tokens: ThemeTokens;
  visuals: ThemeVisuals;
};

const baseLight: ThemeTokens = {
  bg: "#f7f8fa",
  panel: "#ffffff",
  panelElevated: "#ffffff",
  ink: "#172033",
  muted: "#7d8799",
  line: "#e8ebf0",
  accent: "#536dfe",
  accentDark: "#4058df",
  controlBg: "#ffffff",
  controlHover: "#f1f3ff",
  controlSelected: "#e7ebff",
  controlSelectedText: "#4058df",
  onAccent: "#ffffff",
  textSubtle: "#687386",
  textFaint: "#a3acba",
  iconMuted: "#8b95a5",
  inputBorder: "#dfe4eb",
  focusRing: "#536dfe14",
  danger: "#c94f5f",
  dangerSurface: "#fff5f6",
  success: "#258361",
  successSurface: "#e9f9f1",
  warning: "#ee843c",
  warningSurface: "#fff1e7",
  backdrop: "#17203340",
  tableHeader: "#fafbfc",
  faviconBg: "#f5f6f8",
  upgradeSurface: "#f8f5ff",
  skeleton: "#edf0f4",
  skeletonShine: "#f8f9fb",
  radius: "8px",
  cardShadow: "0 8px 25px #26334a0d",
};

const baseVisuals: Omit<ThemeVisuals, "background"> = {
  scene: {
    canvasBlendMode: "normal",
    canvasOpacity: ".94",
    texture: "none",
    textureOpacity: "0",
    foreground: "none",
    foregroundOpacity: "0",
    foregroundAccent: "none",
    foregroundAccentOpacity: "0",
    animationDuration: "18s",
  },
  surfaces: {
    borderColor: "var(--theme-line)",
    backdropFilter: "none",
    chromeShadow: "none",
    cardEdge: "transparent",
    cardHoverBorder: "color-mix(in srgb, var(--theme-accent) 48%, var(--theme-line))",
    cardHoverShadow: "var(--theme-card-shadow)",
    cardHoverTransform: "translateY(-2px)",
    brandRadius: "8px",
    brandShadow: "none",
  },
  controls: {
    primaryFill: "var(--theme-accent)",
    primaryHoverFill: "var(--theme-accent-dark)",
    primaryShadow: "none",
    selectedFill: "var(--theme-control-selected)",
    selectedShadow: "none",
    fieldShadow: "none",
  },
  signature: {
    label: '"INDEX"',
    labelColor: "var(--theme-accent)",
    labelFont: "700 8px/1 ui-monospace, SFMono-Regular, Consolas, monospace",
    rule: "linear-gradient(90deg, var(--theme-accent), transparent)",
    mark: "var(--theme-accent)",
    markRadius: "50%",
    markShadow: "none",
    displayFont: "inherit",
    displayShadow: "none",
  },
};

type ThemeVisualOverrides = {
  background: ThemeBackground;
  scene?: Partial<ThemeScene>;
  surfaces?: Partial<ThemeSurfaces>;
  controls?: Partial<ThemeControls>;
  signature?: Partial<ThemeSignature>;
};

function createVisuals(overrides: ThemeVisualOverrides): ThemeVisuals {
  return {
    background: overrides.background,
    scene: { ...baseVisuals.scene, ...overrides.scene },
    surfaces: { ...baseVisuals.surfaces, ...overrides.surfaces },
    controls: { ...baseVisuals.controls, ...overrides.controls },
    signature: { ...baseVisuals.signature, ...overrides.signature },
  };
}

function toCssVariableName(name: string): string {
  return `--theme-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

export function getThemeCssVariables(theme: ThemePreset): Record<string, string> {
  const background = theme.visuals.background;
  const scene = theme.visuals.scene;
  const surfaces = theme.visuals.surfaces;
  const controls = theme.visuals.controls;
  const signature = theme.visuals.signature;
  const tokenVariables = Object.fromEntries(
    Object.entries(theme.tokens).map(([name, value]) => [toCssVariableName(name), value]),
  );

  return {
    ...tokenVariables,
    "--theme-background-image": background.image ? `url("${background.image.replaceAll('"', "%22")}")` : "none",
    "--theme-background-fallback": background.fallback,
    "--theme-background-position": background.position,
    "--theme-background-size": background.size,
    "--theme-background-overlay": background.overlay,
    "--theme-scene-canvas-blend-mode": scene.canvasBlendMode,
    "--theme-scene-canvas-opacity": scene.canvasOpacity,
    "--theme-scene-texture": scene.texture,
    "--theme-scene-texture-opacity": scene.textureOpacity,
    "--theme-scene-foreground": scene.foreground,
    "--theme-scene-foreground-opacity": scene.foregroundOpacity,
    "--theme-scene-foreground-accent": scene.foregroundAccent,
    "--theme-scene-foreground-accent-opacity": scene.foregroundAccentOpacity,
    "--theme-scene-animation-duration": scene.animationDuration,
    "--theme-surface-border-color": surfaces.borderColor,
    "--theme-surface-backdrop-filter": surfaces.backdropFilter,
    "--theme-surface-chrome-shadow": surfaces.chromeShadow,
    "--theme-surface-card-edge": surfaces.cardEdge,
    "--theme-surface-card-hover-border": surfaces.cardHoverBorder,
    "--theme-surface-card-hover-shadow": surfaces.cardHoverShadow,
    "--theme-surface-card-hover-transform": surfaces.cardHoverTransform,
    "--theme-surface-brand-radius": surfaces.brandRadius,
    "--theme-surface-brand-shadow": surfaces.brandShadow,
    "--theme-control-primary-fill": controls.primaryFill,
    "--theme-control-primary-hover-fill": controls.primaryHoverFill,
    "--theme-control-primary-shadow": controls.primaryShadow,
    "--theme-control-selected-fill": controls.selectedFill,
    "--theme-control-selected-shadow": controls.selectedShadow,
    "--theme-control-field-shadow": controls.fieldShadow,
    "--theme-signature-label": signature.label,
    "--theme-signature-label-color": signature.labelColor,
    "--theme-signature-label-font": signature.labelFont,
    "--theme-signature-rule": signature.rule,
    "--theme-signature-mark": signature.mark,
    "--theme-signature-mark-radius": signature.markRadius,
    "--theme-signature-mark-shadow": signature.markShadow,
    "--theme-signature-display-font": signature.displayFont,
    "--theme-signature-display-shadow": signature.displayShadow,
  };
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: "default",
    name: "默认蓝",
    description: "清晰、克制，适合日常管理书签",
    mode: "light",
    preview: "linear-gradient(135deg, #f7f8fa 50%, #536dfe 50%)",
    visuals: createVisuals({
      background: {
        image: "",
        fallback:
          "linear-gradient(135deg, #f7f8fa 0%, #dfe5ff 46%, #536dfe 100%)",
        position: "center",
        size: "cover",
        overlay:
          "linear-gradient(90deg, #f7f8fac0 0%, #f7f8fa82 72%, #f7f8fab0 100%)",
      },
      scene: {
        texture: "linear-gradient(90deg, #536dfe16 1px, transparent 1px), linear-gradient(#536dfe12 1px, transparent 1px)",
        textureOpacity: ".36",
        foreground: "linear-gradient(112deg, transparent 0 68%, #536dfe1f 68.2%, transparent 70%)",
        foregroundOpacity: ".7",
      },
      surfaces: { backdropFilter: "blur(10px)", chromeShadow: "0 8px 28px #26334a0d" },
      controls: { primaryShadow: "0 7px 16px #536dfe38" },
      signature: { label: '"INDEX // BLUE"' },
    }),
    tokens: {
      ...baseLight,
      panel: "#ffffffd9",
      panelElevated: "#fffffff2",
    },
  },
  {
    id: "midnight",
    name: "深夜黑",
    description: "降低亮度，适合夜间专注浏览",
    mode: "dark",
    preview: "linear-gradient(135deg, #11151d 50%, #8293ff 50%)",
    visuals: createVisuals({
      background: {
        image: "",
        fallback:
          "radial-gradient(circle at 78% 20%, #536dfe66 0 1px, transparent 2px), radial-gradient(circle at 62% 34%, #8293ff55 0 1px, transparent 2px), linear-gradient(135deg, #11151d, #24213f 58%, #11151d)",
        position: "center",
        size: "cover",
        overlay:
          "linear-gradient(90deg, #11151dcc 0%, #11151d80 72%, #11151db0 100%)",
      },
      scene: {
        canvasOpacity: ".98",
        texture: "radial-gradient(circle at 16% 24%, #ffffff99 0 1px, transparent 2px), radial-gradient(circle at 68% 12%, #8293ff99 0 1px, transparent 2px), radial-gradient(circle at 84% 62%, #ffffff66 0 1px, transparent 2px)",
        textureOpacity: ".58",
        foreground: "linear-gradient(180deg, transparent 0 52%, #8293ff26 52.2%, transparent 67%)",
        foregroundOpacity: ".7",
      },
      surfaces: { backdropFilter: "blur(14px)", cardEdge: "#8293ff66", cardHoverShadow: "0 14px 30px #00000055" },
      signature: { label: '"NIGHT // 00:00"', markShadow: "0 0 9px var(--theme-accent)" },
    }),
    tokens: {
      ...baseLight,
      bg: "#11151d",
      panel: "#1a202bd9",
      panelElevated: "#202733",
      ink: "#edf1f7",
      muted: "#9aa6b8",
      line: "#2b3442",
      accent: "#8293ff",
      accentDark: "#9aa8ff",
      controlBg: "#151b25",
      controlHover: "#252d3d",
      controlSelected: "#303b58",
      controlSelectedText: "#b8c3ff",
      onAccent: "#11151d",
      textSubtle: "#b5c0d0",
      textFaint: "#a8b3c2",
      iconMuted: "#9aa3b1",
      inputBorder: "#2b3442",
      focusRing: "#8293ff2b",
      danger: "#f08a98",
      dangerSurface: "#3a2028",
      success: "#6bd3ab",
      successSurface: "#19372f",
      warning: "#f5a467",
      warningSurface: "#3a2a1f",
      backdrop: "#00000066",
      tableHeader: "#151b25",
      faviconBg: "#252d38",
      upgradeSurface: "#28223a",
      skeleton: "#273140",
      skeletonShine: "#354154",
      cardShadow: "0 10px 28px #0000002b",
    },
  },
  {
    id: "sakura",
    name: "樱花粉",
    description: "轻柔的粉色主题，适合内容收藏",
    mode: "light",
    preview: "linear-gradient(135deg, #fff8fa 50%, #e8799a 50%)",
    visuals: createVisuals({
      background: {
        image: "",
        fallback:
          "radial-gradient(circle at 82% 18%, #e8799a55 0 22px, transparent 23px), radial-gradient(circle at 70% 34%, #f1a9bd66 0 16px, transparent 17px), linear-gradient(135deg, #fff8fa, #f9dbe5 58%, #e8799a)",
        position: "center",
        size: "cover",
        overlay:
          "linear-gradient(90deg, #fff8fad0 0%, #fff8fa70 72%, #fff8faa8 100%)",
      },
      scene: {
        texture: "radial-gradient(ellipse at 12% 18%, #ffffffaa 0 4px, transparent 5px), radial-gradient(ellipse at 68% 12%, #e8799a99 0 5px, transparent 6px), radial-gradient(ellipse at 84% 62%, #f1a9bd99 0 4px, transparent 5px)",
        textureOpacity: ".48",
        foreground: "linear-gradient(115deg, transparent 0 70%, #d75b821c 71%, transparent 73%)",
        foregroundOpacity: ".78",
      },
      surfaces: { cardEdge: "#d75b8266", cardHoverShadow: "0 13px 26px #b9436922", brandShadow: "0 5px 14px #d75b8244" },
      signature: { label: '"SPRING // PETAL"', mark: "#d75b82", markRadius: "50% 50% 50% 0" },
    }),
    tokens: {
      ...baseLight,
      bg: "#fff8fa",
      panel: "#ffffffd9",
      line: "#f3dce4",
      accent: "#d75b82",
      accentDark: "#b94369",
      controlHover: "#fff0f4",
      controlSelected: "#fbe0e9",
      controlSelectedText: "#b94369",
      cardShadow: "0 8px 25px #b9436914",
    },
  },
  {
    id: "forest",
    name: "森林绿",
    description: "低饱和绿色，适合长时间使用",
    mode: "light",
    preview: "linear-gradient(135deg, #f5faf7 50%, #27865d 50%)",
    visuals: createVisuals({
      background: {
        image: "",
        fallback:
          "radial-gradient(ellipse at 82% 24%, #27865d55 0 22%, transparent 23%), linear-gradient(135deg, #f5faf7, #c9e4d2 58%, #27865d)",
        position: "center",
        size: "cover",
        overlay:
          "linear-gradient(90deg, #f5faf7cc 0%, #f5faf76a 72%, #f5faf7a6 100%)",
      },
      scene: {
        texture: "radial-gradient(ellipse at 12% 20%, #27865d30 0 30px, transparent 31px), radial-gradient(ellipse at 28% 10%, #176b4728 0 44px, transparent 45px), linear-gradient(105deg, transparent 0 63%, #ffffff45 70%, transparent 78%)",
        textureOpacity: ".54",
        foreground: "linear-gradient(112deg, transparent 0 48%, #27865d1b 54%, transparent 62%)",
        foregroundOpacity: ".66",
      },
      surfaces: { cardEdge: "#27865d88", cardHoverShadow: "inset 3px 0 #27865d88, 0 12px 24px #176b4720" },
      controls: { primaryShadow: "0 6px 14px #27865d33" },
      signature: { label: '"FIELD // EVERGREEN"', rule: "linear-gradient(90deg, var(--theme-accent), color-mix(in srgb, var(--theme-accent) 18%, transparent))" },
    }),
    tokens: {
      ...baseLight,
      bg: "#f5faf7",
      panel: "#ffffffd9",
      line: "#dcebe2",
      accent: "#27865d",
      accentDark: "#176b47",
      controlHover: "#edf8f1",
      controlSelected: "#d9f0e2",
      controlSelectedText: "#176b47",
      cardShadow: "0 8px 25px #176b4714",
    },
  },
  {
    id: "paper",
    name: "和风纸张",
    description: "暖白纸张与朱红强调色",
    mode: "light",
    preview: "linear-gradient(135deg, #fbf7ef 50%, #b4493f 50%)",
    visuals: createVisuals({
      background: {
        image: "",
        fallback:
          "repeating-linear-gradient(0deg, #6f4a3208 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, #ffffff50 0 1px, transparent 1px 9px), radial-gradient(#ffffff7d 1px, transparent 1.5px), linear-gradient(135deg, #fbf7ef, #eadfcd 62%, #d4b99a)",
        position: "center",
        size: "cover",
        overlay:
          "linear-gradient(90deg, #fbf7efe0 0%, #fbf7efa0 66%, #fbf7efbf 100%)",
      },
      scene: {
        canvasBlendMode: "multiply, normal, normal",
        canvasOpacity: ".97",
        texture: "repeating-linear-gradient(7deg, transparent 0 4px, #7d5a3c0b 5px 6px, transparent 7px 12px), repeating-linear-gradient(93deg, transparent 0 8px, #ffffff42 9px 10px, transparent 11px 17px)",
        textureOpacity: ".72",
        foreground: "linear-gradient(90deg, transparent 0 73%, #a33c322b 73.1% 73.3%, transparent 73.4%)",
        foregroundOpacity: ".8",
      },
      surfaces: {
        borderColor: "#cdb69b",
        chromeShadow: "0 8px 20px #6f4a3214",
        cardEdge: "#a33c325c",
        cardHoverBorder: "#a33c3298",
        cardHoverShadow: "4px 5px 0 #a33c321c, 0 14px 26px #6f4a3226",
        cardHoverTransform: "translateY(-3px)",
        brandRadius: "2px",
        brandShadow: "3px 3px 0 #6f292344",
      },
      controls: {
        primaryFill: "#a33c32",
        primaryHoverFill: "#7f2927",
        primaryShadow: "3px 3px 0 #6f292344",
        selectedFill: "#eed2b5",
        selectedShadow: "inset 3px 0 #a33c32",
        fieldShadow: "inset 0 1px #ffffff88",
      },
      signature: {
        label: '"WASHI // ARCHIVE"',
        labelColor: "#7f2927",
        labelFont: "700 8px/1 Georgia, 'Songti SC', serif",
        rule: "repeating-linear-gradient(90deg, #a33c32 0 7px, transparent 7px 10px)",
        mark: "#a33c32",
        markRadius: "1px",
        markShadow: "2px 2px 0 #6f292333",
        displayFont: "Georgia, 'Songti SC', 'Noto Serif CJK SC', serif",
      },
    }),
    tokens: {
      ...baseLight,
      bg: "#f2eadb",
      panel: "#fffaf0e8",
      panelElevated: "#fffdf7f5",
      ink: "#2a211d",
      muted: "#87766b",
      line: "#d8c4ab",
      accent: "#a33c32",
      accentDark: "#7f2927",
      controlBg: "#fffaf0e8",
      controlHover: "#f3dfc8",
      controlSelected: "#eed2b5",
      controlSelectedText: "#7f2927",
      textSubtle: "#6f5b4e",
      textFaint: "#a38b79",
      iconMuted: "#987d6a",
      inputBorder: "#d0b89e",
      focusRing: "#a33c3230",
      tableHeader: "#f4e9d8",
      faviconBg: "#f4e9d8",
      upgradeSurface: "#f3e5d8",
      skeleton: "#e7d9c6",
      skeletonShine: "#f7efe3",
      radius: "4px",
      cardShadow: "3px 4px 0 #b4493f12, 0 10px 24px #6f4a3218",
    },
  },
  {
    id: "cyber",
    name: "赛博霓虹",
    description: "青粉霓虹强调色，适合开发者",
    mode: "dark",
    preview: "linear-gradient(135deg, #10151d 50%, #2dd4bf 50%)",
    visuals: createVisuals({
      background: {
        image: "",
        fallback:
          "repeating-linear-gradient(0deg, #47f6df08 0 1px, transparent 1px 6px), linear-gradient(90deg, #070b16 0%, #0e1c32 44%, #23142d 72%, #080c15 100%)",
        position: "center",
        size: "cover",
        overlay:
          "linear-gradient(90deg, #070b16ed 0%, #070b16ba 34%, #070b165c 64%, #070b16b6 100%), linear-gradient(180deg, #070b1626 0%, transparent 46%, #070b16ad 92%)",
      },
      scene: {
        canvasBlendMode: "screen, normal, normal",
        canvasOpacity: "1",
        texture: "repeating-linear-gradient(90deg, transparent 0 34px, #47f6df24 35px 36px, transparent 37px 70px), repeating-linear-gradient(0deg, transparent 0 6px, #e9faff18 7px 8px, transparent 9px 13px)",
        textureOpacity: ".54",
        foreground: "linear-gradient(90deg, transparent 0 13%, #47f6df38 13.1% 13.25%, transparent 13.4% 77%, #ff4db848 77.1% 77.25%, transparent 77.4%), linear-gradient(180deg, transparent 0 30%, #47f6df2e 30.15% 30.3%, transparent 30.45% 70%, #ff4db82e 70.15% 70.3%, transparent 70.45%)",
        foregroundOpacity: ".82",
        foregroundAccent: "linear-gradient(90deg, transparent 0 18%, #ff4db800 18.2%, #ff4db870 19%, #ff4db800 19.8%, transparent 20%), linear-gradient(90deg, transparent 0 67%, #47f6df00 67.2%, #47f6df7a 68%, #47f6df00 68.8%, transparent 69%)",
        foregroundAccentOpacity: ".8",
        animationDuration: "5.8s",
      },
      surfaces: {
        borderColor: "#47f6df55",
        backdropFilter: "blur(14px) saturate(1.15)",
        chromeShadow: "inset 0 -1px #47f6df44, 0 10px 30px #0000004d",
        cardEdge: "#47f6dfaa",
        cardHoverBorder: "#ff4db8",
        cardHoverShadow: "inset 0 0 28px #ff4db817, 0 0 0 1px #ff4db866, 0 16px 38px #00000066",
        cardHoverTransform: "translateY(-3px)",
        brandRadius: "3px",
        brandShadow: "4px 4px 0 #ff4db88a, 0 0 22px #47f6df8f",
      },
      controls: {
        primaryFill: "linear-gradient(105deg, #2dd4bf 0%, #47f6df 38%, #ff4db8 100%)",
        primaryHoverFill: "linear-gradient(105deg, #8ffff2 0%, #47f6df 35%, #ff83d0 100%)",
        primaryShadow: "0 0 0 1px #a8fff566, 0 0 24px #ff3cac66",
        selectedFill: "linear-gradient(90deg, #214f62, #40305f)",
        selectedShadow: "inset 3px 0 #47f6df, 0 0 18px #ff3cac22",
        fieldShadow: "inset 0 0 18px #47f6df0b, 0 0 14px #ff3cac18",
      },
      signature: {
        label: '"NET // ONLINE"',
        labelColor: "#47f6df",
        rule: "repeating-linear-gradient(90deg, #47f6df 0 8px, transparent 8px 12px)",
        mark: "#47f6df",
        markRadius: "0",
        markShadow: "0 0 10px #47f6df",
        displayFont: "ui-monospace, SFMono-Regular, Consolas, monospace",
        displayShadow: "2px 0 #ff4db8, -2px 0 #47f6df, 0 0 20px #47f6df80",
      },
    }),
    tokens: {
      ...baseLight,
      bg: "#080a18",
      panel: "#11162be8",
      panelElevated: "#1b2140f2",
      ink: "#f4fbff",
      muted: "#a9b9d4",
      line: "#3a4e78",
      accent: "#47f6df",
      accentDark: "#9bfff1",
      controlBg: "#0d1328ee",
      controlHover: "#243158",
      controlSelected: "#263d70",
      controlSelectedText: "#b9fff6",
      textSubtle: "#c0cee7",
      textFaint: "#8ea4ca",
      iconMuted: "#94acd4",
      inputBorder: "#455b8a",
      focusRing: "#47f6df40",
      skeleton: "#202b4b",
      skeletonShine: "#34446e",
      cardShadow: "0 14px 36px #00000066",
    },
  },
  {
    id: "eva-asuka",
    name: "EVA · 明日香",
    description: "烧橙、赤红与深夜驾驶舱的高对比主题",
    mode: "dark",
    preview:
      "linear-gradient(135deg, #180c10 38%, #d83a32 38% 66%, #ff9a4a 66%)",
    visuals: createVisuals({
      background: {
        image: "https://aka.doubaocdn.com/s/tLEtOHEXGa",
        fallback:
          "linear-gradient(135deg, #180c10, #54202b 58%, #e33f35)",
        position: "center right",
        size: "cover",
        overlay:
          "linear-gradient(90deg, #180c10b8 0%, #180c1066 42%, #180c1040 72%, #180c10a8 100%)",
      },
      scene: {
        texture: "repeating-linear-gradient(0deg, transparent 0 8px, #ff705713 9px 10px, transparent 11px 18px)",
        textureOpacity: ".34",
        foreground: "linear-gradient(90deg, transparent 0 14%, #e33f353d 14.1% 14.3%, transparent 14.4% 78%, #ffac5c32 78.1% 78.3%, transparent 78.4%)",
        foregroundOpacity: ".72",
      },
      surfaces: { borderColor: "#e33f3566", backdropFilter: "blur(10px)", cardEdge: "#e33f35", cardHoverBorder: "#ffac5c", cardHoverShadow: "inset 3px 0 #e33f35, 0 16px 34px #08020480" },
      controls: { primaryShadow: "0 8px 18px #e33f3544", selectedShadow: "inset 3px 0 #e33f35" },
      signature: { label: '"NERV // EVA-02"', labelColor: "#ff7057", rule: "linear-gradient(90deg, #e33f35, #ffac5c, transparent)", mark: "#ffac5c", markRadius: "0", markShadow: "0 0 10px #ffac5c" },
    }),
    tokens: {
      ...baseLight,
      bg: "#180c10",
      panel: "#281419c9",
      panelElevated: "#3a1b20e8",
      ink: "#fff1e8",
      muted: "#d9a7a0",
      line: "#713238",
      accent: "#e33f35",
      accentDark: "#ff7057",
      controlBg: "#211014e8",
      controlHover: "#452024",
      controlSelected: "#67252d",
      controlSelectedText: "#ffd8c9",
      onAccent: "#fff8f2",
      textSubtle: "#d9a7a0",
      textFaint: "#bb7e7a",
      iconMuted: "#d19691",
      inputBorder: "#713238",
      focusRing: "#ff5a4a44",
      danger: "#ff8c78",
      dangerSurface: "#4a2026",
      success: "#f2b38e",
      successSurface: "#3a251f",
      warning: "#ffac5c",
      warningSurface: "#432619",
      backdrop: "#090305aa",
      tableHeader: "#211014",
      faviconBg: "#4b2229",
      upgradeSurface: "#351b23",
      skeleton: "#4a252b",
      skeletonShine: "#683239",
      radius: "6px",
      cardShadow: "0 14px 34px #08020480",
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = "default";

export function getThemePreset(id: string | null): ThemePreset {
  return THEME_PRESETS.find((theme) => theme.id === id) || THEME_PRESETS[0];
}
