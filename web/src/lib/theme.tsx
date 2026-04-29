"use client";

import { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("cd_theme") as Theme | null;
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  const toggle = () => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      localStorage.setItem("cd_theme", next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
