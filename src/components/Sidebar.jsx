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

const SHOP_ICONS = {
  supermarket: <ShoppingCartOutlinedIcon fontSize="small" />,
  egg: <EggOutlinedIcon fontSize="small" />,
};

const PAGE_ICONS = {
  billing: <ReceiptOutlinedIcon fontSize="small" />,
  products: <InventoryOutlinedIcon fontSize="small" />,
  stock: <LocalShippingOutlinedIcon fontSize="small" />,
  billdetails: <ListAltOutlinedIcon fontSize="small" />,
  reports: <BarChartOutlinedIcon fontSize="small" />,
  entry: <AddCircleIcon fontSize="small" />,
  egreports: <ShowChartIcon fontSize="small" />,
};

export function getNavigationShops(navigation) {
  return Array.isArray(navigation?.shops) ? navigation.shops : [];
}

export function getShopPages(shopKey, navigation) {
  return getNavigationShops(navigation).find((shop) => shop.key === shopKey)?.pages || [];
}

export function getDefaultShopKey(navigation) {
  const shops = getNavigationShops(navigation);
  return (
    shops.find((shop) => shop.key === navigation?.default_shop)?.key ||
    shops[0]?.key ||
    ""
  );
}

export function getDefaultPageKey(shopKey, navigation) {
  const shop = getNavigationShops(navigation).find((item) => item.key === shopKey);
  const pages = shop?.pages || [];
  return (
    pages.find((page) => page.key === shop?.default_page)?.key ||
    pages[0]?.key ||
    ""
  );
}

export default function Sidebar({ shop, setShop, page, setPage, shopName, navigation }) {
  const shops = getNavigationShops(navigation);
  const pages = getShopPages(shop, navigation);

  const handleShopChange = (nextShop) => {
    setShop(nextShop);
    const firstPage = getDefaultPageKey(nextShop, navigation);
    if (firstPage) {
      setPage(firstPage);
    }
  };

  return (
    <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" } }}>
      <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="h6" color="primary.main" fontWeight={800} letterSpacing={0}>
          {shopName}
        </Typography>
      </Box>

      <Box sx={{ px: 1.5, pt: 1.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase"
          letterSpacing="0.08em" sx={{ px: 1, display: "block", mb: 0.5 }}>
          Shop
        </Typography>
        <List dense disablePadding>
          {shops.map((item) => (
            <ListItemButton
              key={item.key}
              selected={shop === item.key}
              onClick={() => handleShopChange(item.key)}
              sx={{
                borderRadius: 2, mb: 0.25,
                "&.Mui-selected": { bgcolor: "primary.50", color: "primary.main", "& .MuiListItemIcon-root": { color: "primary.main" } },
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: "text.secondary" }}>
                {SHOP_ICONS[item.key] || <ShoppingCartOutlinedIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.845rem", fontWeight: 600 }} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider sx={{ mx: 1.5, my: 1.5 }} />

      <Box sx={{ px: 1.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase"
          letterSpacing="0.08em" sx={{ px: 1, display: "block", mb: 0.5 }}>
          Pages
        </Typography>
        <List dense disablePadding>
          {pages.map((item) => (
            <ListItemButton
              key={item.key}
              selected={page === item.key}
              onClick={() => setPage(item.key)}
              sx={{
                borderRadius: 2, mb: 0.25,
                "&.Mui-selected": { bgcolor: "primary.50", color: "primary.main", "& .MuiListItemIcon-root": { color: "primary.main" } },
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: "text.secondary" }}>
                {PAGE_ICONS[item.key] || <ListAltOutlinedIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.845rem", fontWeight: 500 }} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
