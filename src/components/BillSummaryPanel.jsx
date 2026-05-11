import React, { forwardRef } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { formatCurrency, formatDateTime } from "../utils/helpers";

const getItemAmounts = (item) => {
  const qty = Number(item.quantity ?? item.qty ?? 0);
  const price = Number(item.unit_price ?? item.unitPrice ?? 0);
  const discount = Number(item.discount || 0);
  const taxable = Math.max(0, price * qty - discount);
  const sgst =
    item.sgst_amount !== undefined
      ? Number(item.sgst_amount)
      : taxable * (Number(item.sgst_percent ?? item.sgst ?? 0) / 100);
  const cgst =
    item.cgst_amount !== undefined
      ? Number(item.cgst_amount)
      : taxable * (Number(item.cgst_percent ?? item.cgst ?? 0) / 100);

  return {
    qty,
    price,
    discount,
    gst: sgst + cgst,
    total: Number(item.line_total ?? item.lineTotal ?? taxable + sgst + cgst),
    profit: item.line_profit ?? item.lineProfit,
  };
};

const BillSummaryPanel = forwardRef(({ bill, shopInfo }, ref) => {
  if (!bill) return null;

  const billNumber = bill.bill_number;
  const customer = bill.customer_name || bill.customer || "Walk-in Customer";
  const method = bill.payment_method || bill.method;
  const datetime = bill.created_at || bill.datetime;
  const subtotal = bill.subtotal;
  const discount = bill.total_discount ?? bill.totalDiscount;
  const sgst = bill.total_sgst ?? bill.sgst;
  const cgst = bill.total_cgst ?? bill.cgst;
  const grandTotal = bill.grand_total ?? bill.grandTotal;

  return (
    <Box
      ref={ref}
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper" }}
    >
      <Box textAlign="center" pb={2} mb={2} sx={{ borderBottom: "1.5px dashed", borderColor: "divider" }}>
        <Typography variant="subtitle1" fontWeight={800} letterSpacing={2}>
          {shopInfo.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">{shopInfo.address}</Typography>
        <Typography variant="caption" color="text.secondary">Ph: {shopInfo.phone}</Typography>
      </Box>

      <Stack direction="row" justifyContent="space-between" mb={0.5}>
        <Typography variant="caption"><b>Bill:</b> {billNumber}</Typography>
        <Typography variant="caption"><b>Customer:</b> {customer}</Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between" mb={1.5}>
        <Typography variant="caption"><b>Date:</b> {formatDateTime(datetime)}</Typography>
        <Typography variant="caption"><b>Payment:</b> {method}</Typography>
      </Stack>

      <Box sx={{ borderTop: "1.5px dashed", borderBottom: "1.5px dashed", borderColor: "divider", py: 1.5, mb: 1.5 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1.8fr 0.65fr 0.65fr 0.85fr 0.8fr 0.8fr 0.9fr",
            gap: 0.75,
            mb: 1,
          }}
        >
          {["Product", "Unit", "Qty", "Price", "Disc", "GST", "Total"].map((heading) => (
            <Typography key={heading} variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
              {heading}
            </Typography>
          ))}
        </Box>

        {bill.items?.map((item, index) => {
          const amounts = getItemAmounts(item);
          return (
            <Box
              key={item.id || index}
              sx={{
                display: "grid",
                gridTemplateColumns: "1.8fr 0.65fr 0.65fr 0.85fr 0.8fr 0.8fr 0.9fr",
                gap: 0.75,
                mb: 0.75,
                alignItems: "start",
              }}
            >
              <Typography variant="caption">{item.product_name || item.name}</Typography>
              <Typography variant="caption">{item.unit || item.baseUnit}</Typography>
              <Typography variant="caption">{amounts.qty}</Typography>
              <Typography variant="caption">{formatCurrency(amounts.price)}</Typography>
              <Typography variant="caption">{formatCurrency(amounts.discount)}</Typography>
              <Typography variant="caption">{formatCurrency(amounts.gst)}</Typography>
              <Typography variant="caption" fontWeight={700}>{formatCurrency(amounts.total)}</Typography>
            </Box>
          );
        })}
      </Box>

      {[
        ["Sub Total", subtotal, ""],
        ["Discount", discount, "-"],
        ["SGST", sgst, ""],
        ["CGST", cgst, ""],
      ].map(([label, value, prefix]) => (
        <Stack key={label} direction="row" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography variant="caption">{prefix}{formatCurrency(value)}</Typography>
        </Stack>
      ))}
      <Stack direction="row" justifyContent="space-between" mt={1} pt={1} sx={{ borderTop: "1.5px dashed", borderColor: "divider" }}>
        <Typography variant="subtitle2" fontWeight={800}>GRAND TOTAL</Typography>
        <Typography variant="subtitle2" fontWeight={800} color="primary.main">{formatCurrency(grandTotal)}</Typography>
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
        Thank you for shopping
      </Typography>
    </Box>
  );
});

export default BillSummaryPanel;
