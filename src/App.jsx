// src/App.jsx
import { useEffect, useMemo, useState } from "react";
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
  Alert,
} from "@mui/material";
import { ThemeProvider, CssBaseline } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";

import theme from "./theme/theme";
import Sidebar, {
  getDefaultPageKey,
  getDefaultShopKey,
  getNavigationShops,
  getShopPages,
} from "./components/Sidebar";
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

const PAGE_COMPONENTS = {
  billing: <BillingPage />,
  products: <ProductsPage />,
  stock: <StockIntakePage />,
  billdetails: <BillDetailsPage />,
  reports: <SupermarketReportsPage />,
  entry: <EggEntryPage />,
  egreports: <EggReportsPage />,
};

export default function App() {
  const state = useAppState();
  const { user, logout, loading } = useAuth();
  const [shop, setShop] = useState("supermarket");
  const [page, setPage] = useState("billing");
  const [anchorEl, setAnchorEl] = useState(null);

  const navigation = user?.navigation;
  const shops = useMemo(() => getNavigationShops(navigation), [navigation]);
  const defaultShop = useMemo(() => getDefaultShopKey(navigation), [navigation]);
  const resolvedShop = shops.some((item) => item.key === shop)
    ? shop
    : defaultShop;
  const allowedPages = useMemo(
    () => getShopPages(resolvedShop, navigation),
    [resolvedShop, navigation]
  );
  const resolvedPage = allowedPages.some((item) => item.key === page)
    ? page
    : getDefaultPageKey(resolvedShop, navigation) || page;
  const activeShop = shops.find((item) => item.key === resolvedShop);
  const activePage = allowedPages.find((item) => item.key === resolvedPage);
  const activeShopLabel = activeShop?.label || "Shop";
  const fallbackMeta = PAGE_META[resolvedPage] || {};
  const meta = {
    title: activePage?.title || fallbackMeta.title,
    subtitle: activePage?.subtitle || fallbackMeta.subtitle,
  };

  useEffect(() => {
    if (!user) return;

    if (resolvedShop !== shop) {
      setShop(resolvedShop);
    }

    if (resolvedPage && resolvedPage !== page) {
      setPage(resolvedPage);
    }
  }, [page, resolvedPage, resolvedShop, shop, user]);

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
    const canViewPage = allowedPages.some((item) => item.key === resolvedPage);
    const PageComponent = PAGE_COMPONENTS[resolvedPage];

    if (!canViewPage || !PageComponent) {
      return (
        <Alert severity="warning">
          You do not have permission to view this page.
        </Alert>
      );
    }

    return PageComponent;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Root Layout */}
      <Box >
        
        {/* Sidebar */}
        <Sidebar
          shop={resolvedShop}
          setShop={setShop}
          page={resolvedPage}
          setPage={setPage}
          shopName={activeShop?.label || state.shopName}
          navigation={navigation}
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
                  label={activeShopLabel}
                  size="small"
                  color="primary"
                  variant="outlined"
                />

                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" fontWeight={600}>
                    {user.name}
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
                      {user.name[0].toUpperCase()}
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
            key={resolvedPage}
          >
            {renderPage()}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
