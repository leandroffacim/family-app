import { createTheme } from "@mui/material/styles";

export const colors = {
  // Brand / Primary Palette - Deep Indigo & Soft Slate
  indigoDark: "#1E1B4B",
  indigoPrimary: "#4F46E5",
  indigoLight: "#818CF8",
  indigoBg: "#EEF2FF",

  // Accent & Status Colors
  amberAccent: "#F59E0B", // Streak & Adia
  emeraldSuccess: "#10B981", // Feito
  slatePass: "#64748B", // Passa
  roseError: "#EF4444", // Erro

  // Legacy mappings for backwards compatibility
  pine: "#4F46E5",
  paper: "#F8FAFC",
  mustard: "#F59E0B",
  brick: "#EF4444",
  sage: "#10B981",
  ink: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",

  // Neutral Colors
  slate900: "#0F172A",
  slate800: "#1E293B",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748B",
  slate400: "#94A3B8",
  slate200: "#E2E8F0",
  slate100: "#F1F5F9",
  slate50: "#F8FAFC",
  pureWhite: "#FFFFFF",
};

export const fonts = {
  display: "Manrope, sans-serif",
  body: "Inter, sans-serif",
  mono: '"JetBrains Mono", monospace',
} as const;

export const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: colors.indigoPrimary,
      light: colors.indigoLight,
      dark: "#3730A3",
      contrastText: colors.pureWhite,
    },
    secondary: {
      main: colors.amberAccent,
      contrastText: colors.slate900,
    },
    error: {
      main: colors.roseError,
    },
    success: {
      main: colors.emeraldSuccess,
    },
    background: {
      default: colors.slate50,
      paper: colors.pureWhite,
    },
    text: {
      primary: colors.slate900,
      secondary: colors.slate500,
    },
    divider: colors.slate200,
  },
  typography: {
    fontFamily: fonts.body,
    h1: {
      fontFamily: fonts.display,
      fontWeight: 800,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontFamily: fonts.display,
      fontWeight: 800,
      letterSpacing: "-0.02em",
    },
    h3: {
      fontFamily: fonts.display,
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    h4: {
      fontFamily: fonts.display,
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    h5: {
      fontFamily: fonts.display,
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    h6: { fontFamily: fonts.display, fontWeight: 700 },
    subtitle1: { fontFamily: fonts.display, fontWeight: 700 },
    subtitle2: { fontFamily: fonts.display, fontWeight: 600 },
    button: {
      fontFamily: fonts.display,
      fontWeight: 700,
      textTransform: "none",
    },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": { minHeight: "100%", height: "100%" },
        body: {
          minWidth: 0,
          backgroundColor: "#CBD5E1",
          color: colors.slate900,
          fontFamily: fonts.body,
          WebkitFontSmoothing: "antialiased",
        },
        "*": { boxSizing: "border-box" },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 700,
          boxShadow: "none",
          transition: "all 0.2s ease-in-out",
          "&:hover": { boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)" },
        },
        contained: {
          background: "linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)",
        },
        sizeSmall: { borderRadius: 10, padding: "6px 14px" },
        sizeLarge: { borderRadius: 14, padding: "12px 24px", fontSize: "1rem" },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: "all 0.2s ease-in-out",
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", fullWidth: true },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            backgroundColor: colors.pureWhite,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              borderColor: colors.indigoLight,
            },
            "&.Mui-focused": {
              boxShadow: "0 0 0 3px rgba(79, 70, 229, 0.15)",
            },
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          fontWeight: 600,
          border: `1px solid ${colors.slate200}`,
          color: colors.slate600,
          "&.Mui-selected": {
            backgroundColor: colors.indigoBg,
            color: colors.indigoPrimary,
            borderColor: colors.indigoLight,
            fontWeight: 700,
            "&:hover": {
              backgroundColor: "#E0E7FF",
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow:
            "0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03)",
          border: `1px solid ${colors.slate200}`,
          borderRadius: 16,
        },
        outlined: {
          border: `1px solid ${colors.slate200}`,
          boxShadow: "0 2px 6px rgba(15, 23, 42, 0.02)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});
