// src/api/services.js
import client from "./client";

// ── Products ─────────────────────────────────────────────────────────────────
export const productService = {
  list:        (params = {}) => client.get("/products", { params }).then((r) => r.data),
  get:         (id)          => client.get(`/products/${id}`).then((r) => r.data.data),
  create:      (data)        => client.post("/products", data).then((r) => r.data),
  update:      (id, data)    => client.put(`/products/${id}`, data).then((r) => r.data),
  delete:      (id)          => client.delete(`/products/${id}`).then((r) => r.data),
  adjustStock: (id, data)    => client.patch(`/products/${id}/stock`, data).then((r) => r.data),
  lowStock:    (params = {}) => client.get("/products/low-stock", { params }).then((r) => r.data),
};

// ── Bills ─────────────────────────────────────────────────────────────────────
export const billService = {
  list:    (params = {}) => client.get("/bills", { params }).then((r) => r.data),
  get:     (id)          => client.get(`/bills/${id}`).then((r) => r.data.data),
  create:  (data)        => client.post("/bills", data).then((r) => r.data),
  delete:  (id)          => client.delete(`/bills/${id}`).then((r) => r.data),
  summary: (params = {}) => client.get("/bills/summary", { params }).then((r) => r.data),
};

// ── Egg Entries ───────────────────────────────────────────────────────────────
export const eggService = {
  list:    (params = {}) => client.get("/egg-entries", { params }).then((r) => r.data),
  get:     (id)          => client.get(`/egg-entries/${id}`).then((r) => r.data.data),
  create:  (data)        => client.post("/egg-entries", data).then((r) => r.data),
  update:  (id, data)    => client.put(`/egg-entries/${id}`, data).then((r) => r.data),
  delete:  (id)          => client.delete(`/egg-entries/${id}`).then((r) => r.data),
  summary: (params = {}) => client.get("/egg-entries/summary", { params }).then((r) => r.data),
};