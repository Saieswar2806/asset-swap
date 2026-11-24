import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "../types.js";
import { api } from "../api.js";

interface UserContextType {
  currentUser: User | null;
  users: User[];
  isAdmin: boolean;
  switchUser: (userId: string) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUsers()
      .then((data) => {
        setUsers(data);
        // Default to Naveen Hegde (OWNER-001) or first user
        const defaultUser = data.find((u) => u.id === "OWNER-001") || data[0] || null;
        setCurrentUser(defaultUser);
      })
      .catch((err) => {
        console.error("Failed to load demo users:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const switchUser = (userId: string) => {
    const selected = users.find((u) => u.id === userId);
    if (selected) {
      setCurrentUser(selected);
    }
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <UserContext.Provider value={{ currentUser, users, isAdmin, switchUser, loading }}>
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
