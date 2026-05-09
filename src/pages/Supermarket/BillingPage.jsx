// src/pages/Supermarket/BillingPage.jsx
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Box, Grid, Card, CardContent, Typography, TextField, Button,
  Stack, IconButton, Divider, ToggleButton, ToggleButtonGroup,
  Autocomplete, CircularProgress
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import PrintIcon from "@mui/icons-material/Print";

import { calcItemTotals, calcCartSummary, formatCurrency } from "../../utils/helpers";
import { PAYMENT_METHODS } from "../../data/mockData";
import { AddProductModal } from "../../components/AddProductModal";
import BillSummaryPanel from "../../components/BillSummaryPanel";
import { useReactToPrint } from "react-to-print";
import { billService, productService } from "../../api/services";

const EMPTY_FORM = {
  paymentMethod: "Cash",
  amountReceived: "",
  customerName: null
};

const ADD_PRODUCT_OPTION = "__ADD_PRODUCT__";

export default function BillingPage() {
  const [cart, setCart] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchVal, setSearchVal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingBill, setPendingBill] = useState(null);
  const [addProductModal, setAddProductModal] = useState(false);
  const [initialProductData, setInitialProductData] = useState({ productId: null, name: "" });

  // Products search state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Barcode scanning state
  const barcodeInputRef = useRef("");
  const barcodeTimeoutRef = useRef(null);

  const amountReceivedRef = useRef();
  const customerNameRef = useRef();

  // Print reference
  const printRef = useRef();
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => {
      setPendingBill(null);
      clearCart();
    }
  });

  // Trigger print when bill is ready
  useEffect(() => {
    if (pendingBill) {
      handlePrint();
    }
  }, [pendingBill, handlePrint]);

  // ── Barcode/QR scanning ───────────────────────────────────────
  useEffect(() => {
    const handleKeyPress = (e) => {
      const activeElement = document.activeElement;
      // Ignore if user is typing in any form element
      const isTyping =
        activeElement &&
        (
          activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT" ||
          activeElement.getAttribute("role") === "combobox" ||
          activeElement.closest("form")
        );

      if (isTyping) return;

      if (e.key === "Enter" && barcodeInputRef.current.length > 0) {
        const barcode = barcodeInputRef.current.trim();
        searchProductByBarcode(barcode);
        barcodeInputRef.current = "";
        e.preventDefault();
      } 
      else if (e.key.length === 1 || e.key === "Backspace") {
        if (e.key === "Backspace") {
          barcodeInputRef.current =
            barcodeInputRef.current.slice(0, -1);
        } else {
          barcodeInputRef.current += e.key;
        }

        clearTimeout(barcodeTimeoutRef.current);

        barcodeTimeoutRef.current = setTimeout(() => {
          barcodeInputRef.current = "";
        }, 2000);
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      clearTimeout(barcodeTimeoutRef.current);
    };
  }, []);

  // ── Product search with debounce ──────────────────────────────
  useEffect(() => {
    if (!searchInput.trim()) {
      setProducts([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setLoadingProducts(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await productService.list({
          search: searchInput.trim(),
          per_page: 10,
        });
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setProducts(data);
      } catch (err) {
        console.error("Search failed:", err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInput]);

  const summary = calcCartSummary(cart);
  const change = Math.max(0, (parseFloat(form.amountReceived) || 0) - summary.grandTotal);

  // ── Search product by barcode ─────────────────────────────────
  const searchProductByBarcode = async (barcode) => {
    try {
      const res = await productService.list({
        search: barcode,
        per_page: 10,
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setProducts(data);
      if (data.length > 0){
        addToCart(data[0]);
      } else {
        setInitialProductData({ productId: null , name: null });
        setAddProductModal(true);
      }
      
    } catch (err) {
      console.error("Search failed:", err);
      setProducts([]);
    }
  };

  // ── Add product to cart ───────────────────────────────────────
  const addToCart = useCallback((product) => {
    if (!product) return;

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.selling_price,
          qty: 1,
          discount: 0,
          sgst: product.sgst,
          cgst: product.cgst,
          unit: product.unit
        }
      ];
    });

    setSearchInput("");
    setSearchVal(null);
  }, []);

  // ── Update cart item ──────────────────────────────────────────
  const updateItem = (id, field, value) => {
    setCart((prev) =>
      prev.map((i) =>
        i.productId === id
          ? {
              ...i,
              [field]:
                field === "qty"
                  ? Math.max(1, +value || 1)
                  : Math.max(0, +value || 0)
            }
          : i
      )
    );
  };

  // ── Remove item from cart ─────────────────────────────────────
  const removeItem = (id) => {
    setCart((prev) => prev.filter((i) => i.productId !== id));
  };

  // ── Clear cart ────────────────────────────────────────────────
  const clearCart = () => {
    setCart([]);
    setForm(EMPTY_FORM);
    setSearchInput("");
    setSearchVal(null);
  };

  // ── Handle autocomplete search change ──────────────────────────
  const handleSearchInputChange = (_, value) => {
    setSearchInput(value);
  };

  // ── Handle autocomplete key press ─────────────────────────────
const handleSearchKeyDown = (event) => {
  if (event.key === "Enter" && searchInput.trim()) {
    const matchingProduct = products.find(
      (p) =>
        p.name.toLowerCase() === searchInput.trim().toLowerCase() ||
        p.barcode === searchInput.trim()
    );

    if (matchingProduct) {
      event.preventDefault();
      addToCart(matchingProduct);
    }
  }
};

  // ── Save bill ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!cart.length) return alert("Add products first");

    try {
      const payload = {
        payment_method: form.paymentMethod,
        amount_received: Number(form.amountReceived || 0),
        customer_name: (form.customerName && form.customerName !== "") ? form.customerName : "Walk-in Customer",
        items: cart.map((item) => ({
          product_id: item.productId,
          product_name: item.name,
          unit: item.unit,
          unit_price: Number(item.unitPrice),
          quantity: Number(item.qty),
          discount: Number(item.discount || 0),
          sgst_percent: Number(item.sgst || 0),
          cgst_percent: Number(item.cgst || 0),
        })),
      };

      const res = await billService.create(payload);
      const bill = res.data;

      setPendingBill({
        id: bill.bill_number,
        datetime: new Date(),
        items: cart,
        subtotal: bill.subtotal,
        totalDiscount: bill.total_discount,
        sgst: bill.total_sgst,
        cgst: bill.total_cgst,
        grandTotal: bill.grand_total,
        method: bill.payment_method,
        customer: bill.customer_name
      });
    } catch (err) {
      console.error("Error saving bill:", err);
      alert(err.message || "Failed to save bill");
    }
  };

  // ── Handle add product ────────────────────────────────────────
  const handleAddProduct = (product) => {
    setCart((prev) => [...prev, product]);
    setAddProductModal(false);
    setInitialProductData({ productId: null, name: "" });
    setSearchInput("");
    setSearchVal(null);
  };

  return (
    <Box p={2}>
      <Grid container spacing={2}>
        {/* ── Cart Table - Left Side ── */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              {/* Header Row */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 40px",
                  gap: 1,
                  px: 2,
                  py: 1,
                  bgcolor: "#f5f5f5",
                  fontWeight: "bold"
                }}
              >
                <Typography>Product</Typography>
                <Typography>Price</Typography>
                <Typography>Qty</Typography>
                <Typography>Discount</Typography>
                <Typography>GST</Typography>
                <Typography>Total</Typography>
              </Box>

              {/* Cart Items */}
              {cart.map((item) => {
                const t = calcItemTotals(item);
                return (
                  <Box
                    key={item.productId}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 40px",
                      gap: 1,
                      px: 2,
                      py: 1,
                      alignItems: "center",
                      borderTop: "1px solid #eee"
                    }}
                  >
                    <Typography>{item.name}</Typography>
                    <Typography>{formatCurrency(item.unitPrice)}</Typography>

                    <TextField
                      size="small"
                      type="number"
                      value={item.qty}
                      onChange={(e) =>
                        updateItem(item.productId, "qty", e.target.value)
                      }
                      sx={{ width: 80 }}
                    />

                    <TextField
                      size="small"
                      type="number"
                      value={item.discount}
                      onChange={(e) =>
                        updateItem(item.productId, "discount", e.target.value)
                      }
                      sx={{ width: 80 }}
                    />

                    <Typography>
                      {formatCurrency(t.sgstAmt + t.cgstAmt)}
                    </Typography>

                    <Typography color="primary" fontWeight="bold">
                      {formatCurrency(t.lineTotal)}
                    </Typography>

                    <IconButton 
                      size="small"
                      onClick={() => removeItem(item.productId)}
                    >
                      <DeleteIcon color="error" fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}

              {/* Product Search Row */}
              <Box sx={{ p: 2, borderTop: "1px solid #eee" }}>
                <Autocomplete
                value={searchVal}
                inputValue={searchInput}
                onInputChange={handleSearchInputChange}
                onChange={(_, val) => {
                  if (!val) return;
                  if (val === ADD_PRODUCT_OPTION) {
                    setInitialProductData({ productId: null, name: searchInput });
                    setAddProductModal(true);
                    setSearchInput("");
                  } else {
                    addToCart(val);
                  }
                }}
                options={searchInput.trim() ? [...products, ADD_PRODUCT_OPTION] : []}
                loading={loadingProducts}
                getOptionLabel={(o) =>
                  o === ADD_PRODUCT_OPTION ? "" : `${o.name} (${o.barcode || "N/A"})`
                }
                filterOptions={(x) => x}  // skip MUI's client-side filter since you fetch from API
                renderOption={(props, option) => {
                  if (option === ADD_PRODUCT_OPTION) {
                    return (
                      <li {...props} key="add-product">
                        <AddIcon fontSize="small" sx={{ mr: 1, color: "primary.main" }} />
                        <Typography color="primary">
                          Add "{searchInput}"
                        </Typography>
                      </li>
                    );
                  }
                  return (
                    <li {...props} key={option.id}>
                      {option.name} ({option.barcode || "N/A"})
                    </li>
                  );
                }}
                noOptionsText="No products found"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search / Scan product..."
                    size="small"
                    onKeyDown={handleSearchKeyDown}
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Summary + Payment - Right Side ── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: "sticky", top: 20 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold">
                Order Summary
              </Typography>

              <Stack spacing={1.5} mt={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography>Subtotal</Typography>
                  <Typography>{formatCurrency(summary.subtotal)}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography>Discount</Typography>
                  <Typography color="error">
                    -{formatCurrency(summary.totalDiscount)}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography>GST</Typography>
                  <Typography>{formatCurrency(summary.totalGST)}</Typography>
                </Stack>

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight="bold">Total</Typography>
                  <Typography fontWeight="bold" color="primary" variant="h6">
                    {formatCurrency(summary.grandTotal)}
                  </Typography>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Payment Method */}
              <ToggleButtonGroup
                value={form.paymentMethod}
                exclusive
                onChange={(_, v) =>
                  v && setForm((f) => ({ ...f, paymentMethod: v }))
                }
                fullWidth
                size="small"
              >
                {PAYMENT_METHODS.map((m) => (
                  <ToggleButton key={m} value={m}>
                    {m}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              {/* Amount Received */}
              <TextField
                fullWidth
                label="Amount Received"
                type="number"
                value={form.amountReceived}
                inputRef={amountReceivedRef}
                onKeyDown={(e) => { if (e.key === "Enter") customerNameRef.current?.focus(); }}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amountReceived: e.target.value }))
                }
                sx={{ mt: 2 }}
                size="small"
              />

              {/* Change */}
              <Box sx={{ mt: 2, p: 1.5, bgcolor: "success.light", borderRadius: 1 }}>
                <Typography variant="caption" color="success.dark" fontWeight="bold">
                  Change: {formatCurrency(change)}
                </Typography>
              </Box>

              {/* Customer Name */}
              <TextField
                fullWidth
                label="Customer Name"
                type="text"
                value={form.customerName}
                inputRef={customerNameRef}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customerName: e.target.value }))
                }
                sx={{ mt: 2 }}
                size="small"
              />

              {/* Action Buttons */}
              <Button
                fullWidth
                variant="contained"
                startIcon={<PrintIcon />}
                sx={{ mt: 2 }}
                onClick={handleSave}
              >
                Save & Print
              </Button>

              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={clearCart}
              >
                Clear Cart
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Button
  variant="outlined"
  onClick={() => {
    const testBarcode = "789087989";

    for (let char of testBarcode) {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: char })
      );
    }

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter" })
    );
  }}
>
  Test Barcode Scan
</Button>

      {/* Print Reference (hidden) */}
      <Box sx={{ display: "none" }}>
        {pendingBill && (
          <BillSummaryPanel
            bill={pendingBill}
            shopInfo={{ name: "Your Shop", address: "Address", phone: "+91-9999999999" }}
            ref={printRef}
          />
        )}
      </Box>

      {/* Add Product Modal */}
      <AddProductModal
        open={addProductModal}
        onClose={() => setAddProductModal(false)}
        onAdd={handleAddProduct}
        initialProduct={initialProductData}
      />
    </Box>
  );
}