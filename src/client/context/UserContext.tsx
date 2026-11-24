import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "../types.js";
import { api } from "../api.js";

interface UserContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBroker: boolean;
  isOwner: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { name: string; email: string; phone?: string; password: string; confirmPassword?: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.login(email, password);
    setCurrentUser(res.user);
    return res.user;
  };

  const register = async (payload: { name: string; email: string; phone?: string; password: string; confirmPassword?: string }): Promise<User> => {
    const res = await api.register(payload);
    setCurrentUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    await api.logout();
    setCurrentUser(null);
  };

  const isAuthenticated = !!currentUser && currentUser.status === "active";
  const isAdmin = currentUser?.role === "admin";
  const isBroker = currentUser?.role === "broker";
  const isOwner = currentUser?.role === "owner";

  return (
    <UserContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAdmin,
        isBroker,
        isOwner,
        loading,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
