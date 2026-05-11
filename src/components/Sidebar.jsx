// src/components/Sidebar.jsx
import {
  Drawer, Box, List, ListItemButton, ListItemIcon,
  ListItemText, Typography, Divider,
} from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import EggOutlinedIcon from "@mui/icons-material/EggOutlined";
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ShowChartIcon from "@mui/icons-material/ShowChart";

const DRAWER_WIDTH = 220;

const NAV_ITEMS = {
  supermarket: [
    { label: "Billing", value: "billing", icon: <ReceiptOutlinedIcon fontSize="small" /> },
    { label: "Products", value: "products", icon: <InventoryOutlinedIcon fontSize="small" /> },
    { label: "Stock", value: "stock", icon: <LocalShippingOutlinedIcon fontSize="small" /> },
    { label: "Bill Details", value: "billdetails", icon: <ListAltOutlinedIcon fontSize="small" /> },
    { label: "Reports", value: "reports", icon: <BarChartOutlinedIcon fontSize="small" /> },
  ],
  egg: [
    { label: "Egg Entry", value: "entry", icon: <AddCircleIcon fontSize="small" /> },
    { label: "Reports", value: "egreports", icon: <ShowChartIcon fontSize="small" /> },
  ],
};

const MODULE_ITEMS = [
  { label: "Supermarket", value: "supermarket", icon: <ShoppingCartOutlinedIcon fontSize="small" /> },
  { label: "Egg Tracking", value: "egg", icon: <EggOutlinedIcon fontSize="small" /> },
];

export default function Sidebar({ module, setModule, page, setPage, shopName }) {
  const navItems = NAV_ITEMS[module] || [];

  const handleModuleChange = (mod) => {
    setModule(mod);
    setPage(NAV_ITEMS[mod][0].value);
  };

  return (
    <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" } }}>
      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="h6" color="primary.main" fontWeight={800} letterSpacing={-0.5}>
          {shopName}
        </Typography>
      </Box>

      {/* Module Switcher */}
      <Box sx={{ px: 1.5, pt: 1.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase"
          letterSpacing="0.08em" sx={{ px: 1, display: "block", mb: 0.5 }}>
          Module
        </Typography>
        <List dense disablePadding>
          {MODULE_ITEMS.map((item) => (
            <ListItemButton
              key={item.value}
              selected={module === item.value}
              onClick={() => handleModuleChange(item.value)}
              sx={{
                borderRadius: 2, mb: 0.25,
                "&.Mui-selected": { bgcolor: "primary.50", color: "primary.main", "& .MuiListItemIcon-root": { color: "primary.main" } },
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: "text.secondary" }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.845rem", fontWeight: 600 }} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider sx={{ mx: 1.5, my: 1.5 }} />

      {/* Page Nav */}
      <Box sx={{ px: 1.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase"
          letterSpacing="0.08em" sx={{ px: 1, display: "block", mb: 0.5 }}>
          Pages
        </Typography>
        <List dense disablePadding>
          {navItems.map((item) => (
            <ListItemButton
              key={item.value}
              selected={page === item.value}
              onClick={() => setPage(item.value)}
              sx={{
                borderRadius: 2, mb: 0.25,
                "&.Mui-selected": { bgcolor: "primary.50", color: "primary.main", "& .MuiListItemIcon-root": { color: "primary.main" } },
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: "text.secondary" }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.845rem", fontWeight: 500 }} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
