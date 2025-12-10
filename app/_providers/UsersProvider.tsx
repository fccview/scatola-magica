"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { readUsers } from "@/app/_server/actions/user";
import { User } from "@/app/_types";

interface UsersContextValue {
  users: User[];
  loading: boolean;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextValue | null>(null);

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error("useUsers must be used within UsersProvider");
  }
  return context;
};

export default function UsersProvider({
  children,
  initialUsers = [],
}: {
  children: React.ReactNode;
  initialUsers?: User[];
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [hasInitialData] = useState(initialUsers.length > 0);

  const loadUsers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const fetchedUsers = await readUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
    if (showLoading) setLoading(false);
  }, []);

  const refreshUsers = useCallback(async () => {
    await loadUsers(false);
  }, [loadUsers]);

  useEffect(() => {
    if (!hasInitialData) {
      loadUsers();
    }
  }, [hasInitialData, loadUsers]);

  return (
    <UsersContext.Provider value={{ users, loading, refreshUsers }}>
      {children}
    </UsersContext.Provider>
  );
}
