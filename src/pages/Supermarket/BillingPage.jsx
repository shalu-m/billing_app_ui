import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete, Box, Button, Card, CardContent, Chip,
  CircularProgress, Divider, Grid, IconButton, Stack,
  TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import AddIcon      from "@mui/icons-material/Add";
import DeleteIcon   from "@mui/icons-material/Delete";
import PrintIcon    from "@mui/icons-material/Print";
import { useReactToPrint } from "react-to-print";

import { billService, productService } from "../../api/services";
import { AddProductModal }  from "../../components/AddProductModal";
import BillSummaryPanel     from "../../components/BillSummaryPanel";
import { Toast }            from "../../components/shared";
import { useConfig }        from "../../hooks/useConfig";
import {
  calcCartSummary, calcItemTotals, formatCurrency,
  getWholesaleCost, getWholesalePrice, isBulkProduct,
} from "../../utils/helpers";

// ── Constants ──────────────────────────────────────────────────────────────
const EMPTY_FORM = { paymentMethod: "Cash", amountReceived: "", customerName: "" };
const ADD_PRODUCT_OPTION = "__ADD_PRODUCT__";

// ── Pure helpers (no state) ────────────────────────────────────────────────
const normalizeCollection = (res) =>
  Array.isArray(res.data) ? res.data : res.data?.data || [];

const makeRowId = (productId) =>
  `${productId || "custom"}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeQty = (item) => {
  const value = Number(item.qty);
  if (item.sellMode === "wholesale") return Math.max(1, Math.round(value || 1));
  return value > 0 ? parseFloat(value.toFixed(3)) : 1;
};

const getLineAmount = (item) => {
  const qty = normalizeQty(item);
  const price = item.sellMode === "wholesale"
    ? Number(item.wholesalePrice || 0)
    : Number(item.loosePrice || 0);
  return Math.max(0, price * qty);
};

const normalizeDiscount = (value, item = null) => {
  const n = Number(value);
  const discount = n >= 0 ? n : 0;
  return item ? Math.min(discount, getLineAmount(item)) : discount;
};

const getLineProductKey = (item) =>
  item.productId
    ? `id:${item.productId}`
    : `custom:${String(item.name || "").toLowerCase()}`;

const isSameSaleLine = (a, b) => {
  const sameProduct = getLineProductKey(a) === getLineProductKey(b);
  const sameMode    = a.sellMode === b.sellMode;
  // same unit + same price ensures two manual-price rows don't accidentally merge
  const sameUnit    = (a.sellMode === "wholesale" ? a.purchaseUnit : a.baseUnit) ===
                      (b.sellMode === "wholesale" ? b.purchaseUnit : b.baseUnit);
  const samePrice   = Number(a.sellMode === "wholesale" ? a.wholesalePrice : a.loosePrice) ===
                      Number(b.sellMode === "wholesale" ? b.wholesalePrice : b.loosePrice);
  const sameTax     = Number(a.sgst || 0) === Number(b.sgst || 0) &&
                      Number(a.cgst || 0) === Number(b.cgst || 0);
  return sameProduct && sameMode && sameUnit && samePrice && sameTax;
};

const addLineQty = (current, added) => {
  const total = (Number(current.qty) || 0) + (Number(added.qty) || 1);
  return current.sellMode === "wholesale"
    ? Math.max(1, Math.round(total))
    : parseFloat(total.toFixed(3));
};

/**
 * Build a cart line from a product API object.
 * All price/cost fields resolved here so the rest of the app
 * never needs to worry about wholesale vs loose conditionals.
 */
const createCartLine = (product, sellMode = "loose") => {
  const bulk = isBulkProduct(product);
  const mode = bulk ? sellMode : "loose";

  return {
    rowId:         makeRowId(product.id),
    productId:     product.id     ?? null,
    name:          product.name,
    barcode:       product.barcode || "",
    baseUnit:      product.unit   || "pcs",
    purchaseUnit:  product.purchase_unit || "",
    purchaseQty:   Number(product.purchase_qty || 0),
    hasBulk:       bulk,
    sellMode:      mode,
    // Loose pricing
    loosePrice:    Number(product.selling_price || 0),
    looseCost:     Number(product.cost_price    || 0),
    // Wholesale pricing — independently set (may differ from loose × purchase_qty)
    wholesalePrice: bulk ? getWholesalePrice(product) : 0,
    wholesaleCost:  bulk ? getWholesaleCost(product)  : 0,
    qty:      Number(product.qty      || 1),
    discount: Number(product.discount || 0),
    sgst:     Number(product.sgst     || 0),
    cgst:     Number(product.cgst     || 0),
    stock:    Number(product.stock    || 0),
  };
};

// ── Component ──────────────────────────────────────────────────────────────
export default function BillingPage() {
  const { config, loading: configLoading } = useConfig();
  
  const [cart,              setCart]              = useState([]);
  const [searchInput,       setSearchInput]       = useState("");
  const [searchVal,         setSearchVal]         = useState(null);
  const [form,              setForm]              = useState(EMPTY_FORM);
  const [pendingBill,       setPendingBill]       = useState(null);
  const [addProductModal,   setAddProductModal]   = useState(false);
  const [initialProductData,setInitialProductData]= useState({ productId: null, name: "" });
  const [products,          setProducts]          = useState([]);
  const [loadingProducts,   setLoadingProducts]   = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [toast,             setToast]             = useState({ open: false, message: "", severity: "success" });

  // ── Refs ───────────────────────────────────────────────────────────────
  const searchTimeoutRef  = useRef(null);
  const barcodeInputRef   = useRef("");
  const barcodeTimeoutRef = useRef(null);
  const amountReceivedRef = useRef(null);
  const customerNameRef   = useRef(null);
  const printRef          = useRef(null);

  // rowId → { qtyRef, discountRef } — populated by each cart row
  const rowRefsMap = useRef({});

  // ref to the Autocomplete search input — used for focus after discount Enter
  const searchInputRef = useRef(null);

  // Derived config values
  const paymentMethods = config?.payment_methods || [];
  const shopInfo = config?.shop_info || {}

  // ── Computed ───────────────────────────────────────────────────────────
  const summary = useMemo(() => calcCartSummary(cart), [cart]);
  const change  = Math.max(0, (Number(form.amountReceived) || 0) - summary.grandTotal);

  // ── Actions ────────────────────────────────────────────────────────────
  const clearCart = useCallback(() => {
    setCart([]);
    setForm(EMPTY_FORM);
    setSearchInput("");
    setSearchVal(null);
    rowRefsMap.current = {};
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => { setPendingBill(null); clearCart(); },
  });

  useEffect(() => {
    if (pendingBill) handlePrint();
  }, [pendingBill, handlePrint]);

  // ── Add to cart ────────────────────────────────────────────────────────
  const addToCart = useCallback((product, sellMode = "loose") => {
    if (!product) return;
    const newLine = createCartLine(product, sellMode);

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => isSameSaleLine(item, newLine));
      if (existingIndex === -1) return [...prev, newLine];
      return prev.map((item, i) =>
        i === existingIndex ? { ...item, qty: addLineQty(item, newLine) } : item
      );
    });

    setSearchInput("");
    setSearchVal(null);

    // After adding, focus the qty field of the newly added / merged row
    // Small timeout so the DOM has rendered the new row
    setTimeout(() => {
      const refs = rowRefsMap.current[newLine.rowId];
      if (refs?.qtyRef?.current) {
        refs.qtyRef.current.focus();
        refs.qtyRef.current.select();
      }
    }, 50);
  }, []);

  // ── Barcode lookup ─────────────────────────────────────────────────────
  const searchProductByBarcode = useCallback(async (barcode) => {
    try {
      const res  = await productService.list({ search: barcode, per_page: 10 });
      const data = normalizeCollection(res);
      const exact = data.find((p) => String(p.barcode || "") === String(barcode));
      if (exact || data.length > 0) {
        addToCart(exact || data[0]);
      } else {
        setInitialProductData({ productId: null, name: barcode });
        setAddProductModal(true);
      }
    } catch (e) {
      setToast({ open: true, message: e.message || "Barcode search failed", severity: "error" });
    }
  }, [addToCart]);

  // ── Global barcode scanner listener ───────────────────────────────────
  useEffect(() => {
    const handleKeyPress = (e) => {
      const active = document.activeElement;
      const isTyping = active && (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.getAttribute("role") === "combobox"
      );
      if (isTyping) return;

      if (e.key === "Enter" && barcodeInputRef.current.length > 0) {
        const barcode = barcodeInputRef.current.trim();
        barcodeInputRef.current = "";
        e.preventDefault();
        searchProductByBarcode(barcode);
      } else if (e.key === "Backspace") {
        barcodeInputRef.current = barcodeInputRef.current.slice(0, -1);
      } else if (e.key.length === 1) {
        barcodeInputRef.current += e.key;
        clearTimeout(barcodeTimeoutRef.current);
        barcodeTimeoutRef.current = setTimeout(() => {
          barcodeInputRef.current = "";
        }, 1200);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      clearTimeout(barcodeTimeoutRef.current);
    };
  }, [searchProductByBarcode]);

  // ── Product search ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchInput.trim()) { setProducts([]); return; }
    clearTimeout(searchTimeoutRef.current);
    setLoadingProducts(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await productService.list({ search: searchInput.trim(), per_page: 10 });
        setProducts(normalizeCollection(res));
      } catch (e) {
        setProducts([]);
        setToast({ open: true, message: e.message || "Search failed", severity: "error" });
      } finally {
        setLoadingProducts(false);
      }
    }, 300);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchInput]);

  // ── Cart item update ───────────────────────────────────────────────────
  const updateItem = (rowId, field, value) => {
    // Sell mode toggle — may merge two rows if same product/mode already exists
    if (field === "sellMode") {
      setCart((prev) => {
        const current = prev.find((item) => item.rowId === rowId);
        if (!current) return prev;

        const updated = { ...current, sellMode: value };
        if (value === "wholesale") updated.qty = normalizeQty(updated);

        const existing = prev.find(
          (item) => item.rowId !== rowId && isSameSaleLine(item, updated)
        );

        if (!existing) {
          return prev.map((item) => (item.rowId === rowId ? updated : item));
        }

        // Merge into the existing row
        return prev.reduce((next, item) => {
          if (item.rowId === rowId) return next;
          next.push(item.rowId === existing.rowId
            ? { ...item, qty: addLineQty(item, updated) }
            : item
          );
          return next;
        }, []);
      });
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;
        if (field === "qty" || field === "discount") {
          // Allow free typing (including decimals mid-type) — normalize on blur
          if (value !== "" && !/^\d*\.?\d*$/.test(value)) return item;
          return { ...item, [field]: value };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const normalizeItemField = (rowId, field) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;
        if (field === "qty")      return { ...item, qty:      normalizeQty(item) };
        if (field === "discount") return { ...item, discount: normalizeDiscount(item.discount, item) };
        return item;
      })
    );
  };

  const removeItem = (rowId) => {
    setCart((prev) => prev.filter((item) => item.rowId !== rowId));
    delete rowRefsMap.current[rowId];
  };

  // ── Save bill ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!cart.length) {
      setToast({ open: true, message: "Add at least one product", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      const normalizedCart = cart.map((item) => ({
        ...item,
        qty:      normalizeQty(item),
        discount: normalizeDiscount(item.discount, item),
      }));
      setCart(normalizedCart);

      const payload = {
        payment_method:  form.paymentMethod,
        amount_received: Number(form.amountReceived || 0),
        customer_name:   form.customerName?.trim() || "Walk-in Customer",
        items: normalizedCart.map((item) => {
          const totals = calcItemTotals(item);
          return {
            product_id:   item.productId,
            product_name: item.name,
            unit:         totals.unit,
            sell_mode:    item.sellMode,
            unit_price:   Number(totals.unitPrice),
            quantity:     Number(item.qty),
            discount:     Number(item.discount || 0),
            sgst_percent: Number(item.sgst || 0),
            cgst_percent: Number(item.cgst || 0),
          };
        }),
      };

      const res  = await billService.create(payload);
      const bill = res.data;

      setPendingBill({
        id:            bill.id,
        bill_number:   bill.bill_number,
        datetime:      bill.created_at || new Date(),
        created_at:    bill.created_at || new Date(),
        items:         bill.items?.length ? bill.items : payload.items,
        subtotal:      bill.subtotal,
        totalDiscount: bill.total_discount,
        total_discount: bill.total_discount,
        sgst:          bill.total_sgst,
        cgst:          bill.total_cgst,
        total_sgst:    bill.total_sgst,
        total_cgst:    bill.total_cgst,
        grandTotal:    bill.grand_total,
        grand_total:   bill.grand_total,
        total_profit:  bill.total_profit,
        method:        bill.payment_method,
        payment_method: bill.payment_method,
        customer:      bill.customer_name,
        customer_name: bill.customer_name,
      });
    } catch (e) {
      setToast({ open: true, message: e.message || "Failed to save bill", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = (product) => {
    addToCart({
      id:            product.productId || null,
      name:          product.name,
      unit:          product.unit || "pcs",
      selling_price: product.unitPrice,
      cost_price:    0,
      qty:           product.qty      || 1,
      discount:      product.discount || 0,
      sgst:          product.sgst     || 0,
      cgst:          product.cgst     || 0,
    });
    setAddProductModal(false);
    setInitialProductData({ productId: null, name: "" });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter" || !searchInput.trim()) return;
    const match = products.find(
      (p) =>
        p.name?.toLowerCase() === searchInput.trim().toLowerCase() ||
        String(p.barcode || "") === searchInput.trim()
    );
    if (match) { e.preventDefault(); addToCart(match); }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Box p={2}>
      <Grid container spacing={2}>

        {/* ── Left: Cart ── */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 0 }}>

              {/* Header */}
              <Box sx={{
                display: "grid",
                gridTemplateColumns: "2.25fr 1fr 0.8fr 0.9fr 0.9fr 1fr 40px",
                gap: 1, px: 2, py: 1, bgcolor: "grey.100",
              }}>
                {["Product", "Price", "Qty", "Discount", "GST", "Total", ""].map((h) => (
                  <Typography key={h} variant="caption" fontWeight={700}
                    color="text.secondary" textTransform="uppercase">{h}</Typography>
                ))}
              </Box>

              {/* Empty state */}
              {cart.length === 0 && (
                <Box sx={{ px: 2, py: 5, textAlign: "center", color: "text.secondary" }}>
                  <Typography variant="body2">Search or scan products to start a bill</Typography>
                </Box>
              )}

              {/* Cart rows */}
              {cart.map((item, index) => {
                const totals   = calcItemTotals(item);
                const qtyStep  = item.sellMode === "wholesale" ? 1 : 0.1;
                const isLast   = index === cart.length - 1;

                // Create refs for this row and store in map
                if (!rowRefsMap.current[item.rowId]) {
                  rowRefsMap.current[item.rowId] = {
                    qtyRef:      { current: null },
                    discountRef: { current: null },
                  };
                }
                const rowRefs = rowRefsMap.current[item.rowId];

                // When Enter pressed on discount:
                // if this is the last item → focus search
                // else → focus qty of next item
                const handleDiscountEnter = (e) => {
                  if (e.key !== "Enter") return;
                  normalizeItemField(item.rowId, "discount");
                  if (isLast) {
                    searchInputRef.current?.focus();
                  } else {
                    const nextItem = cart[index + 1];
                    const nextRefs = nextItem ? rowRefsMap.current[nextItem.rowId] : null;
                    if (nextRefs?.qtyRef?.current) {
                      nextRefs.qtyRef.current.focus();
                      nextRefs.qtyRef.current.select();
                    }
                  }
                };

                return (
                  <Box
                    key={item.rowId}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2.25fr 1fr 0.8fr 0.9fr 0.9fr 1fr 40px",
                      gap: 1, px: 2, py: 1, alignItems: "center",
                      borderTop: "1px solid", borderColor: "divider",
                    }}
                  >
                    {/* Product name + toggle */}
                    <Stack spacing={0.25}>
                      <Typography variant="body2" fontWeight={700}>{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Stock: {item.stock.toLocaleString("en-IN")} {item.baseUnit}
                      </Typography>
                      <Box sx={{ pt: 0.5 }}>
                        {item.hasBulk ? (
                          <ToggleButtonGroup
                            size="small"
                            value={item.sellMode}
                            exclusive
                            onChange={(_, value) => value && updateItem(item.rowId, "sellMode", value)}
                            sx={{
                              "& .MuiToggleButton-root": {
                                minWidth: 40, px: 0.75, py: 0.25,
                                fontSize: "0.7rem", lineHeight: 1.3,
                              },
                            }}
                          >
                            <ToggleButton value="loose">{item.baseUnit}</ToggleButton>
                            <ToggleButton value="wholesale">{item.purchaseUnit}</ToggleButton>
                          </ToggleButtonGroup>
                        ) : (
                          <Chip size="small" label={item.baseUnit}
                            variant="outlined" sx={{ height: 24 }} />
                        )}
                      </Box>
                    </Stack>

                    {/* Price */}
                    <Stack spacing={0.25}>
                      <Typography variant="body2" fontWeight={700}>
                        {formatCurrency(totals.unitPrice)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        /{totals.unit}
                      </Typography>
                    </Stack>

                    {/* Qty — Enter moves to Discount */}
                    <TextField
                      size="small"
                      type="number"
                      value={item.qty}
                      inputRef={(el) => {
                        if (rowRefs.qtyRef) rowRefs.qtyRef.current = el;
                      }}
                      onChange={(e) => updateItem(item.rowId, "qty", e.target.value)}
                      onBlur={() => normalizeItemField(item.rowId, "qty")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          normalizeItemField(item.rowId, "qty");
                          rowRefs.discountRef?.current?.focus();
                          rowRefs.discountRef?.current?.select();
                        }
                      }}
                      inputProps={{ min: qtyStep, step: qtyStep, inputMode: "decimal" }}
                    />

                    {/* Discount — Enter moves to next row qty or search */}
                    <TextField
                      size="small"
                      type="number"
                      value={item.discount}
                      inputRef={(el) => {
                        if (rowRefs.discountRef) rowRefs.discountRef.current = el;
                      }}
                      onChange={(e) => updateItem(item.rowId, "discount", e.target.value)}
                      onBlur={() => normalizeItemField(item.rowId, "discount")}
                      onKeyDown={handleDiscountEnter}
                      inputProps={{ min: 0, step: 0.01, inputMode: "decimal" }}
                    />

                    {/* GST */}
                    <Stack spacing={0.25}>
                      <Typography variant="body2" fontWeight={700}>
                        {formatCurrency(totals.sgstAmt + totals.cgstAmt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {Number(item.sgst || 0) + Number(item.cgst || 0)}%
                      </Typography>
                    </Stack>

                    {/* Total */}
                    <Typography variant="body2" color="primary" fontWeight={800}>
                      {formatCurrency(totals.lineTotal)}
                    </Typography>

                    {/* Delete */}
                    <IconButton size="small" onClick={() => removeItem(item.rowId)}>
                      <DeleteIcon color="error" fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}

              {/* Search bar */}
              <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Autocomplete
                  value={searchVal}
                  inputValue={searchInput}
                  onInputChange={(_, value) => setSearchInput(value)}
                  onChange={(_, value) => {
                    if (!value) return;
                    if (value === ADD_PRODUCT_OPTION) {
                      setInitialProductData({ productId: null, name: searchInput });
                      setAddProductModal(true);
                      setSearchInput("");
                    } else {
                      addToCart(value);
                    }
                  }}
                  options={searchInput.trim() ? [...products, ADD_PRODUCT_OPTION] : []}
                  loading={loadingProducts}
                  getOptionLabel={(option) =>
                    option === ADD_PRODUCT_OPTION
                      ? `Add "${searchInput}" as new product`
                      : `${option.name} (${option.barcode || "N/A"})`
                  }
                  filterOptions={(options) => options}
                  renderOption={(props, option) => {
                    if (option === ADD_PRODUCT_OPTION) {
                      return (
                        <li {...props} key="add-product">
                          <AddIcon fontSize="small" style={{ marginRight: 8 }} />
                          Add "{searchInput}" as new product
                        </li>
                      );
                    }
                    const bulk = isBulkProduct(option);
                    return (
                      <li {...props} key={option.id}>
                        <Stack spacing={0.25}>
                          <Typography variant="body2" fontWeight={700}>
                            {option.name} ({option.barcode || "N/A"})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Loose: {formatCurrency(option.selling_price)}/{option.unit}
                            {bulk && ` · Wholesale: ${formatCurrency(getWholesalePrice(option))}/${option.purchase_unit}`}
                          </Typography>
                        </Stack>
                      </li>
                    );
                  }}
                  noOptionsText="No products found"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search or scan product"
                      size="small"
                      onKeyDown={handleSearchKeyDown}
                      inputRef={(el) => {
                        // wire both MUI's internal ref and our searchInputRef
                        if (typeof params.inputProps.ref === "function") params.inputProps.ref(el);
                        searchInputRef.current = el;
                      }}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingProducts
                              ? <CircularProgress color="inherit" size={20} />
                              : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: Order Summary ── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: "sticky", top: 84 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800}>Order Summary</Typography>

              <Stack spacing={1.5} mt={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography>Subtotal</Typography>
                  <Typography>{formatCurrency(summary.subtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography>Discount</Typography>
                  <Typography color="error">-{formatCurrency(summary.totalDiscount)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography>GST</Typography>
                  <Typography>{formatCurrency(summary.totalGST)}</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={800}>Total</Typography>
                  <Typography fontWeight={900} color="primary" variant="h5">
                    {formatCurrency(summary.grandTotal)}
                  </Typography>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Payment method */}
              <ToggleButtonGroup
                value={form.paymentMethod} exclusive fullWidth size="small"
                onChange={(_, value) => value && setForm((f) => ({ ...f, paymentMethod: value }))}
              >
                {paymentMethods.map((method) => (
                  <ToggleButton key={method} value={method}>{method}</ToggleButton>
                ))}
              </ToggleButtonGroup>

              {/* Amount received → Enter → Customer Name */}
              <TextField
                fullWidth label="Amount Received" type="number"
                value={form.amountReceived}
                inputRef={amountReceivedRef}
                onKeyDown={(e) => { if (e.key === "Enter") customerNameRef.current?.focus(); }}
                onChange={(e) => setForm((f) => ({ ...f, amountReceived: e.target.value }))}
                sx={{ mt: 2 }} size="small"
              />

              <Box sx={{ mt: 2, p: 1.5, bgcolor: "success.light", borderRadius: 1 }}>
                <Typography variant="caption" color="success.dark" fontWeight={800}>
                  Change: {formatCurrency(change)}
                </Typography>
              </Box>

              {/* Customer name → Enter → Save */}
              <TextField
                fullWidth label="Customer Name"
                value={form.customerName}
                inputRef={customerNameRef}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                sx={{ mt: 2 }} size="small"
              />

              <Button
                fullWidth variant="contained" startIcon={<PrintIcon />}
                sx={{ mt: 2 }} onClick={handleSave} disabled={saving}
              >
                {saving ? "Saving..." : "Save & Print"}
              </Button>

              <Button fullWidth variant="outlined" sx={{ mt: 1 }} onClick={clearCart}>
                Clear Cart
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Hidden print target */}
      <Box sx={{ display: "none" }}>
        {pendingBill && (
          <BillSummaryPanel bill={pendingBill} shopInfo={shopInfo} ref={printRef} />
        )}
      </Box>

      <AddProductModal
        open={addProductModal}
        onClose={() => setAddProductModal(false)}
        onAdd={handleAddProduct}
        initialProduct={initialProductData}
      />

      <Toast
        open={toast.open} message={toast.message} severity={toast.severity}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </Box>
  );
}
