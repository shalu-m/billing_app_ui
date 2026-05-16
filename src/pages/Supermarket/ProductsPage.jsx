import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import QrCodeIcon from "@mui/icons-material/QrCode";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import debounce from "lodash.debounce";

import { productService } from "../../api/services";
import { ConfirmDialog, DataTable, Toast } from "../../components/shared";
import { useConfirm } from "../../hooks/useConfirm";
import { useConfig } from "../../hooks/useConfig";
import { formatCurrency, isBulkProduct } from "../../utils/helpers";

const EMPTY_PRODUCT_FORM = {
  name: "",
  unit: "kg",
  barcode: "",
  cost_price: "",
  selling_price: "",
  purchase_unit: "",
  purchase_qty: "",
  wholesale_cost: "",
  wholesale_price: "",
  cgst: "",
  sgst: "",
  stock: "",
  is_active: true,
};

const asNumberOrNull = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);

const formatAmountInput = (value) => {
  const rounded = Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  return String(rounded);
};

const getLooseCostFromWholesale = (wholesaleCost, purchaseQty) => {
  if (wholesaleCost === "" || wholesaleCost === null || wholesaleCost === undefined) return "";

  const cost = Number(wholesaleCost);
  const qty = Number(purchaseQty);
  if (!Number.isFinite(cost) || !Number.isFinite(qty) || qty <= 0) return "";

  return formatAmountInput(cost / qty);
};

const withAutoLooseCost = (nextForm) => {
  const looseCost = getLooseCostFromWholesale(nextForm.wholesale_cost, nextForm.purchase_qty);
  return looseCost === "" ? nextForm : { ...nextForm, cost_price: looseCost };
};

const cleanProductPayload = (form, editing) => {
  const payload = {
    name: form.name.trim(),
    unit: form.unit,
    cost_price: Number(form.cost_price),
    selling_price: Number(form.selling_price),
    sgst: Number(form.sgst || 0),
    cgst: Number(form.cgst || 0),
    barcode: form.barcode?.trim() || null,
    is_active: form.is_active ?? true,
    purchase_unit: form.purchase_unit || null,
    purchase_qty: form.purchase_unit ? Number(form.purchase_qty) : null,
    wholesale_cost: form.purchase_unit ? asNumberOrNull(form.wholesale_cost) : null,
    wholesale_price: form.purchase_unit ? asNumberOrNull(form.wholesale_price) : null,
  };

  if (!editing) {
    payload.stock = Number(form.stock || 0);
  }

  return payload;
};

const productToForm = (product) => ({
  name: product.name || "",
  unit: product.unit || "kg",
  barcode: product.barcode || "",
  cost_price: product.cost_price ?? "",
  selling_price: product.selling_price ?? "",
  purchase_unit: product.purchase_unit || "",
  purchase_qty: product.purchase_qty ?? "",
  wholesale_cost: product.wholesale_cost ?? "",
  wholesale_price: product.wholesale_price ?? "",
  cgst: product.cgst ?? "",
  sgst: product.sgst ?? "",
  stock: product.stock ?? "",
  is_active: product.is_active ?? true,
});

const normalizeCollection = (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []);

export default function ProductsPage() {
  const { config } = useConfig();
  const productUnits = config?.product_units || [];
  const purchaseUnits = config?.purchase_units || [];
  // Combine both for dropdowns that allow either
  const allUnits = [...new Set([...productUnits, ...purchaseUnits])];
  
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { confirm, dialogProps } = useConfirm();

  const barcodeBufferRef = useRef("");
  const barcodeTimerRef = useRef(null);
  const nameRef = useRef(null);
  const unitFieldRef = useRef(null);
  const barcodeFieldRef = useRef(null);
  const costRef = useRef(null);
  const sellingRef = useRef(null);
  const purchaseUnitRef = useRef(null);
  const purchaseQtyRef = useRef(null);
  const wholesaleCostRef = useRef(null);
  const wholesalePriceRef = useRef(null);
  const cgstRef = useRef(null);
  const sgstRef = useRef(null);
  const stockRef = useRef(null);

  const margin = useMemo(() => {
    if (!form.cost_price || !form.selling_price) return null;
    const selling = Number(form.selling_price);
    if (selling <= 0) return null;
    return (((selling - Number(form.cost_price)) / selling) * 100).toFixed(1);
  }, [form.cost_price, form.selling_price]);

  const autoWholesalePrice =
    form.purchase_unit && form.purchase_qty
      ? Number(form.selling_price || 0) * Number(form.purchase_qty || 0)
      : 0;
  const autoWholesaleCost =
    form.purchase_unit && form.purchase_qty
      ? Number(form.cost_price || 0) * Number(form.purchase_qty || 0)
      : 0;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.list({
        page,
        search,
        per_page: 10,
        sort_by: "name",
        sort_dir: "asc",
      });

      setProducts(normalizeCollection(res));
      setTotalPages(res.meta?.last_page || 1);
    } catch (e) {
      setToast({ open: true, message: e.message || "Failed to fetch products", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const handleKey = (e) => {
      const isFormControl = (element) => {
        if (!element || element === window) return false;

        const tag = element.tagName;
        const role = element.getAttribute?.("role");
        const roleSelector = '[role="combobox"], [role="listbox"], [role="option"], [role="menuitem"]';

        return (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          role === "combobox" ||
          role === "listbox" ||
          role === "option" ||
          role === "menuitem" ||
          Boolean(element.closest?.(`${roleSelector}, .MuiPopover-root, .MuiMenu-root`))
        );
      };

      if (isFormControl(document.activeElement) || isFormControl(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;

      if (e.key === "Enter") {
        const barcode = barcodeBufferRef.current.trim();
        if (barcode) {
          setForm((f) => ({ ...f, barcode }));
          setTimeout(() => barcodeFieldRef.current?.focus(), 0);
        }
        barcodeBufferRef.current = "";
      } else if (e.key === "Backspace") {
        barcodeBufferRef.current = barcodeBufferRef.current.slice(0, -1);
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
        clearTimeout(barcodeTimerRef.current);
        barcodeTimerRef.current = setTimeout(() => {
          barcodeBufferRef.current = "";
        }, 1200);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      clearTimeout(barcodeTimerRef.current);
    };
  }, []);

  const validateProduct = () => {
    const nextErrors = {};
    const cost = Number(form.cost_price);
    const selling = Number(form.selling_price);

    if (!form.name.trim()) nextErrors.name = "Required";
    if (!form.unit) nextErrors.unit = "Required";
    if (form.cost_price === "" || cost < 0) nextErrors.cost_price = "Must be 0 or more";
    if (form.selling_price === "" || selling < 0) nextErrors.selling_price = "Must be 0 or more";
    if (form.cost_price !== "" && form.selling_price !== "" && selling < cost) {
      nextErrors.selling_price = "Must be at least cost price";
    }
    if (!editId && (form.stock === "" || Number(form.stock) < 0)) nextErrors.stock = "Required";
    if (form.purchase_unit && (!form.purchase_qty || Number(form.purchase_qty) <= 0)) {
      nextErrors.purchase_qty = "Required for bulk products";
    }
    if (Number(form.sgst || 0) > 100) nextErrors.sgst = "Max 100";
    if (Number(form.cgst || 0) > 100) nextErrors.cgst = "Max 100";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateProduct()) return;
    const ok = await confirm(editId ? "Update this product?" : "Add this product?");
    if (!ok) return;

    try {
      const payload = cleanProductPayload(form, Boolean(editId));
      if (editId) {
        await productService.update(editId, payload);
        setToast({ open: true, message: "Product updated", severity: "success" });
      } else {
        await productService.create(payload);
        setToast({ open: true, message: "Product added", severity: "success" });
      }
      resetProductForm();
      fetchProducts();
    } catch (e) {
      setToast({ open: true, message: e.message || "Save failed", severity: "error" });
    }
  };

  const handleEdit = (row) => {
    setEditId(row.id);
    setForm(productToForm(row));
    setErrors({});
  };

  const handleDelete = async (id) => {
    const ok = await confirm("Delete this product?");
    if (!ok) return;

    try {
      await productService.delete(id);
      setToast({ open: true, message: "Product deleted", severity: "info" });
      fetchProducts();
    } catch (e) {
      setToast({ open: true, message: e.message || "Delete failed", severity: "error" });
    }
  };

  const resetProductForm = () => {
    setForm(EMPTY_PRODUCT_FORM);
    setEditId(null);
    setErrors({});
  };

  const handleSearchChange = debounce((e) => {
    setSearch(e.target.value);
    setPage(1);
  }, 300);

  const columns = [
    {
      field: "name",
      label: "Product Name",
      render: (v, row) => (
        <Stack spacing={0.25}>
          <Typography variant="body2" fontWeight={700}>{v}</Typography>
          {row.barcode && <Typography variant="caption" color="text.secondary">{row.barcode}</Typography>}
        </Stack>
      ),
    },
    {
      field: "unit",
      label: "Unit",
      render: (_, row) =>
        isBulkProduct(row)
          ? `${row.unit} / ${row.purchase_unit} (x${row.purchase_qty})`
          : row.unit,
    },
    { field: "cost_price", label: "Cost", render: (v) => formatCurrency(v) },
    { field: "selling_price", label: "Selling", render: (v) => formatCurrency(v) },
    { field: "sgst", label: "SGST %", render: (v) => `${Number(v || 0).toFixed(2)}%` },
    { field: "cgst", label: "CGST %", render: (v) => `${Number(v || 0).toFixed(2)}%` },
    {
      field: "stock",
      label: "Stock",
      render: (v, row) => (
        <Chip
          label={`${Number(v || 0).toLocaleString("en-IN")} ${row.unit}`}
          color={Number(v) < 20 ? "error" : Number(v) < 50 ? "warning" : "success"}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "id",
      label: "Actions",
      render: (_, row) => (
        <Stack direction="row">
          <Tooltip title="Edit product">
            <IconButton size="small" onClick={() => handleEdit(row)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete product">
            <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Stack direction="row" mb={2}>
                <TextField
                  fullWidth
                  placeholder="Search products"
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
                <Box textAlign="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <DataTable columns={columns} rows={products} />
                  <Box mt={2} display="flex" justifyContent="center">
                    <Pagination count={totalPages} page={page} onChange={(e, val) => setPage(val)} />
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={700}>
                    {editId ? "Edit Product" : "Add Product"}
                  </Typography>
                  <Tooltip title="Reset form">
                    <IconButton size="small" onClick={resetProductForm}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <TextField
                  fullWidth
                  label="Product Name *"
                  inputRef={nameRef}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && unitFieldRef.current?.focus()}
                  error={Boolean(errors.name)}
                  helperText={errors.name}
                />

                <Grid container spacing={1}>
                  <Grid item xs={5}>
                    <TextField
                      select
                      fullWidth
                      label="Unit"
                      inputRef={unitFieldRef}
                      value={form.unit}
                      onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && barcodeFieldRef.current?.focus()}
                      error={Boolean(errors.unit)}
                      helperText={errors.unit}
                    >
                      {productUnits.map((unit) => (
                        <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={7}>
                    <TextField
                      fullWidth
                      label="Barcode"
                      inputRef={barcodeFieldRef}
                      value={form.barcode}
                      onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && costRef.current?.focus()}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <QrCodeIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Cost Price *"
                      type="number"
                      inputRef={costRef}
                      value={form.cost_price}
                      onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && sellingRef.current?.focus()}
                      error={Boolean(errors.cost_price)}
                      helperText={errors.cost_price}
                      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Selling Price *"
                      type="number"
                      inputRef={sellingRef}
                      value={form.selling_price}
                      onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && purchaseUnitRef.current?.focus()}
                      error={Boolean(errors.selling_price)}
                      helperText={errors.selling_price}
                      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    />
                  </Grid>
                </Grid>

                {margin !== null && (
                  <Alert severity={Number(margin) >= 15 ? "success" : Number(margin) >= 8 ? "warning" : "error"} icon={false}>
                    Margin: <strong>{margin}%</strong>
                  </Alert>
                )}

                <Alert severity="info" icon={false}>
                  Use bulk fields only for items sold both loose and wholesale, like rice, oil, sugar, tins or sacks.
                </Alert>

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <TextField
                      select
                      fullWidth
                      label="Purchase Unit"
                      inputRef={purchaseUnitRef}
                      value={form.purchase_unit || ""}
                      onChange={(e) =>
                        setForm((f) =>
                          withAutoLooseCost({
                            ...f,
                            purchase_unit: e.target.value,
                            purchase_qty: e.target.value ? f.purchase_qty : "",
                            wholesale_cost: e.target.value ? f.wholesale_cost : "",
                            wholesale_price: e.target.value ? f.wholesale_price : "",
                          })
                        )
                      }
                      onKeyDown={(e) => e.key === "Enter" && purchaseQtyRef.current?.focus()}
                    >
                      <MenuItem value="">None</MenuItem>
                      {allUnits.map((unit) => (
                        <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Conversion Qty"
                      type="number"
                      inputRef={purchaseQtyRef}
                      value={form.purchase_qty}
                      disabled={!form.purchase_unit}
                      onChange={(e) =>
                        setForm((f) => withAutoLooseCost({ ...f, purchase_qty: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && wholesaleCostRef.current?.focus()}
                      error={Boolean(errors.purchase_qty)}
                      helperText={errors.purchase_qty || (form.purchase_unit ? `1 ${form.purchase_unit} = ? ${form.unit}` : "")}
                    />
                  </Grid>
                </Grid>

                {form.purchase_unit && (
                  <>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Wholesale Cost"
                          type="number"
                          inputRef={wholesaleCostRef}
                          value={form.wholesale_cost}
                          onChange={(e) =>
                            setForm((f) => withAutoLooseCost({ ...f, wholesale_cost: e.target.value }))
                          }
                          onKeyDown={(e) => e.key === "Enter" && wholesalePriceRef.current?.focus()}
                          helperText={
                            form.purchase_qty && form.wholesale_cost !== ""
                              ? `Cost Price ${formatCurrency(form.cost_price)}/${form.unit}`
                              : `Auto ${formatCurrency(autoWholesaleCost)}`
                          }
                          InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Wholesale Price"
                          type="number"
                          inputRef={wholesalePriceRef}
                          value={form.wholesale_price}
                          onChange={(e) => setForm((f) => ({ ...f, wholesale_price: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && cgstRef.current?.focus()}
                          helperText={`Auto ${formatCurrency(autoWholesalePrice)}`}
                          InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        />
                      </Grid>
                    </Grid>
                    <Alert severity="success" icon={false}>
                      Final wholesale price: <strong>{formatCurrency(form.wholesale_price || autoWholesalePrice)}</strong>
                      {" "}per {form.purchase_unit}. Cost: <strong>{formatCurrency(form.wholesale_cost || autoWholesaleCost)}</strong>
                    </Alert>
                  </>
                )}

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="CGST %"
                      type="number"
                      inputRef={cgstRef}
                      value={form.cgst}
                      onChange={(e) => setForm((f) => ({ ...f, cgst: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && sgstRef.current?.focus()}
                      error={Boolean(errors.cgst)}
                      helperText={errors.cgst}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="SGST %"
                      type="number"
                      inputRef={sgstRef}
                      value={form.sgst}
                      onChange={(e) => setForm((f) => ({ ...f, sgst: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && (editId ? handleSubmit() : stockRef.current?.focus())}
                      error={Boolean(errors.sgst)}
                      helperText={errors.sgst}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    />
                  </Grid>
                </Grid>

                {!editId && (
                  <TextField
                    fullWidth
                    label="Opening Stock *"
                    type="number"
                    inputRef={stockRef}
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    error={Boolean(errors.stock)}
                    helperText={errors.stock || `Tracked in ${form.unit}`}
                  />
                )}

                <Stack spacing={1}>
                  <Button fullWidth variant="contained" startIcon={editId ? null : <AddIcon />} onClick={handleSubmit}>
                    {editId ? "Update Product" : "Add Product"}
                  </Button>
                  {editId && (
                    <Button fullWidth variant="outlined" color="inherit" onClick={resetProductForm}>
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
