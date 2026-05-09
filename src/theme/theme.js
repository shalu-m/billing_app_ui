// src/theme/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1565C0",
      light: "#1976D2",
      dark: "#0D47A1",
      contrastText: "#fff",
    },
    secondary: {
      main: "#00897B",
      light: "#26A69A",
      dark: "#00695C",
    },
    background: {
      default: "#F0F4F8",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A202C",
      secondary: "#4A5568",
    },
    success: { main: "#2E7D32", light: "#E8F5E9" },
    warning: { main: "#E65100", light: "#FFF3E0" },
    error: { main: "#C62828", light: "#FFEBEE" },
    info: { main: "#1565C0", light: "#E3F2FD" },
    divider: "#E2E8F0",
  },
  typography: {
    fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.5px" },
    h5: { fontWeight: 700, letterSpacing: "-0.3px" },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, color: "#4A5568" },
    body2: { color: "#4A5568" },
    button: { fontWeight: 600, textTransform: "none", letterSpacing: "0.01em" },
  },
  shape: { borderRadius: 10 },
  shadows: [
    "none",
    "0px 1px 3px rgba(0,0,0,0.06), 0px 1px 2px rgba(0,0,0,0.04)",
    "0px 2px 6px rgba(0,0,0,0.07), 0px 1px 3px rgba(0,0,0,0.05)",
    "0px 4px 12px rgba(0,0,0,0.08), 0px 2px 4px rgba(0,0,0,0.05)",
    "0px 6px 16px rgba(0,0,0,0.09), 0px 3px 6px rgba(0,0,0,0.06)",
    ...Array(20).fill("0px 8px 24px rgba(0,0,0,0.10)"),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 18px",
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        contained: { "&:hover": { boxShadow: "0px 2px 8px rgba(21,101,192,0.3)" } },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            backgroundColor: "#fff",
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1565C0" },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0px 1px 4px rgba(0,0,0,0.06), 0px 1px 2px rgba(0,0,0,0.04)",
          border: "1px solid #E2E8F0",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            backgroundColor: "#F7FAFC",
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#718096",
            borderBottom: "1px solid #E2E8F0",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderBottom: "1px solid #F0F4F8", fontSize: "0.855rem" } },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { "&:hover": { backgroundColor: "#F7FAFC" }, "&:last-child td": { borderBottom: 0 } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, fontSize: "0.75rem" } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
          minHeight: 44,
          "&.Mui-selected": { color: "#1565C0" },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: "1px solid #E2E8F0",
          boxShadow: "none",
          background: "#FFFFFF",
        },
      },
    },
    MuiSelect: {
      defaultProps: { size: "small" },
      styleOverrides: { root: { borderRadius: 8, backgroundColor: "#fff" } },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 12 },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
  },
});

export default theme;
