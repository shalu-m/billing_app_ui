import React, { forwardRef } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { formatCurrency, formatDateTime } from "../utils/helpers";

export const receiptPrintPageStyle = `
  @page {
    size: 80mm auto;
    margin: 0;
  }

  html,
  body {
    width: 80mm;
    min-width: 80mm;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body * {
    box-shadow: none !important;
  }

  .bill-receipt {
    width: 72mm !important;
    max-width: 72mm !important;
    margin: 0 auto !important;
    padding: 3mm 2mm 6mm !important;
    border: 0 !important;
    border-radius: 0 !important;
    color: #000000 !important;
    background: #ffffff !important;
    font-family: "Consolas", "Courier New", monospace !important;
    font-size: 10px !important;
    line-height: 1.25 !important;
  }

  .bill-receipt * {
    color: #000000 !important;
  }

  .receipt-item {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

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
    sgst,
    cgst,
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
  const items = bill.items || [];
  const totalItems = items.length;
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity ?? item.qty ?? 0), 0);

  return (
    <Box
      ref={ref}
      className="bill-receipt"
      sx={{
        width: { xs: "100%", sm: 360 },
        maxWidth: "100%",
        mx: "auto",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 2,
        bgcolor: "background.paper",
        color: "text.primary",
        "@media print": {
          width: "72mm",
          p: "3mm 2mm 6mm",
        },
      }}
    >
      {shopInfo.company_name && (
        <Typography variant="caption" fontWeight={700} textAlign="center" display="block">
          {shopInfo.company_name}
        </Typography>
      )}

      <Box textAlign="center" pb={1} mb={1} className="receipt-divider" sx={{ borderTop: 0, borderBottom: "1px dashed", borderColor: "divider" }}>
        <Typography variant="subtitle2" fontWeight={900} letterSpacing={0.5}>
          {shopInfo.name || "Supermarket"}
        </Typography>
        {shopInfo.address && (
          <Typography variant="caption" color="text.secondary" display="block">
            {shopInfo.address}
          </Typography>
        )}
        {shopInfo.phone && (
          <Typography variant="caption" color="text.secondary" display="block">
            Ph: {shopInfo.phone}
          </Typography>
        )}
      </Box>

      <Stack spacing={0.25} mb={1}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" fontWeight={700}>Bill</Typography>
          <Typography variant="caption">{billNumber}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" fontWeight={700}>Date</Typography>
          <Typography variant="caption" textAlign="right">{formatDateTime(datetime)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" fontWeight={700}>Customer</Typography>
          <Typography variant="caption" textAlign="right">{customer}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" fontWeight={700}>Payment</Typography>
          <Typography variant="caption">{method}</Typography>
        </Stack>
      </Stack>

      <Box className="receipt-divider" sx={{ borderTop: "1px dashed", borderBottom: "1px dashed", borderColor: "divider", py: 0.75, mb: 1 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" fontWeight={800}>Item</Typography>
          <Typography variant="caption" fontWeight={800}>Amount</Typography>
        </Stack>

        {items.map((item, index) => {
          const amounts = getItemAmounts(item);
          const name = item.product_name || item.name || "Item";
          const unit = item.unit || item.baseUnit || "";
          const taxAmount = amounts.sgst + amounts.cgst;

          return (
            <Box
              key={item.id || index}
              className="receipt-item"
              sx={{ py: 0.65, borderTop: index === 0 ? 0 : "1px dotted", borderColor: "divider" }}
            >
              <Typography variant="caption" fontWeight={700} display="block" sx={{ overflowWrap: "anywhere" }}>
                {index + 1}. {name}
              </Typography>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  {amounts.qty} {unit} x {formatCurrency(amounts.price)}
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  {formatCurrency(amounts.total)}
                </Typography>
              </Stack>
              {(amounts.discount > 0 || taxAmount > 0) && (
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography variant="caption" color="text.secondary">
                    {amounts.discount ? "Disc " + formatCurrency(amounts.discount) : null}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    GST {formatCurrency(taxAmount)}
                  </Typography>
                </Stack>
              )}
            </Box>
          );
        })}
      </Box>

      <Stack direction="row" justifyContent="space-between" mb={0.5}>
        <Typography variant="caption" color="text.secondary">Items / Qty</Typography>
        <Typography variant="caption">{totalItems} / {totalQty.toLocaleString("en-IN")}</Typography>
      </Stack>
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
        <Typography variant="subtitle2" fontWeight={900}>{formatCurrency(grandTotal)}</Typography>
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
        Thank you for shopping
      </Typography>
    </Box>
  );
});

export default BillSummaryPanel;
