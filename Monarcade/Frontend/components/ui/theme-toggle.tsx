"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-app-soft/75 text-app transition-all duration-200 hover:scale-[1.03] hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:h-10 sm:w-10 lg:h-14 lg:w-14"
    >
      {!mounted || theme === "light" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-4 w-4 sm:h-5 sm:w-5 lg:h-9 lg:w-9"
          aria-hidden="true"
        >
          <path
            d="M12 3v1.5M12 19.5V21M5.64 5.64l1.06 1.06M17.3 17.3l1.06 1.06M3 12h1.5M19.5 12H21M5.64 18.36l1.06-1.06M17.3 6.7l1.06-1.06"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-4 w-4 sm:h-5 sm:w-5 lg:h-9 lg:w-9"
          aria-hidden="true"
        >
          <path
            d="M21 14.2A8.2 8.2 0 1 1 9.8 3 6.5 6.5 0 0 0 21 14.2Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}