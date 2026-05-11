// ── Base units ────────────────────────────────────────────────────────────────
// How stock is tracked and how loose selling works.
// Customer buys in these units.
export const PRODUCT_UNITS = [
  // Weight
  "kg",
  "g",
  "mg",

  // Volume
  "litre",
  "ml",

  // Count
  "piece",
  "dozen",
  "pair",

  // Packaged / measured
  "packet",
  "bottle",
  "box",
  "bundle",
  "roll",
  "can",
  "tube",
  "sachet",
  "strip",
  "sheet",
  "metre",
  "cm",
];

// ── Purchase units ────────────────────────────────────────────────────────────
// How supplier delivers stock. Always larger than the base unit.
// Only set this when the product is sold both loose and wholesale.
export const PURCHASE_UNITS = [
  // Bags / Sacks
  "bag",
  "sack",
  "gunny bag",

  // Boxes / Cartons
  "box",
  "carton",
  "crate",
  "case",
  "tray",

  // Tins / Containers
  "tin",
  "drum",
  "barrel",
  "canister",
  "jar",

  // Bundles / Rolls
  "bundle",
  "bale",
  "roll",
  "reel",

  // Count based
  "dozen",
  "gross",
  "pack",
];

// ── All units combined ────────────────────────────────────────────────────────
// Used in places where both base and purchase units are valid options
// e.g. Stock Intake "Received In" dropdown
export const ALL_UNITS = [
  ...new Set([...PRODUCT_UNITS, ...PURCHASE_UNITS]),
];

// ── Payment methods ───────────────────────────────────────────────────────────
export const PAYMENT_METHODS = ["Cash", "UPI", "Card"];

// ── Shop info ─────────────────────────────────────────────────────────────────
export const SHOP_INFO = {
  name:    "SUPERMARKET",
  address: "Plot 42, Sector 12, Retail Hub, Chennai 600001",
  phone:   "+91 98787 78878",
};
