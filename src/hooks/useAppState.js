// src/hooks/useAppState.js
import { useState, useCallback } from "react";

/**
 * Central state management hook.
 * Replace API calls here when backend is ready —
 * just swap useState setters with axios/fetch calls.
 */
export function useAppState() {
  const [shopName, setShopName] = useState("Shop Name");

  return {
    shopName,
  };
}
