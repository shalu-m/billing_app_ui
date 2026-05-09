import React, { useRef, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from "@mui/material";
import { PRODUCT_UNITS } from "../data/mockData";

const EMPTY_PRODUCT = {
  productId: "",
  name: "",
  unitPrice: "",
  qty: 1,
  discount: "",
  sgst: "",
  cgst: "",
  unit: ""
};

export function AddProductModal({ open, onClose, onAdd, initialProduct = {} }) {
  const [product, setProduct] = useState(EMPTY_PRODUCT);

  // 🔥 Dynamic refs
  const fieldRefs = useRef([]);

  // 🔥 Fields config (easy to manage)
  const fields = [
    { key: "name", label: "Product Name", type: "text" },
    { key: "unitPrice", label: "Unit Price", type: "number" },
    { key: "qty", label: "Quantity", type: "number" },
    { key: "discount", label: "Discount", type: "number" },
    { key: "sgst", label: "SGST %", type: "number" },
    { key: "cgst", label: "CGST %", type: "number" },
    { key: "unit", label: "Unit", type: "text" }
  ];

  // ✅ Only focus once when modal opens
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open) {
      setProduct({
        ...EMPTY_PRODUCT,
        productId: initialProduct.productId || null,
        name: initialProduct.name || ""
      });
    }

    if (open && !prevOpen.current) {
      setTimeout(() => {
        fieldRefs.current[0]?.focus();
      }, 100);
    }

    prevOpen.current = open;
  }, [open]);

  // 🔥 Handle input change
  const handleChange = (key, value) => {
    setProduct((prev) => ({ ...prev, [key]: value }));
  };

  // 🔥 Enter navigation
  const handleEnter = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (index === fields.length - 1) {
        handleAdd(); // last field → submit
      } else {
        fieldRefs.current[index + 1]?.focus();
      }
    }
  };

  // 🔥 Add product
  const handleAdd = () => {
    if (!product.name || !product.unitPrice) {
      alert("Please fill Product Name and Unit Price");
      return;
    }

    onAdd({
      ...product,
      unitPrice: parseFloat(product.unitPrice) || 0,
      qty: parseInt(product.qty) || 1,
      discount: parseFloat(product.discount) || 0,
      sgst: parseFloat(product.sgst) || 0,
      cgst: parseFloat(product.cgst) || 0
    });

    handleClose();
  };

  const handleClose = () => {
    onClose();
    setProduct(EMPTY_PRODUCT);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Product</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            "{product.name || "Product"}" not found. Add product details.
          </Alert>

        <Stack spacing={2}>
          {fields.map((field, index) => (
            field.key === "unit" ? (
              <FormControl fullWidth key={field.key}>
                <InputLabel>{field.label}</InputLabel>
                <Select
                  inputRef={(el) => (fieldRefs.current[index] = el)}
                  value={product[field.key]}
                  label={field.label}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  onKeyDown={(e) => handleEnter(e, index)}
                >
                  {PRODUCT_UNITS.map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      {unit}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                key={field.key}
                inputRef={(el) => (fieldRefs.current[index] = el)}
                fullWidth
                label={field.label}
                type={field.type}
                value={product[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                onKeyDown={(e) => handleEnter(e, index)}
                autoFocus={index === 0}
              />
            )
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleAdd} variant="contained">
          Add to Cart
        </Button>
      </DialogActions>
    </Dialog>
  );
}