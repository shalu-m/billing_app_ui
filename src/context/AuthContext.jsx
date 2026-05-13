import { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../api/services";

const AuthContext = createContext();
const USER_STORAGE_KEY = "loggedInUser";
const TOKEN_STORAGE_KEY = "authToken";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in and refresh navigation from the API on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!storedToken) {
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setLoading(false);
        return;
      }

      try {
        const userData = await authService.me(storedToken);
        setUser(userData);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      } catch (e) {
        console.error("Failed to restore user session");
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (username, password) => {
    try {
      const { user: userData, token } = await authService.login({
        username,
        password,
      });
      setUser(userData);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Invalid username or password",
      };
    }
  };

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const logoutRequest = authService.logout(token);
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);

    try {
      await logoutRequest;
    } catch (error) {
      console.error("Failed to notify API about logout", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
