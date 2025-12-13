"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const SIDEBAR_COLLAPSED_KEY = "scatola-sidebar-collapsed";

interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
    setIsInitialized(true);
  }, []);

  // Persist collapsed state to localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
    }
  }, [isCollapsed, isInitialized]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const openSidebar = () => setIsSidebarOpen(true);
  const closeSidebar = () => setIsSidebarOpen(false);
  
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);
  const setCollapsed = (collapsed: boolean) => setIsCollapsed(collapsed);

  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        isCollapsed,
        toggleCollapse,
        setCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

