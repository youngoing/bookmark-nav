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

export type ThemeSidebar = {
  image: string;
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
  sidebar: ThemeSidebar;
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
  bg: "#f6f8fa",
  panel: "#ffffff",
  panelElevated: "#ffffff",
  ink: "#1f2328",
  muted: "#6e7781",
  line: "#d8dee4",
  accent: "#0969da",
  accentDark: "#0757b3",
  controlBg: "#ffffff",
  controlHover: "#f3f4f6",
  controlSelected: "#ddf4ff",
  controlSelectedText: "#0969da",
  onAccent: "#ffffff",
  textSubtle: "#57606a",
  textFaint: "#8c959f",
  iconMuted: "#6e7781",
  inputBorder: "#d0d7de",
  focusRing: "#0969da33",
  danger: "#cf222e",
  dangerSurface: "#ffebe9",
  success: "#1a7f37",
  successSurface: "#dafbe1",
  warning: "#9a6700",
  warningSurface: "#fff8c5",
  backdrop: "#1f232866",
  tableHeader: "#f6f8fa",
  faviconBg: "#f6f8fa",
  upgradeSurface: "#f6f8fa",
  skeleton: "#eaeef2",
  skeletonShine: "#f6f8fa",
  radius: "8px",
  cardShadow: "0 1px 2px #1f232814",
};

const baseDark: ThemeTokens = {
  ...baseLight,
  bg: "#0d1117",
  panel: "#161b22",
  panelElevated: "#1f2937",
  ink: "#f0f6fc",
  muted: "#8b949e",
  line: "#30363d",
  accent: "#2f81f7",
  accentDark: "#58a6ff",
  controlBg: "#161b22",
  controlHover: "#21262d",
  controlSelected: "#0c2d6b",
  controlSelectedText: "#c9d1d9",
  onAccent: "#ffffff",
  textSubtle: "#c9d1d9",
  textFaint: "#8b949e",
  iconMuted: "#8b949e",
  inputBorder: "#30363d",
  focusRing: "#2f81f766",
  danger: "#ff7b72",
  dangerSurface: "#3b1c22",
  success: "#3fb950",
  successSurface: "#12261e",
  warning: "#d29922",
  warningSurface: "#2d220b",
  backdrop: "#01040999",
  tableHeader: "#161b22",
  faviconBg: "#21262d",
  upgradeSurface: "#1f2937",
  skeleton: "#21262d",
  skeletonShine: "#30363d",
  cardShadow: "0 1px 2px #01040999",
};

const baseVisuals: Omit<ThemeVisuals, "background" | "sidebar"> = {
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

const baseSidebar: ThemeSidebar = {
  image: "",
  position: "center",
  size: "cover",
  overlay: "none",
};

type ThemeVisualOverrides = {
  background: ThemeBackground;
  sidebar?: Partial<ThemeSidebar>;
  scene?: Partial<ThemeScene>;
  surfaces?: Partial<ThemeSurfaces>;
  controls?: Partial<ThemeControls>;
  signature?: Partial<ThemeSignature>;
};

function createVisuals(overrides: ThemeVisualOverrides): ThemeVisuals {
  return {
    background: overrides.background,
    sidebar: { ...baseSidebar, ...overrides.sidebar },
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
  const sidebar = theme.visuals.sidebar;
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
    "--theme-sidebar-image": sidebar.image ? `url("${sidebar.image.replaceAll('"', "%22")}")` : "none",
    "--theme-sidebar-position": sidebar.position,
    "--theme-sidebar-size": sidebar.size,
    "--theme-sidebar-overlay": sidebar.overlay,
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
    name: "默认白",
    description: "中性白色工作台，信息层级清晰",
    mode: "light",
    preview: "linear-gradient(135deg, #ffffff 0 72%, #d0d7de 72% 100%)",
    visuals: createVisuals({
      background: {
        image: "",
        fallback: "#f6f8fa",
        position: "center",
        size: "cover",
        overlay: "none",
      },
      surfaces: { cardHoverShadow: "0 3px 8px #1f23281f" },
      signature: { label: '"BASE // LIGHT"' },
    }),
    tokens: baseLight,
  },
  {
    id: "midnight",
    name: "默认黑",
    description: "中性深色工作台，适合低光环境",
    mode: "dark",
    preview: "linear-gradient(135deg, #0d1117 0 72%, #30363d 72% 100%)",
    visuals: createVisuals({
      background: {
        image: "",
        fallback: "#0d1117",
        position: "center",
        size: "cover",
        overlay: "none",
      },
      surfaces: { cardHoverShadow: "0 6px 18px #01040966" },
      signature: { label: '"BASE // DARK"' },
    }),
    tokens: baseDark,
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
          "repeating-linear-gradient(0deg, #f6f0e5 0 5px, #f1eadc 5px 6px), repeating-linear-gradient(90deg, #ffffff66 0 1px, transparent 1px 11px)",
        position: "center",
        size: "cover",
        overlay: "none",
      },
      scene: {
        canvasBlendMode: "multiply",
        canvasOpacity: ".9",
        texture: "radial-gradient(#73543a18 .7px, transparent .8px)",
        textureOpacity: ".72",
        foreground: "linear-gradient(90deg, transparent 0 72%, #a33c3244 72.1% 72.25%, transparent 72.4%)",
        foregroundOpacity: ".65",
      },
      surfaces: {
        borderColor: "#c7b596",
        chromeShadow: "0 1px 0 #c7b596",
        cardEdge: "#9f3d35",
        cardHoverBorder: "#9f3d35",
        cardHoverShadow: "3px 3px 0 #9f3d3526",
        cardHoverTransform: "translateY(-1px)",
        brandRadius: "1px",
        brandShadow: "2px 2px 0 #6b302c3d",
      },
      controls: {
        primaryFill: "#9f3d35",
        primaryHoverFill: "#78302c",
        primaryShadow: "2px 2px 0 #6b302c3d",
        selectedFill: "#ebd9bf",
        selectedShadow: "inset 2px 0 #9f3d35",
        fieldShadow: "inset 0 1px #ffffff99",
      },
      signature: {
        label: '"WASHI // ARCHIVE"',
        labelColor: "#78302c",
        labelFont: "700 8px/1 Georgia, 'Songti SC', serif",
        rule: "repeating-linear-gradient(90deg, #9f3d35 0 7px, transparent 7px 10px)",
        mark: "#9f3d35",
        markRadius: "1px",
        markShadow: "2px 2px 0 #6b302c33",
        displayFont: "Georgia, 'Songti SC', 'Noto Serif CJK SC', serif",
      },
    }),
    tokens: {
      ...baseLight,
      bg: "#f1eadf",
      panel: "#fffdf8",
      panelElevated: "#ffffff",
      ink: "#2c2420",
      muted: "#7d6f65",
      line: "#d3c1a7",
      accent: "#9f3d35",
      accentDark: "#78302c",
      controlBg: "#fffdf8",
      controlHover: "#f3e8d8",
      controlSelected: "#ebd9bf",
      controlSelectedText: "#78302c",
      textSubtle: "#65584f",
      textFaint: "#9a8879",
      iconMuted: "#806e60",
      inputBorder: "#cbb99f",
      focusRing: "#9f3d3533",
      tableHeader: "#f6eddf",
      faviconBg: "#f6eddf",
      upgradeSurface: "#f4e8d8",
      skeleton: "#e8ddcd",
      skeletonShine: "#f6f0e5",
      radius: "3px",
      cardShadow: "0 1px 2px #6b302c21",
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
        fallback: "#070a0f",
        position: "center",
        size: "cover",
        overlay: "none",
      },
      scene: {
        canvasOpacity: ".92",
        texture: "linear-gradient(#00d9ff16 1px, transparent 1px), linear-gradient(90deg, #00d9ff16 1px, transparent 1px)",
        textureOpacity: ".58",
        foreground: "repeating-linear-gradient(0deg, transparent 0 7px, #00d9ff0c 8px 9px)",
        foregroundOpacity: ".52",
        foregroundAccent: "linear-gradient(90deg, transparent 0 16%, #ff4db84d 16.1% 16.22%, transparent 16.35% 78%, #00d9ff40 78.1% 78.22%, transparent 78.35%)",
        foregroundAccentOpacity: ".7",
        animationDuration: "7s",
      },
      surfaces: {
        borderColor: "#1c6070",
        chromeShadow: "inset 0 -1px #00d9ff55",
        cardEdge: "#00d9ff99",
        cardHoverBorder: "#ff4db8",
        cardHoverShadow: "inset 0 0 0 1px #ff4db880, 0 0 18px #00d9ff26",
        cardHoverTransform: "translateY(-1px)",
        brandRadius: "2px",
        brandShadow: "2px 2px 0 #ff4db899, 0 0 14px #00d9ff66",
      },
      controls: {
        primaryFill: "#00d9ff",
        primaryHoverFill: "#75ebff",
        primaryShadow: "0 0 0 1px #b8f8ff80, 0 0 18px #00d9ff52",
        selectedFill: "#0d2935",
        selectedShadow: "inset 2px 0 #00d9ff, 0 0 12px #ff4db826",
        fieldShadow: "inset 0 0 0 1px #00d9ff1f, 0 0 10px #00d9ff1f",
      },
      signature: {
        label: '"SYS // NEON"',
        labelColor: "#00d9ff",
        rule: "repeating-linear-gradient(90deg, #00d9ff 0 8px, transparent 8px 12px)",
        mark: "#00d9ff",
        markRadius: "0",
        markShadow: "0 0 9px #00d9ff",
        displayFont: "ui-monospace, SFMono-Regular, Consolas, monospace",
        displayShadow: "1px 0 #ff4db8, 0 0 14px #00d9ff66",
      },
    }),
    tokens: {
      ...baseLight,
      bg: "#070a0f",
      panel: "#0d131c",
      panelElevated: "#131d29",
      ink: "#e8fbff",
      muted: "#96afbb",
      line: "#1c5261",
      accent: "#00d9ff",
      accentDark: "#75ebff",
      controlBg: "#0b1119",
      controlHover: "#102632",
      controlSelected: "#0d2935",
      controlSelectedText: "#c4f8ff",
      onAccent: "#04202a",
      textSubtle: "#c0dce2",
      textFaint: "#71909b",
      iconMuted: "#7ea7b2",
      inputBorder: "#276b79",
      focusRing: "#00d9ff4d",
      danger: "#ff7086",
      dangerSurface: "#341a29",
      success: "#5ce6a9",
      successSurface: "#112c29",
      warning: "#ffd166",
      warningSurface: "#30270d",
      backdrop: "#020408bb",
      tableHeader: "#0b1119",
      faviconBg: "#102632",
      upgradeSurface: "#131d29",
      skeleton: "#132936",
      skeletonShine: "#1d4352",
      cardShadow: "0 8px 22px #00000080",
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
        image: "/theme/asuka.png",
        fallback:
          "linear-gradient(135deg, #180c10, #54202b 58%, #e33f35)",
        position: "center right",
        size: "cover",
        overlay:
          "linear-gradient(90deg, #180c10b8 0%, #180c1066 42%, #180c1040 72%, #180c10a8 100%)",
      },
      sidebar: {
        image: "/theme/asuka.leff-bar.jpg",
        position: "60% center",
        size: "cover",
        overlay: "linear-gradient(180deg, #180c10b3 0%, #180c1073 46%, #180c10c2 100%)",
      },
      scene: {
        texture: "repeating-linear-gradient(0deg, transparent 0 8px, #ff705713 9px 10px, transparent 11px 18px)",
        textureOpacity: ".34",
        foreground: "linear-gradient(90deg, transparent 0 14%, #e33f353d 14.1% 14.3%, transparent 14.4% 78%, #ffac5c32 78.1% 78.3%, transparent 78.4%)",
        foregroundOpacity: ".72",
      },
      surfaces: { borderColor: "#e33f3566", backdropFilter: "blur(14px) saturate(1.08)", cardEdge: "#e33f35", cardHoverBorder: "#ffac5c", cardHoverShadow: "inset 3px 0 #e33f35, 0 16px 34px #08020480" },
      controls: { primaryShadow: "0 8px 18px #e33f3544", selectedShadow: "inset 3px 0 #e33f35" },
      signature: { label: '"NERV // EVA-02"', labelColor: "#ff7057", rule: "linear-gradient(90deg, #e33f35, #ffac5c, transparent)", mark: "#ffac5c", markRadius: "0", markShadow: "0 0 10px #ffac5c" },
    }),
    tokens: {
      ...baseLight,
      bg: "#180c10",
      panel: "#1b0e13a6",
      panelElevated: "#3a1b20e8",
      ink: "#fff1e8",
      muted: "#d9a7a0",
      line: "#713238",
      accent: "#e33f35",
      accentDark: "#ff7057",
      controlBg: "#1a0e13c7",
      controlHover: "#452024d9",
      controlSelected: "#67252dde",
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
      tableHeader: "#1a0e13c7",
      faviconBg: "#4b2229c9",
      upgradeSurface: "#351b23d6",
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
