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
 * Calculate egg entry totals using FIFO method with dual-bucket free/purchased logic.
 *
 * Rules:
 *  - Damaged eggs absorb free eggs first (no cost). Only excess damages reduce profit.
 *  - Sold eggs consume purchased eggs first (cost charged), then free eggs (no cost).
 *  - Falls back to simple average cost if no stock_layers provided.
 *
 * NOTE: stock_layers from the API now return { purchased_qty, free_qty, cost_per_egg }.
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
  const fallbackCost = toNumber(avg_cost_per_egg ?? cost_per_egg);

  // Calculate total revenue
  const revenue = sale_lines.reduce(
    (sum, line) => sum + toNumber(line.price_per_egg) * lineQuantity(line),
    0
  );

  const closingStock = Math.max(0, os - sold - damaged);

  // Simple fallback when layers haven't been loaded yet
  if (!Array.isArray(stock_layers) || stock_layers.length === 0) {
    const totalCost = (sold + damaged) * fallbackCost;
    const profit = revenue - totalCost;
    return {
      totalSold: sold,
      closingStock,
      revenue: parseFloat(revenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
    };
  }

  // Deep-clone layers so we don't mutate the original React state
  const layers = stock_layers.map((l) => ({
    purchased_qty: toNumber(l.purchased_qty),
    free_qty: toNumber(l.free_qty),
    cost_per_egg: toNumber(l.cost_per_egg),
  }));

  // Helper: consume N free eggs from layers (FIFO), no cost charged
  const consumeFree = (qty) => {
    let remaining = qty;
    for (const layer of layers) {
      if (remaining <= 0) break;
      const taken = Math.min(layer.free_qty, remaining);
      layer.free_qty -= taken;
      remaining -= taken;
    }
  };

  // Helper: consume N eggs preferring purchased (FIFO), spills into free of same layer.
  // Returns the cost for purchased portion only.
  const consumePurchased = (qty) => {
    let remaining = qty;
    let layerCost = 0;
    for (const layer of layers) {
      if (remaining <= 0) break;
      // Charge cost only for purchased eggs
      if (layer.purchased_qty > 0) {
        const taken = Math.min(layer.purchased_qty, remaining);
        layerCost += taken * layer.cost_per_egg;
        layer.purchased_qty -= taken;
        remaining -= taken;
      }
      // Spill into free eggs of this layer (zero additional cost)
      if (remaining > 0 && layer.free_qty > 0) {
        const taken = Math.min(layer.free_qty, remaining);
        layer.free_qty -= taken;
        remaining -= taken;
      }
    }
    return layerCost;
  };

  // Step 1: absorb damaged eggs — free eggs first, then purchased
  const totalFreeAvailable = layers.reduce((sum, l) => sum + l.free_qty, 0);
  const damagedFromFree = Math.min(damaged, totalFreeAvailable);
  const damagedFromPurchased = Math.max(0, damaged - damagedFromFree);

  if (damagedFromFree > 0) consumeFree(damagedFromFree);
  const damageCost = damagedFromPurchased > 0 ? consumePurchased(damagedFromPurchased) : 0;

  // Step 2: cost for sold eggs (purchased first, then free)
  const saleCost = consumePurchased(sold);

  const totalCost = saleCost + damageCost;
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
