"use client";

import { createContext, useContext, useSyncExternalStore, useEffect } from "react";

type Theme = "light" | "dark";
const themeChanged = "contextdrop:theme-changed";
let fallbackTheme: Theme = "light";

function readTheme(): Theme {
  try {
    const saved = window.localStorage.getItem("cd_theme");
    return saved === "dark" || saved === "light" ? saved : fallbackTheme;
  } catch { return fallbackTheme; }
}

function subscribeTheme(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === "cd_theme" || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(themeChanged, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(themeChanged, listener);
  };
}

function serverTheme(): Theme { return "light"; }

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggle = () => {
    fallbackTheme = readTheme() === "light" ? "dark" : "light";
    try { localStorage.setItem("cd_theme", fallbackTheme); } catch { /* Theme still works when storage is unavailable. */ }
    window.dispatchEvent(new Event(themeChanged));
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
