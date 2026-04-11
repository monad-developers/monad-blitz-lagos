"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth";
import { pageContainerClass } from "@/lib/layout";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { theme } = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const logoSrc = !mounted || theme === "light" ? "/logo-light.png" : "/logo-dark.png";
  const navTextClass = "text-sm font-semibold sm:text-base lg:text-lg xl:text-2xl 2xl:text-3xl";
  const isPlayerDashboard = pathname === "/player/dashboard";
  const showAuthenticatedLogout = !isAuthLoading && isAuthenticated;
  const navigationItems =
    isPlayerDashboard
      ? [
          { label: "Home", href: "/" },
          { label: "Challenges", href: "#dashboard-challenges" },
          { label: "Rewards", href: "#dashboard-rewards" },
        ]
      : [
          { label: "Home", href: "/" },
          { label: "Challenges", href: "/challenge" },
          { label: "How It Works", href: "/#how-it-works" },
        ];

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <header className="w-full bg-app pt-3 pb-1 sm:pt-4 sm:pb-1.5">
      <nav className={`${pageContainerClass} relative flex items-center justify-between py-1.5 sm:py-2 lg:py-2.5`}>
        <Link href="/" className="inline-flex items-center gap-2 sm:gap-3">
          <Image
            src={logoSrc}
            alt="Monarcade logo"
            width={114}
            height={114}
            priority
            unoptimized
            className="h-10 w-10 sm:h-12 sm:w-12 lg:h-[114px] lg:w-[114px]"
          />
          <div>
            <span className={`block tracking-tight text-app ${navTextClass}`}>
              Monarcade
            </span>
            <span className="block whitespace-nowrap uppercase tracking-[0.12em] text-app-muted text-[10px] leading-tight sm:text-xs lg:text-sm xl:text-base">
              Play to earn
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:absolute lg:left-1/2 lg:flex lg:-translate-x-1/2">
          {navigationItems.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`rounded-full px-5 py-2.5 text-app-muted transition-all duration-200 hover:bg-app-surface hover:text-app ${navTextClass}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {showAuthenticatedLogout ? (
            <button
              type="button"
              onClick={() => void logout()}
              className={`rounded-xl bg-primary px-6 py-2.5 text-white shadow-app transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 light:text-white dark:text-[#2f1736] ${navTextClass}`}
              style={{ color: "var(--color-white)" }}
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                href="/auth"
                className={`inline-flex items-center justify-center rounded-xl bg-app-soft px-5 py-2.5 text-app transition-colors duration-200 hover:bg-app-surface ${navTextClass}`}
              >
                Sign Up
              </Link>
              <Link
                href="/brands/signup"
                className={`inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-white shadow-app transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 light:text-white dark:text-[#2f1736] ${navTextClass}`}
                style={{ color: "var(--color-white)" }}
              >
                Create
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <div className="-m-1 p-1">
            <ThemeToggle />
          </div>
          <div className="-m-1 p-1">
            <button
              type="button"
              aria-label="Toggle navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-app-soft text-app"
              onClick={() => setMenuOpen((currentState) => !currentState)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4.5 w-4.5"
                aria-hidden="true"
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {menuOpen ? (
        <div className="fixed inset-0 z-[100] bg-app lg:hidden">
          <div className={`${pageContainerClass} flex h-full flex-col py-4`}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Menu</p>
              <button
                type="button"
                aria-label="Close navigation menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-app-soft text-app"
                onClick={() => setMenuOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4.5 w-4.5"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {navigationItems.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg bg-app-surface px-4 py-3 text-base font-semibold text-app transition-colors duration-200 hover:bg-app-soft"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2.5">
              {showAuthenticatedLogout ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}
                  className="col-span-2 rounded-lg bg-primary px-3.5 py-3 text-base font-semibold text-white dark:text-[#2f1736]"
                  style={{ color: "var(--color-white)" }}
                >
                  Logout
                </button>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="rounded-lg bg-app-soft px-3.5 py-3 text-base font-semibold text-app text-center transition-colors duration-200 hover:bg-app-surface"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                  <Link
                    href="/brands/signup"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg bg-primary px-3.5 py-3 text-base font-semibold text-white primary dark:text-[#2f1736]"
                  >
                    Create
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
