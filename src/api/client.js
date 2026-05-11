import axios from "axios";

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const errors = error.response?.data?.errors;
    const firstError = errors ? Object.values(errors).flat()[0] : null;
    const msg =
      firstError ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred.";
    return Promise.reject(new Error(msg));
  }
);

export default client;
