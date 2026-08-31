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

export type ThemePreset = {
  id: ThemeId;
  name: string;
  description: string;
  mode: Exclude<ThemeMode, "system">;
  preview: string;
  tokens: ThemeTokens;
  background?: {
    image: string;
    fallback: string;
    position: string;
    size: "cover" | "contain";
    overlay: string;
  };
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

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: "default",
    name: "默认蓝",
    description: "清晰、克制，适合日常管理书签",
    mode: "light",
    preview: "linear-gradient(135deg, #f7f8fa 50%, #536dfe 50%)",
    background: {
      image: "",
      fallback:
        "linear-gradient(135deg, #f7f8fa 0%, #dfe5ff 46%, #536dfe 100%)",
      position: "center",
      size: "cover",
      overlay:
        "linear-gradient(90deg, #f7f8fac0 0%, #f7f8fa82 72%, #f7f8fab0 100%)",
    },
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
    background: {
      image: "",
      fallback:
        "radial-gradient(circle at 78% 20%, #536dfe66 0 1px, transparent 2px), radial-gradient(circle at 62% 34%, #8293ff55 0 1px, transparent 2px), linear-gradient(135deg, #11151d, #24213f 58%, #11151d)",
      position: "center",
      size: "cover",
      overlay:
        "linear-gradient(90deg, #11151dcc 0%, #11151d80 72%, #11151db0 100%)",
    },
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
    background: {
      image: "",
      fallback:
        "radial-gradient(circle at 82% 18%, #e8799a55 0 22px, transparent 23px), radial-gradient(circle at 70% 34%, #f1a9bd66 0 16px, transparent 17px), linear-gradient(135deg, #fff8fa, #f9dbe5 58%, #e8799a)",
      position: "center",
      size: "cover",
      overlay:
        "linear-gradient(90deg, #fff8fad0 0%, #fff8fa70 72%, #fff8faa8 100%)",
    },
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
    background: {
      image: "",
      fallback:
        "radial-gradient(ellipse at 82% 24%, #27865d55 0 22%, transparent 23%), linear-gradient(135deg, #f5faf7, #c9e4d2 58%, #27865d)",
      position: "center",
      size: "cover",
      overlay:
        "linear-gradient(90deg, #f5faf7cc 0%, #f5faf76a 72%, #f5faf7a6 100%)",
    },
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
    background: {
      image: "",
      fallback:
        "radial-gradient(circle at 82% 22%, #b4493f44 0 28px, transparent 29px), linear-gradient(135deg, #fbf7ef, #eadfcd 62%, #b4493f)",
      position: "center",
      size: "cover",
      overlay:
        "linear-gradient(90deg, #fbf7efd0 0%, #fbf7ef78 72%, #fbf7efa8 100%)",
    },
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
    background: {
      image: "",
      fallback:
        "radial-gradient(circle at 76% 33%, #ffd36a 0 1.5%, #ff3cac 2.5% 5%, #ff3cac66 6% 13%, transparent 22%), linear-gradient(180deg, transparent 0 52%, #ff3cac36 61%, transparent 70%), linear-gradient(90deg, transparent 0 52%, #070a14 52% 57%, transparent 57% 59%, #080b16 59% 64%, transparent 64% 67%, #070a14 67% 73%, transparent 73% 76%, #080b16 76% 83%, transparent 83%), linear-gradient(180deg, #070b16 0%, #10152b 44%, #271536 70%, #080c15 100%)",
      position: "center",
      size: "cover",
      overlay:
        "linear-gradient(90deg, #070b16eb 0%, #070b16b8 30%, #070b1660 58%, #070b16a8 100%), linear-gradient(180deg, #070b1633 0%, transparent 46%, #070b16a8 88%)",
    },
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
    background: {
      image: "https://aka.doubaocdn.com/s/tLEtOHEXGa",
      fallback:
        "radial-gradient(ellipse at 78% 28%, #e33f3588 0 18%, transparent 44%), linear-gradient(135deg, #180c10, #54202b 58%, #e33f35)",
      position: "center right",
      size: "cover",
      overlay:
        "linear-gradient(90deg, #180c10b8 0%, #180c1066 42%, #180c1040 72%, #180c10a8 100%)",
    },
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
