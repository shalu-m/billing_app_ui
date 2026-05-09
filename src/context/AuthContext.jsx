import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

const DEFAULT_USERS = [
  { id: 1, username: "admin", password: "admin123" },
  { id: 2, username: "user", password: "user123" },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in (from localStorage) on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("loggedInUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to restore user session");
        localStorage.removeItem("loggedInUser");
      }
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    const foundUser = DEFAULT_USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (foundUser) {
      const userData = { id: foundUser.id, username: foundUser.username };
      setUser(userData);
      localStorage.setItem("loggedInUser", JSON.stringify(userData));
      return { success: true };
    }

    return { success: false, message: "Invalid username or password" };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("loggedInUser");
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
