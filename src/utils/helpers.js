// src/utils/helpers.js

/** Format number as Indian currency string */
export const formatCurrency = (value, decimals = 2) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

/** Format a date string nicely */
export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

/** Format datetime string */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

/** Generate next bill ID */
export const generateBillId = (bills) => {
  const year = new Date().getFullYear();
  const num = String(bills.length + 1).padStart(3, "0");
  return `B-${year}-${num}`;
};

/** Calculate cart item totals */
export const calcItemTotals = (item) => {
  const base = item.unitPrice * item.qty - (item.discount || 0);
  const sgstAmt = (item.sgst / 100) * base;
  const cgstAmt = (item.cgst / 100) * base;
  return {
    base,
    sgstAmt: parseFloat(sgstAmt.toFixed(2)),
    cgstAmt: parseFloat(cgstAmt.toFixed(2)),
    lineTotal: parseFloat((base + sgstAmt + cgstAmt).toFixed(2)),
  };
};

/** Calculate cart summary */
export const calcCartSummary = (cartItems) => {
  let subtotal = 0, totalDiscount = 0, totalSGST = 0, totalCGST = 0;
  cartItems.forEach((item) => {
    const t = calcItemTotals(item);
    subtotal += item.unitPrice * item.qty;
    totalDiscount += item.discount || 0;
    totalSGST += t.sgstAmt;
    totalCGST += t.cgstAmt;
  });
  const taxableAmount = subtotal - totalDiscount;
  const grandTotal = taxableAmount + totalSGST + totalCGST;
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    totalSGST: parseFloat(totalSGST.toFixed(2)),
    totalCGST: parseFloat(totalCGST.toFixed(2)),
    totalGST: parseFloat((totalSGST + totalCGST).toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
  };
};

/** Calculate egg entry computed fields */
export const calcEggEntry = ({ opening_stock, fresh_arrivals, eggs_sold, damaged_eggs, cost_per_egg, selling_price }) => {
  const os = Number(opening_stock) || 0;
  const fa = Number(fresh_arrivals) || 0;
  const sold = Number(eggs_sold) || 0;
  const damaged = Number(damaged_eggs) || 0;
  const cost = Number(cost_per_egg) || 0;
  const sell = Number(selling_price) || 0;

  const closingStock = Math.max(0, os + fa - sold - damaged);
  const revenue = sold * sell;
  const totalCost = (sold + damaged) * cost;
  const profit = revenue - totalCost;

  return {
    closingStock,
    revenue: parseFloat(revenue.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
  };
};

/** Payment method chip color */
export const paymentColor = (method) => ({
  Cash: "success",
  UPI: "primary",
  Card: "warning",
}[method] || "default");
