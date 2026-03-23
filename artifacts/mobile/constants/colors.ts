const NAVY = "#0D1B2A";
const NAVY_MID = "#1B2B3D";
const NAVY_LIGHT = "#243447";
const GOLD = "#C8960C";
const GOLD_LIGHT = "#F5B800";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#F2F4F7";
const GRAY_TEXT = "#8A9BAE";
const GRAY_LIGHT = "#D1D9E0";
const RED = "#E53E3E";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const ORANGE = "#F97316";
const PURPLE = "#A855F7";
const TEAL = "#14B8A6";
const SURFACE = "#152233";

export default {
  navy: NAVY,
  navyMid: NAVY_MID,
  navyLight: NAVY_LIGHT,
  gold: GOLD,
  goldLight: GOLD_LIGHT,
  white: WHITE,
  offWhite: OFF_WHITE,
  grayText: GRAY_TEXT,
  grayLight: GRAY_LIGHT,
  red: RED,
  green: GREEN,
  blue: BLUE,
  orange: ORANGE,
  purple: PURPLE,
  teal: TEAL,
  surface: SURFACE,

  estados: {
    ausente: { bg: "#3D1A1A", text: RED, label: "Ausente" },
    presente: { bg: "#0F2E1A", text: GREEN, label: "Presente" },
    comision: { bg: "#0F1E38", text: BLUE, label: "Comisión" },
    reposo: { bg: "#2D1C0A", text: ORANGE, label: "Reposo" },
    pasantia: { bg: "#261A38", text: PURPLE, label: "Pasantía" },
    permiso: { bg: "#0D2622", text: TEAL, label: "Permiso" },
  },

  light: {
    text: NAVY,
    background: OFF_WHITE,
    tint: NAVY,
    tabIconDefault: GRAY_TEXT,
    tabIconSelected: NAVY,
  },
};
