const toNumber = (value) => Number(value || 0);

export const money = toNumber;

export const formatCurrency = (value, decimals = 2) =>
  `₹${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const generateBillId = (bills) => {
  const year = new Date().getFullYear();
  const num = String(bills.length + 1).padStart(3, "0");
  return `B-${year}-${num}`;
};

export const isBulkProduct = (product = {}) =>
  Boolean(product.purchase_unit && toNumber(product.purchase_qty) > 0);

export const getWholesalePrice = (product = {}) => {
  const apiValue =
    product.computed_wholesale_price ??
    product.wholesale_price;

  if (apiValue !== null && apiValue !== undefined && apiValue !== "") {
    return toNumber(apiValue);
  }

  return toNumber(product.selling_price) * toNumber(product.purchase_qty);
};

export const getWholesaleCost = (product = {}) => {
  const apiValue =
    product.computed_wholesale_cost ??
    product.wholesale_cost;

  if (apiValue !== null && apiValue !== undefined && apiValue !== "") {
    return toNumber(apiValue);
  }

  return toNumber(product.cost_price) * toNumber(product.purchase_qty);
};

export const getCartLinePricing = (item) => {
  const wholesale = item.sellMode === "wholesale";
  return {
    unit: wholesale ? item.purchaseUnit : item.baseUnit,
    unitPrice: wholesale ? toNumber(item.wholesalePrice) : toNumber(item.loosePrice),
    costPrice: wholesale ? toNumber(item.wholesaleCost) : toNumber(item.looseCost),
  };
};

export const calcItemTotals = (item) => {
  const pricing = getCartLinePricing(item);
  const qty = toNumber(item.qty ?? item.quantity);
  const gross = pricing.unitPrice * qty;
  const discount = Math.min(Math.max(0, toNumber(item.discount)), gross);
  const base = Math.max(0, gross - discount);
  const sgstAmt = (toNumber(item.sgst ?? item.sgst_percent) / 100) * base;
  const cgstAmt = (toNumber(item.cgst ?? item.cgst_percent) / 100) * base;
  const lineProfit = pricing.costPrice ? parseFloat((pricing.unitPrice - pricing.costPrice) * qty - discount) : 0;

  return {
    base: parseFloat(base.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    sgstAmt: parseFloat(sgstAmt.toFixed(2)),
    cgstAmt: parseFloat(cgstAmt.toFixed(2)),
    lineTotal: parseFloat((base + sgstAmt + cgstAmt).toFixed(2)),
    lineProfit: parseFloat(lineProfit.toFixed(2)),
    unit: pricing.unit,
    unitPrice: pricing.unitPrice,
    costPrice: pricing.costPrice,
  };
};

export const calcCartSummary = (cartItems) => {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalSGST = 0;
  let totalCGST = 0;
  let totalProfit = 0;

  cartItems.forEach((item) => {
    const t = calcItemTotals(item);
    const qty = toNumber(item.qty ?? item.quantity);
    subtotal += t.unitPrice * qty;
    totalDiscount += t.discount;
    totalSGST += t.sgstAmt;
    totalCGST += t.cgstAmt;
    totalProfit += t.lineProfit;
  });

  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const grandTotal = taxableAmount + totalSGST + totalCGST;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    totalSGST: parseFloat(totalSGST.toFixed(2)),
    totalCGST: parseFloat(totalCGST.toFixed(2)),
    totalGST: parseFloat((totalSGST + totalCGST).toFixed(2)),
    totalProfit: parseFloat(totalProfit.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
  };
};

export const calcEggEntry = ({
  opening_stock,
  fresh_arrivals,
  eggs_sold,
  damaged_eggs,
  cost_per_egg,
  selling_price,
}) => {
  const os = toNumber(opening_stock);
  const fa = toNumber(fresh_arrivals);
  const sold = toNumber(eggs_sold);
  const damaged = toNumber(damaged_eggs);
  const cost = toNumber(cost_per_egg);
  const sell = toNumber(selling_price);

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

export const paymentColor = (method) =>
  ({
    Cash: "success",
    UPI: "primary",
    Card: "warning",
  }[method] || "default");
