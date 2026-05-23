const toNumber = (value) => Number(value || 0);

export const money = toNumber;

export const formatCurrency = (value, decimals = 2) =>
  `₹${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

const parseDisplayDate = (dateStr) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(dateStr);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return parseDisplayDate(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const isWithinLastDays = (dateStr, days = 5) => {
  if (!dateStr || days <= 0) return false;

  const parsedDate = parseDisplayDate(dateStr);
  if (Number.isNaN(parsedDate.getTime())) return false;

  const recordDate = new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  );
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const firstAllowedDate = new Date(todayStart);

  firstAllowedDate.setDate(todayStart.getDate() - (days - 1));

  return recordDate >= firstAllowedDate && recordDate <= todayStart;
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

/**
 * Calculate egg entry totals using FIFO method
 * - Opening stock = previous closing + new intakes
 * - Uses FIFO layers for accurate cost calculation
 * - Profit = Revenue - (Cost calculated using FIFO method)
 */
export const calcEggEntry = ({
  opening_stock,
  sale_lines = [],
  eggs_sold,
  damaged_eggs,
  avg_cost_per_egg,
  cost_per_egg,
  stock_layers = [],
}) => {
  const os = toNumber(opening_stock);

  // Calculate line quantity from trays + loose eggs or direct quantity
  const lineQuantity = (line) => {
    const trays = toNumber(line.trays_sold);
    const looseEggs = toNumber(line.loose_eggs_sold);
    const eggsPerTray = toNumber(line.eggs_per_tray) || 30;

    if (trays > 0 || looseEggs > 0) {
      return Math.round((trays * eggsPerTray) + looseEggs);
    }

    return toNumber(line.quantity);
  };

  // Total eggs sold from all sale lines
  const lineSold = sale_lines.reduce((sum, line) => sum + lineQuantity(line), 0);
  const sold = lineSold || toNumber(eggs_sold);
  const damaged = toNumber(damaged_eggs);

  // Fallback cost per egg (used if no layers available)
  const cost = toNumber(avg_cost_per_egg ?? cost_per_egg);

  // Calculate total revenue
  const revenue = sale_lines.reduce(
    (sum, line) => sum + toNumber(line.price_per_egg) * lineQuantity(line),
    0
  );

  /**
   * Calculate total cost using FIFO method
   * - Takes eggs from oldest stock first (layer by layer)
   * - Each layer may have different cost per egg
   * - If no layers, falls back to average cost
   */
  const fifoCost = (quantity) => {
    if (!Array.isArray(stock_layers) || stock_layers.length === 0) {
      return quantity * cost;
    }

    let remaining = quantity;
    let total = 0;

    stock_layers.forEach((layer) => {
      if (remaining <= 0) return;
      const available = toNumber(layer.quantity);
      const taken = Math.min(available, remaining);
      total += taken * toNumber(layer.cost_per_egg);
      remaining -= taken;
    });

    return total;
  };

  // Calculate closing stock and profit
  const closingStock = Math.max(0, os - sold - damaged);
  // Cost includes both sold eggs AND damaged eggs (both removed from stock)
  const totalCost = fifoCost(sold + damaged);
  const profit = revenue - totalCost;

  return {
    totalSold: sold,
    closingStock,
    revenue: parseFloat(revenue.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
  };
};

export const paymentColor = (method) =>
  ({
    Cash: "success",
    UPI: "primary",
    Card: "warning",
  }[method] || "default");
