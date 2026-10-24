import * as React from "react";

export type Theme = "light" | "dark";
const KEY = "tile-rush-theme";

/** Light/dark setting: the saved choice, else the device setting. Writes data-theme on <html>. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = React.useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // Storage blocked; use the device setting.
    }
    const fromPage = document.documentElement.dataset.theme;
    if (fromPage === "light" || fromPage === "dark") return fromPage;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = React.useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // Not saved; still switches for this visit.
      }
      return next;
    });
  }, []);

  return [theme, toggle];
}
