import { useState, useEffect, useRef } from "react";
import {
  Box, Grid, Card, CardContent, Typography, TextField, Button,
  Stack, IconButton, MenuItem, InputAdornment, Tooltip, Chip,
  Pagination, CircularProgress
} from "@mui/material";

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";

import { PRODUCT_UNITS } from "../../data/mockData";
import { formatCurrency } from "../../utils/helpers";
import { DataTable, Toast, ConfirmDialog } from "../../components/shared";
import { productService } from "../../api/services";
import QrCodeIcon from "@mui/icons-material/QrCode";
import debounce from "lodash.debounce";
import { useConfirm } from "../../hooks/useConfirm";


const EMPTY_FORM = {
  name: "",
  unit: "kg",
  cost_price: "",
  selling_price: "",
  sgst: "",
  cgst: "",
  stock: "",
  barcode: ""
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { confirm, dialogProps } = useConfirm();

  const barcodeBufferRef = useRef("");
  const barcodeTimerRef  = useRef(null);
  const barcodeFieldRef  = useRef(null);

  const nameRef     = useRef(null);
  const unitRef     = useRef(null);
  const costRef     = useRef(null);
  const sellingRef  = useRef(null);
  const cgstRef     = useRef(null);
  const sgstRef     = useRef(null);
  const stockRef    = useRef(null);

  // 🔥 FETCH PRODUCTS
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productService.list({
        page,
        search, 
        per_page: 10,
        sort_by: "name",
        sort_dir: "asc",
      });

      setProducts(res.data);
      setTotalPages(res.meta.last_page);
    } catch (e) {
      setToast({ open: true, message: "Failed to fetch products", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  // BARCODE SCANNING
  useEffect(() => {
    const handleKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Enter") {
        const barcode = barcodeBufferRef.current.trim();
        if (barcode) {
          setForm((f) => ({ ...f, barcode }));
          barcodeFieldRef.current?.focus();
        }
        barcodeBufferRef.current = "";
      } else if (e.key === "Backspace") {
        barcodeBufferRef.current = barcodeBufferRef.current.slice(0, -1);
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
        clearTimeout(barcodeTimerRef.current);
        barcodeTimerRef.current = setTimeout(() => {
          barcodeBufferRef.current = "";
        }, 2000);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      clearTimeout(barcodeTimerRef.current);
    };
  }, []);
  

  // 🔍 VALIDATION
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.cost_price || +form.cost_price <= 0) e.cost_price = "Must be > 0";
    if (!form.selling_price || +form.selling_price <= 0) e.selling_price = "Must be > 0";
    if (+form.selling_price < +form.cost_price) e.selling_price = "Must be ≥ cost price";
    if (form.stock === "" || +form.stock < 0) e.stock = "Required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ➕ CREATE / UPDATE
  const handleSubmit = async () => {
    if (!validate()) return;
    const ok = await confirm(`Are you sure you want to save?`);
    if (!ok) return;
    try {
      if (editId) {
        await productService.update(editId, form);
        setToast({ open: true, message: "Product updated", severity: "success" });
      } else {
        await productService.create(form);
        setToast({ open: true, message: "Product added", severity: "success" });
      }

      reset();
      fetchProducts();
    } catch (e) {
      setToast({ open: true, message: "Save failed", severity: "error" });
    }
  };

  // ✏️ EDIT
  const handleEdit = (row) => {
    setEditId(row.id);
    setForm(row);
    setErrors({});
  };

  // 🗑 DELETE
  const handleDelete = async (id) => {
    try {
      const ok = await confirm(`Are you sure you want to delete this product?`);
      if (!ok) return;
      await productService.delete(id);
      setToast({ open: true, message: "Deleted successfully", severity: "info" });
      fetchProducts();
    } catch {
      setToast({ open: true, message: "Delete failed", severity: "error" });
    }
  };

  // 🔄 RESET
  const reset = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setErrors({});
  };

  // Search 
  const handleSearchChange = debounce((e) => {
    setSearch(e.target.value);
    setPage(1);
  }, 300);

  const margin =
    form.cost_price && form.selling_price
      ? (((+form.selling_price - +form.cost_price) / +form.selling_price) * 100).toFixed(1)
      : null;

  const columns = [
    { field: "name", label: "Product Name" },
    { field: "unit", label: "Unit" },
    { field: "cost_price", label: "Cost", render: (v) => formatCurrency(v) },
    { field: "selling_price", label: "Selling", render: (v) => formatCurrency(v) },
    { field: "sgst", label: "SGST %", render: (v) => `${v}%` },
    { field: "cgst", label: "CGST %", render: (v) => `${v}%` },
    {
      field: "stock",
      label: "Stock",
      render: (v, row) => (
        <Chip
          label={`${v} ${row.unit}`}
          color={v < 20 ? "error" : v < 50 ? "warning" : "success"}
          size="small"
        />
      ),
    },
    {
      field: "id",
      label: "Actions",
      render: (_, row) => (
        <Stack direction="row">
          <IconButton onClick={() => handleEdit(row)}>
            <EditOutlinedIcon />
          </IconButton>
          <IconButton color="error" onClick={() => handleDelete(row.id)}>
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Grid container spacing={2}>
        {/* LEFT TABLE */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>

              {/* SEARCH */}
              <Stack direction="row" mb={2}>
                <TextField
                  fullWidth
                  placeholder="Search products..."
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>

              {loading ? (
                <Box textAlign="center">
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <DataTable columns={columns} rows={products} />

                  {/* PAGINATION */}
                  <Box mt={2} display="flex" justifyContent="center">
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(e, val) => setPage(val)}
                    />
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>{editId ? "Edit Product" : "Add Product"}</Typography>
                {editId && (
                  <Tooltip title="Reset form">
                    <IconButton size="small" onClick={reset}><RefreshIcon fontSize="small" /></IconButton>
                  </Tooltip>
                )}
              </Stack>

              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Product Name *"
                  inputRef={nameRef}
                  onKeyDown={(e) => e.key === "Enter" && unitRef.current?.focus()}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  error={!!errors.name}
                  helperText={errors.name}
                />

                <Grid container spacing={0.5}>
                  <Grid item xs={6}>
                    <TextField
                      select fullWidth label="Unit"
                      inputRef={unitRef}
                      onKeyDown={(e) => e.key === "Enter" && barcodeFieldRef.current?.focus()}
                      value={form.unit}
                      onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    >
                      {PRODUCT_UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth label="Barcode"
                      value={form.barcode}
                      inputRef={barcodeFieldRef}
                      onKeyDown={(e) => e.key === "Enter" && costRef.current?.focus()}
                      onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                      InputProps={{ startAdornment: <InputAdornment position="start"><QrCodeIcon fontSize="small" color="action" /></InputAdornment> }}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={0.5}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth label="Cost Price *" type="number"
                      inputRef={costRef}
                      onKeyDown={(e) => e.key === "Enter" && sellingRef.current?.focus()}
                      value={form.cost_price}
                      onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
                      error={!!errors.cost_price} helperText={errors.cost_price}
                      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth label="Selling Price *" type="number"
                      inputRef={sellingRef}
                      onKeyDown={(e) => e.key === "Enter" && cgstRef.current?.focus()}
                      value={form.selling_price}
                      onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))}
                      error={!!errors.selling_price} helperText={errors.selling_price}
                      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    />
                  </Grid>
                </Grid>

                {margin !== null && (
                  <Box sx={{ bgcolor: +margin > 0 ? "success.light" : "error.light", borderRadius: 1, px: 1.5, py: 1 }}>
                    <Typography variant="caption" color={+margin > 0 ? "success.dark" : "error.dark"} fontWeight={600}>
                      Margin: {margin}% {+margin < 5 && "⚠ Low margin"}
                    </Typography>
                  </Box>
                )}

                <Grid container spacing={0.5}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth label="CGST (%)" type="number"
                      inputRef={cgstRef}
                      onKeyDown={(e) => e.key === "Enter" && sgstRef.current?.focus()}
                      value={form.cgst}
                      onChange={(e) => setForm((f) => ({ ...f, cgst: e.target.value }))}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth label="SGST (%)" type="number"
                      inputRef={sgstRef}
                      onKeyDown={(e) => e.key === "Enter" && stockRef.current?.focus()}
                      value={form.sgst}
                      onChange={(e) => setForm((f) => ({ ...f, sgst: e.target.value }))}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    />
                  </Grid>
                </Grid>

                <TextField
                  fullWidth label="Stock Quantity *" type="number"
                  inputRef={stockRef}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  error={!!errors.stock} helperText={errors.stock}
                />

                <Stack spacing={1}>
                  <Button fullWidth variant="contained" startIcon={editId ? null : <AddIcon />} onClick={handleSubmit} sx={{ py: 1.1 }}>
                    {editId ? "Update Product" : "Add Product"}
                  </Button>
                  {editId && (
                    <Button fullWidth variant="outlined" color="inherit" onClick={reset} sx={{ color: "text.secondary" }}>
                      Cancel Edit
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}