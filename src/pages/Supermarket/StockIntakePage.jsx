import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import debounce from "lodash.debounce";

import { productService } from "../../api/services";
import { ConfirmDialog, DataTable, Toast } from "../../components/shared";
import { useConfirm } from "../../hooks/useConfirm";
import { formatCurrency, formatDate, isBulkProduct } from "../../utils/helpers";

const todayInput = () => new Date().toISOString().split("T")[0];

const EMPTY_FORM = {
  product_id: "",
  received_unit: "",
  received_qty: "",
  cost_per_unit: "",
  supplier_name: "",
  invoice_number: "",
  purchase_date: todayInput(),
  notes: "",
};

const normalizeCollection = (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []);

export default function StockIntakePage() {
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearchInput, setProductSearchInput] = useState("");
  const [intakes, setIntakes] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { confirm, dialogProps } = useConfirm();

  const productRef = useRef(null);
  const unitRef = useRef(null);
  const qtyRef = useRef(null);
  const costRef = useRef(null);
  const supplierRef = useRef(null);
  const invoiceRef = useRef(null);
  const dateRef = useRef(null);

  const unitOptions = useMemo(() => {
    if (!selectedProduct) return ["kg"];
    const units = selectedProduct.purchase_unit
      ? [selectedProduct.purchase_unit, selectedProduct.unit]
      : [selectedProduct.unit];
    return [...new Set(units.filter(Boolean))];
  }, [selectedProduct]);

  const preview = useMemo(() => {
    if (!selectedProduct || !form.received_unit || !form.received_qty || form.cost_per_unit === "") {
      return null;
    }

    const qty = Number(form.received_qty || 0);
    const cost = Number(form.cost_per_unit || 0);
    const purchaseQty = Number(selectedProduct.purchase_qty || 0);
    const receivedAsBulk =
      isBulkProduct(selectedProduct) &&
      form.received_unit === selectedProduct.purchase_unit &&
      purchaseQty > 0;
    const convertedQty = receivedAsBulk ? qty * purchaseQty : qty;
    const totalCost = qty * cost;
    const currentStock = Number(selectedProduct.stock || 0);
    const stockAfter = currentStock + convertedQty;
    const nextLooseCost = receivedAsBulk ? cost / purchaseQty : cost;
    const nextWholesaleCost = receivedAsBulk
      ? cost
      : purchaseQty > 0
        ? cost * purchaseQty
        : null;

    return {
      convertedQty,
      totalCost,
      stockAfter,
      receivedAsBulk,
      nextLooseCost,
      nextWholesaleCost,
    };
  }, [selectedProduct, form]);

  useEffect(() => {
    const term = productSearchInput.trim();

    if (!term) {
      setProductOptions(selectedProduct ? [selectedProduct] : []);
      setLoadingProducts(false);
      return undefined;
    }

    let ignore = false;
    setLoadingProducts(true);

    const timer = setTimeout(async () => {
      try {
        const res = await productService.list({
          search: term,
          per_page: 10,
          sort_by: "name",
          sort_dir: "asc",
        });

        if (ignore) return;

        const matches = normalizeCollection(res);
        setProductOptions(
          selectedProduct
            ? [selectedProduct, ...matches.filter((product) => product.id !== selectedProduct.id)]
            : matches
        );
      } catch (e) {
        if (!ignore) {
          setProductOptions(selectedProduct ? [selectedProduct] : []);
          setToast({ open: true, message: e.message || "Failed to search products", severity: "error" });
        }
      } finally {
        if (!ignore) setLoadingProducts(false);
      }
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [productSearchInput, selectedProduct]);

  const fetchIntakes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: 10,
      };
      if (search) params.search = search;
      if (filterProduct) params.product_id = filterProduct;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await productService.getStockIntakes(params);
      setIntakes(normalizeCollection(res));
      setTotalPages(res.meta?.last_page || 1);
    } catch (e) {
      setToast({ open: true, message: e.message || "Failed to fetch stock intakes", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [page, search, filterProduct, fromDate, toDate]);

  useEffect(() => {
    fetchIntakes();
  }, [fetchIntakes]);

  const handleSearchChange = debounce((value) => {
    setSearch(value);
    setPage(1);
  }, 300);

  const validate = () => {
    const nextErrors = {};
    if (!form.product_id) nextErrors.product_id = "Required";
    if (!form.received_unit) nextErrors.received_unit = "Required";
    if (!form.received_qty || Number(form.received_qty) <= 0) {
      nextErrors.received_qty = "Must be greater than 0";
    }
    if (form.cost_per_unit === "" || Number(form.cost_per_unit) < 0) {
      nextErrors.cost_per_unit = "Must be 0 or more";
    }
    if (!form.purchase_date) nextErrors.purchase_date = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setSelectedProduct(null);
    setProductOptions([]);
    setProductSearchInput("");
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const ok = await confirm("Record this stock intake?");
    if (!ok) return;

    setSaving(true);
    try {
      const payload = {
        product_id: Number(form.product_id),
        received_unit: form.received_unit,
        received_qty: Number(form.received_qty),
        cost_per_unit: Number(form.cost_per_unit),
        supplier_name: form.supplier_name.trim() || null,
        invoice_number: form.invoice_number.trim() || null,
        purchase_date: form.purchase_date,
        notes: form.notes.trim() || null,
      };

      await productService.createStockIntake(payload);
      setToast({ open: true, message: "Stock intake recorded", severity: "success" });

      reset();
      fetchIntakes();
    } catch (e) {
      setToast({ open: true, message: e.message || "Failed to save stock intake", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm("Delete this stock intake and reverse its stock?");
    if (!ok) return;

    try {
      await productService.deleteStockIntake(id);
      setToast({ open: true, message: "Stock intake deleted and stock reversed", severity: "info" });
      fetchIntakes();
    } catch (e) {
      setToast({ open: true, message: e.message || "Delete failed", severity: "error" });
    }
  };

  const handleProductChange = (product) => {
    setSelectedProduct(product || null);
    setProductOptions(product ? [product] : []);
    setProductSearchInput(product?.name || "");
    setForm((current) => ({
      ...current,
      product_id: product?.id || "",
      received_unit: product?.purchase_unit || product?.unit || "",
    }));

    if (product) {
      setTimeout(() => unitRef.current?.focus(), 0);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSearchText("");
    setFilterProduct("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const columns = [
    {
      field: "product",
      label: "Product",
      render: (_, row) => (
        <Stack spacing={0.25}>
          <Typography variant="body2" fontWeight={700}>{row.product?.name || "Deleted product"}</Typography>
          <Typography variant="caption" color="text.secondary">
            Stock unit: {row.product?.unit || "-"}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "supplier_name",
      label: "Supplier / Invoice",
      render: (_, row) => (
        <Stack spacing={0.25}>
          <Typography variant="body2">{row.supplier_name || "-"}</Typography>
          <Typography variant="caption" color="text.secondary">{row.invoice_number || "-"}</Typography>
        </Stack>
      ),
    },
    {
      field: "received_qty",
      label: "Received",
      align: "right",
      render: (value, row) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {Number(value || 0).toLocaleString("en-IN")} {row.received_unit}
        </Typography>
      ),
    },
    {
      field: "converted_qty",
      label: "Added Stock",
      align: "right",
      render: (value, row) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {Number(value || 0).toLocaleString("en-IN")} {row.product?.unit || ""}
        </Typography>
      ),
    },
    {
      field: "cost_per_unit",
      label: "Cost/Unit",
      align: "right",
      render: (value) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {formatCurrency(value)}
        </Typography>
      ),
    },
    {
      field: "total_cost",
      label: "Total",
      align: "right",
      render: (value) => (
        <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
          {formatCurrency(value)}
        </Typography>
      ),
    },
    {
      field: "purchase_date",
      label: "Date",
      align: "center",
      render: (value) => (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          {formatDate(value)}
        </Typography>
      ),
    },
    {
      field: "id",
      label: "Actions",
      align: "center",
      render: (_, row) => (
        <Stack direction="row" justifyContent="center">
          <Tooltip title="Delete and reverse stock">
            <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
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
              <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
                <TextField
                  sx={{ flex: 1, minWidth: 220 }}
                  placeholder="Search product, supplier or invoice"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    handleSearchChange(e.target.value);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="From"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 140 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="To"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 140 }}
                />
                <Button variant="outlined" onClick={resetFilters}>Reset</Button>
              </Stack>

              {loading ? (
                <Box textAlign="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <DataTable
                    columns={columns}
                    rows={intakes}
                    emptyMessage="No stock intakes found"
                  />
                  {totalPages > 1 && (
                    <Box mt={2} display="flex" justifyContent="center">
                      <Pagination count={totalPages} page={page} onChange={(e, value) => setPage(value)} />
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ position: "sticky", top: 84 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Record Stock Intake
                </Typography>
                <Tooltip title="Reset form">
                  <IconButton size="small" onClick={reset}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Stack spacing={2}>
                <Autocomplete
                  fullWidth
                  value={selectedProduct}
                  inputValue={productSearchInput}
                  options={productOptions}
                  loading={loadingProducts}
                  filterOptions={(options) => options}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  getOptionLabel={(option) =>
                    option?.name
                      ? `${option.name}${option.barcode ? ` (${option.barcode})` : ""}`
                      : ""
                  }
                  noOptionsText={
                    productSearchInput.trim() ? "No products found" : "Type to search products"
                  }
                  onInputChange={(_, value, reason) => {
                    setProductSearchInput(value);

                    if (reason === "input" && selectedProduct && value !== selectedProduct.name) {
                      setSelectedProduct(null);
                      setForm((current) => ({ ...current, product_id: "", received_unit: "" }));
                    }
                  }}
                  onChange={(_, product) => handleProductChange(product)}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.barcode || "No barcode"} - {option.unit}
                          {option.purchase_unit ? ` / ${option.purchase_unit}` : ""}
                        </Typography>
                      </Stack>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Product *"
                      inputRef={productRef}
                      error={Boolean(errors.product_id)}
                      helperText={errors.product_id || "Type product name or barcode"}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingProducts ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                {selectedProduct && (
                  <Alert severity="info" icon={false}>
                    Current stock: <strong>{selectedProduct.stock} {selectedProduct.unit}</strong>
                    {isBulkProduct(selectedProduct) && (
                      <>
                        <br />
                        1 {selectedProduct.purchase_unit} = {selectedProduct.purchase_qty} {selectedProduct.unit}
                      </>
                    )}
                  </Alert>
                )}

                <TextField
                  select
                  fullWidth
                  label="Received In *"
                  inputRef={unitRef}
                  value={form.received_unit}
                  onChange={(e) => setForm((current) => ({ ...current, received_unit: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && qtyRef.current?.focus()}
                  error={Boolean(errors.received_unit)}
                  helperText={errors.received_unit}
                >
                  {unitOptions.map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      {unit}{selectedProduct?.purchase_unit === unit ? " (wholesale)" : " (base unit)"}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  fullWidth
                  label="Quantity Received *"
                  type="number"
                  inputRef={qtyRef}
                  value={form.received_qty}
                  onChange={(e) => setForm((current) => ({ ...current, received_qty: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && costRef.current?.focus()}
                  error={Boolean(errors.received_qty)}
                  helperText={errors.received_qty}
                />

                {preview && (
                  <Alert severity="success" icon={false}>
                    {preview.receivedAsBulk ? (
                      <>
                        {form.received_qty} {selectedProduct.purchase_unit} x {selectedProduct.purchase_qty}
                        {" = "}
                        <strong>{preview.convertedQty.toLocaleString("en-IN")} {selectedProduct.unit}</strong> stock.
                      </>
                    ) : (
                      <>
                        <strong>{preview.convertedQty.toLocaleString("en-IN")} {selectedProduct.unit}</strong> will be added directly.
                      </>
                    )}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label={`Cost per ${form.received_unit || "unit"} *`}
                  type="number"
                  inputRef={costRef}
                  value={form.cost_per_unit}
                  onChange={(e) => setForm((current) => ({ ...current, cost_per_unit: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && supplierRef.current?.focus()}
                  error={Boolean(errors.cost_per_unit)}
                  helperText={errors.cost_per_unit}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                />

                {preview && (
                  <Alert severity="info" icon={false}>
                    Total cost: <strong>{formatCurrency(preview.totalCost)}</strong>
                    <br />
                    Loose cost will become <strong>{formatCurrency(preview.nextLooseCost)}/{selectedProduct.unit}</strong>
                    {preview.nextWholesaleCost !== null && (
                      <>
                        <br />
                        Wholesale cost will become <strong>{formatCurrency(preview.nextWholesaleCost)}/{selectedProduct.purchase_unit}</strong>
                      </>
                    )}
                    <br />
                    Product stock after save: <strong>{preview.stockAfter.toLocaleString("en-IN")} {selectedProduct.unit}</strong>
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="Supplier Name"
                  inputRef={supplierRef}
                  value={form.supplier_name}
                  onChange={(e) => setForm((current) => ({ ...current, supplier_name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && invoiceRef.current?.focus()}
                />

                <TextField
                  fullWidth
                  label="Invoice Number"
                  inputRef={invoiceRef}
                  value={form.invoice_number}
                  onChange={(e) => setForm((current) => ({ ...current, invoice_number: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && dateRef.current?.focus()}
                />

                <TextField
                  fullWidth
                  label="Purchase Date *"
                  type="date"
                  inputRef={dateRef}
                  value={form.purchase_date}
                  onChange={(e) => setForm((current) => ({ ...current, purchase_date: e.target.value }))}
                  error={Boolean(errors.purchase_date)}
                  helperText={errors.purchase_date}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  minRows={2}
                  value={form.notes}
                  onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                />

                <Stack spacing={1}>
                  <Button fullWidth variant="contained" onClick={handleSubmit} disabled={saving}>
                    {saving ? "Saving..." : "Record Stock Intake"}
                  </Button>
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
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      />
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}
