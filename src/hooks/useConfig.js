import { useEffect, useState } from "react";
import { configService } from "../api/services";

// Cache for config to avoid multiple API calls
let configCache = null;

/**
 * Hook to fetch and cache app configuration
 * Returns { config, loading, error }
 */
export const useConfig = () => {
  const [config, setConfig] = useState(configCache);
  const [loading, setLoading] = useState(!configCache);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (configCache) {
      setConfig(configCache);
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await configService.getConfig();
        console.log("Fetched config:", data);
        configCache = data;
        setConfig(data);
        setError(null);
      } catch (err) {
        setError(err);
        console.error("Failed to fetch config:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
};

/**
 * Direct async function to get config (for non-component code)
 */
export const getConfig = async () => {
  if (configCache) return configCache;
  
  try {
    const data = await configService.getConfig();
    configCache = data;
    return data;
  } catch (err) {
    console.error("Failed to fetch config:", err);
    throw err;
  }
};
