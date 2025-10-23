import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme, event?: React.MouseEvent) => void;
  isDark: boolean;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  isDark: false,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      setIsDark(systemTheme === "dark");
      return;
    }

    root.classList.add(theme);
    setIsDark(theme === "dark");
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme, event?: React.MouseEvent) => {
      const root = window.document.documentElement;

      const updateTheme = () => {
        localStorage.setItem(storageKey, newTheme);
        setTheme(newTheme);
      };

      // If View Transitions API is supported and we have click coordinates
      if (document.startViewTransition && event) {
        const x = event.clientX;
        const y = event.clientY;
        
        // Calculate the maximum distance from click point to screen corners
        const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        );

        // Set CSS variables for the animation
        root.style.setProperty('--x', `${x}px`);
        root.style.setProperty('--y', `${y}px`);
        root.style.setProperty('--end-radius', `${endRadius}px`);

        document.startViewTransition(() => updateTheme());
      } else if (document.startViewTransition) {
        document.startViewTransition(() => updateTheme());
      } else {
        updateTheme();
      }
    },
    isDark,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};