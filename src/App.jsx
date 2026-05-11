// src/App.jsx
import { useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Stack,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { ThemeProvider, CssBaseline } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";

import theme from "./theme/theme";
import Sidebar from "./components/Sidebar";
import { useAppState } from "./hooks/useAppState";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";

// Pages
import BillingPage from "./pages/Supermarket/BillingPage";
import ProductsPage from "./pages/Supermarket/ProductsPage";
import StockIntakePage from "./pages/Supermarket/StockIntakePage";
import BillDetailsPage from "./pages/Supermarket/BillDetailsPage";
import SupermarketReportsPage from "./pages/Supermarket/ReportsPage";
import EggEntryPage from "./pages/EggTracking/EggEntryPage";
import EggReportsPage from "./pages/EggTracking/EggReportsPage";

const DRAWER_WIDTH = 220;

const PAGE_META = {
  billing: {
    title: "Billing Terminal",
    subtitle: "Create and manage customer bills",
  },
  products: {
    title: "Product Inventory",
    subtitle: "Manage, update and track products",
  },
  stock: {
    title: "Stock Intake",
    subtitle: "Track, add, edit and reverse supplier purchases",
  },
  billdetails: {
    title: "Bill Details",
    subtitle: "View and search past transactions",
  },
  reports: {
    title: "Reports",
    subtitle: "Sales, profit and product analytics",
  },
  entry: {
    title: "Daily Egg Entry",
    subtitle: "Record daily egg stock and sales",
  },
  egreports: {
    title: "Egg Reports",
    subtitle: "Egg tracking analytics and performance",
  },
};

export default function App() {
  const state = useAppState();
  const { user, logout, loading } = useAuth();
  const [module, setModule] = useState("supermarket");
  const [page, setPage] = useState("billing");
  const [anchorEl, setAnchorEl] = useState(null);

  const meta = PAGE_META[page] || {};

  // 🔥 Show loading while checking auth
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  // 🔥 Show login if not authenticated
  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage />
      </ThemeProvider>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "billing":
        return (
          <BillingPage/>
        );

      case "products":
        return (
          <ProductsPage/>
        );

      case "stock":
        return <StockIntakePage/>;

      case "billdetails":
        return <BillDetailsPage/>;

      case "reports":
        return (
          <SupermarketReportsPage/>
        );

      case "entry":
        return (
          <EggEntryPage/>
        );

      case "egreports":
        return <EggReportsPage/>;

      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Root Layout */}
      <Box >
        
        {/* Sidebar */}
        <Sidebar
          module={module}
          setModule={setModule}
          page={page}
          setPage={setPage}
          shopName={state.shopName}
        />

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            ml: `${DRAWER_WIDTH}px`, // 🔥 Fix sidebar overlap
            // width: `calc(100% - ${DRAWER_WIDTH}px)`, // 🔥 Prevent extra space
          }}
        >
          
          {/* Top Bar */}
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              bgcolor: "background.paper",
              borderBottom: "1px solid",
              borderColor: "divider",
              color: "text.primary",
            }}
          >
            <Toolbar sx={{ justifyContent: "space-between" }}>
              
              {/* Title */}
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {meta.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {meta.subtitle}
                </Typography>
              </Box>

              {/* Right Section */}
              <Stack direction="row" alignItems="center" spacing={2}>
                <Chip
                  label={
                    module === "supermarket"
                      ? "Supermarket"
                      : "Egg Tracking"
                  }
                  size="small"
                  color="primary"
                  variant="outlined"
                />

                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" fontWeight={600}>
                    {user.username}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{
                      bgcolor: "primary.main",
                      color: "white",
                      width: 32,
                      height: 32,
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "transparent",
                        fontSize: "0.8rem",
                      }}
                    >
                      {user.username[0].toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Stack>
              </Stack>

              {/* Logout Menu */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem
                  onClick={() => {
                    logout();
                    setAnchorEl(null);
                  }}
                  sx={{ color: "error.main" }}
                >
                  <LogoutIcon sx={{ mr: 1, fontSize: "1.2rem" }} />
                  Logout
                </MenuItem>
              </Menu>
            </Toolbar>
          </AppBar>

          {/* Page Content */}
          <Box
            component="main"
            sx={{
              flex: 1,
              p: 2, // 🔥 Reduced padding (better layout)
              overflowY: "auto",
            }}
            key={page}
          >
            {renderPage()}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
