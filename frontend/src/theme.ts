import { createTheme } from "@mui/material/styles";

export const colors = {
  pine: "#1E3A32",
  paper: "#F2EFE3",
  mustard: "#D9A441",
  brick: "#A83E3E",
  sage: "#6B8F71",
  ink: "#22281F",
  muted: "#8A8571",
  border: "#E7E2D2",
};

export const fonts = {
  display: "Manrope, sans-serif",
  body: "Inter, sans-serif",
  mono: '"JetBrains Mono", monospace',
} as const;

export const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: colors.pine, contrastText: colors.paper },
    secondary: { main: colors.mustard, contrastText: colors.pine },
    error: { main: colors.brick },
    background: { default: colors.paper, paper: "#FFFFFF" },
    text: { primary: colors.ink, secondary: colors.muted },
    divider: colors.border,
  },
  typography: {
    fontFamily: fonts.body,
    h1: { fontFamily: fonts.display, fontWeight: 700 },
    h2: { fontFamily: fonts.display, fontWeight: 700 },
    h3: { fontFamily: fonts.display, fontWeight: 700 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  shape: { borderRadius: 2 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": { minHeight: "100%" },
        body: {
          minWidth: 0,
          backgroundColor: colors.pine,
        },
        "*": { boxSizing: "border-box" },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, fontWeight: 700 },
        sizeSmall: { borderRadius: 10 },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiTextField: {
      defaultProps: { size: "small", fullWidth: true },
    },
    MuiToggleButton: {
      styleOverrides: { root: { borderRadius: 10, textTransform: "none" } },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({theme}) => ({
          boxShadow: "0 8px 20px rgba(30,58,50,0.06)",
          borderRadius: theme.shape.borderRadius,
        }),
      },
    },
  },
});
