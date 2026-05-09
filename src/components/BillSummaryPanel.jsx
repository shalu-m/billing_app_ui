
import React, { forwardRef } from "react";
import { Box, Typography, Stack } from "@mui/material";
import { formatCurrency } from "../utils/helpers";


const BillSummaryPanel = forwardRef(({ bill, shopInfo }, ref) => {
  if (!bill) return null;
  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, bgcolor: "background.paper" }} ref={ref}>
      {/* Shop Header */}
      <Box textAlign="center" pb={2} mb={2} sx={{ borderBottom: "1.5px dashed", borderColor: "divider" }}>
        <Typography variant="subtitle1" fontWeight={800} letterSpacing={2}>
          {shopInfo.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">{shopInfo.address}</Typography>
        <Typography variant="caption" color="text.secondary">Ph: {shopInfo.phone}</Typography>
      </Box>

      {/* Bill Meta */}
      <Stack direction="row" justifyContent="space-between" mb={0.5}>
        <Typography variant="caption"><b>Bill:</b> {bill.id}</Typography>
        <Typography variant="caption"><b>Customer:</b> {bill.customer}</Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between" mb={1.5}>
        <Typography variant="caption"><b>Date:</b> {new Date(bill.datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</Typography>
        <Typography variant="caption"><b>Payment:</b> {bill.method}</Typography>
      </Stack>

      {/* Items */}
      <Box sx={{ borderTop: "1.5px dashed", borderBottom: "1.5px dashed", borderColor: "divider", py: 1.5, mb: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" mb={1}>
          {["Item", "Qty", "Price", "Total"].map((h, i) => (
            <Typography key={h} variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase"
              sx={{ flex: i === 0 ? 2 : 1, textAlign: i === 0 ? "left" : "right" }}>
              {h}
            </Typography>
          ))}
        </Stack>
        {bill.items?.map((item, i) => (
          <Stack key={i} direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" sx={{ flex: 2 }}>{item.name ?? item.product_name}</Typography>
            <Typography variant="caption" sx={{ flex: 1, textAlign: "right" }}>{item.qty ?? item.quantity}</Typography>
            <Typography variant="caption" sx={{ flex: 1, textAlign: "right" }}>{formatCurrency(item.unitPrice ?? item.unit_price)}</Typography>
            <Typography variant="caption" sx={{ flex: 1, textAlign: "right" }}>{formatCurrency((item.unitPrice ?? item.unit_price) * (item.qty ?? item.quantity))}</Typography>
          </Stack>
        ))}
      </Box>

      {/* Totals */}
      {[["Sub Total", bill.subtotal], ["CGST", bill.cgst], ["SGST", bill.sgst], ['Discount', bill.totalDiscount]].map(([l, v]) => (
        <Stack key={l} direction="row" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="text.secondary">{l}</Typography>
          <Typography variant="caption">{l === 'Discount' ? '-' : ''}{formatCurrency(v)}</Typography>
        </Stack>
      ))}
      <Stack direction="row" justifyContent="space-between" mt={1} pt={1} sx={{ borderTop: "1.5px dashed", borderColor: "divider" }}>
        <Typography variant="subtitle2" fontWeight={800}>GRAND TOTAL</Typography>
        <Typography variant="subtitle2" fontWeight={800} color="primary.main">{formatCurrency(bill.grandTotal)}</Typography>
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
        Thank you for shopping
      </Typography>
    </Box>
  );
});

export default BillSummaryPanel;