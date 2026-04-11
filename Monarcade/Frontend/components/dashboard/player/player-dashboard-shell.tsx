"use client";

import Image from "next/image";
import Link from "next/link";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import type { ChallengeCategory } from "@/lib/player-dashboard";
import { DashboardHeader } from "@/components/dashboard/player/dashboard-header";
import { SummaryCards } from "@/components/dashboard/player/summary-cards";
import { ChallengeTabs } from "@/components/dashboard/player/challenge-tabs";
import { ChallengeList } from "@/components/dashboard/player/challenge-list";
import { RewardsPanel } from "@/components/dashboard/player/rewards-panel";
import { RecentActivityPanel } from "@/components/dashboard/player/recent-activity-panel";
import type { PlayerDashboardData } from "@/components/dashboard/player/types";

type PlayerDashboardShellProps = {
  data: PlayerDashboardData;
};

export function PlayerDashboardShell({ data }: PlayerDashboardShellProps) {
  const [activeCategory, setActiveCategory] = useState<ChallengeCategory>("available");
  const [isPokiVisible, setIsPokiVisible] = useState(false);
  const [scrollDrift, setScrollDrift] = useState({ x: 0, y: 0 });
  const [dodgeOffset, setDodgeOffset] = useState({ x: 0, y: 0 });
  const [idleFloat, setIdleFloat] = useState({ x: 0, y: 0, rotate: 0 });
  const { theme } = useTheme();
  const pokiPanelRef = useRef<HTMLDivElement | null>(null);
  const dodgeResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const activeChallenges = useMemo(
    () => data.challengesByCategory[activeCategory],
    [activeCategory, data.challengesByCategory],
  );

  const activeLabel =
    data.challengeCategories.find((category) => category.key === activeCategory)?.label ?? "Active";
  const showViewAll = activeCategory === "available";
  const pokiSrc = !mounted || theme === "light" ? "/poki-light.png" : "/poki-dark.png";

  useEffect(() => {
    const panel = pokiPanelRef.current;
    if (!panel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsPokiVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    observer.observe(panel);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frameId = 0;

    const updateDrift = () => {
      const scrollY = window.scrollY;
      setScrollDrift({
        x: Math.sin(scrollY / 110) * 30,
        y: Math.cos(scrollY / 140) * 24 + Math.sin(scrollY / 70) * 18,
      });
      frameId = 0;
    };

    const handleScroll = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateDrift);
    };

    updateDrift();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    let frameId = 0;
    let startTime = 0;

    const animateFloat = (time: number) => {
      if (!startTime) {
        startTime = time;
      }

      const elapsed = time - startTime;
      setIdleFloat({
        x: Math.sin(elapsed / 520) * 10,
        y: Math.cos(elapsed / 680) * 14,
        rotate: Math.sin(elapsed / 900) * 3.5,
      });
      frameId = window.requestAnimationFrame(animateFloat);
    };

    frameId = window.requestAnimationFrame(animateFloat);

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    return () => {
      if (dodgeResetTimerRef.current) {
        clearTimeout(dodgeResetTimerRef.current);
      }
    };
  }, []);

  const handlePokiPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = pokiPanelRef.current;
    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = centerX - event.clientX;
    const deltaY = centerY - event.clientY;
    const distance = Math.hypot(deltaX, deltaY) || 1;
    const dodgeDistance = 96;

    setDodgeOffset({
      x: (deltaX / distance) * dodgeDistance,
      y: (deltaY / distance) * dodgeDistance,
    });

    if (dodgeResetTimerRef.current) {
      clearTimeout(dodgeResetTimerRef.current);
    }

    dodgeResetTimerRef.current = setTimeout(() => {
      setDodgeOffset({ x: 0, y: 0 });
      dodgeResetTimerRef.current = null;
    }, 760);
  };

  const pokiTranslateX = scrollDrift.x + idleFloat.x + dodgeOffset.x;
  const pokiTranslateY = scrollDrift.y + idleFloat.y + dodgeOffset.y;
  const pokiRotate = idleFloat.rotate + dodgeOffset.x * 0.045;
  const pokiTransform = isPokiVisible
    ? `translate3d(${pokiTranslateX}px, ${pokiTranslateY}px, 0) rotate(${pokiRotate}deg) scale(1.03)`
    : `translate3d(${pokiTranslateX}px, ${pokiTranslateY + 72}px, 0) rotate(${pokiRotate}deg) scale(0.9)`;
  const glowTransform = `translate3d(${pokiTranslateX * 0.7}px, ${pokiTranslateY * 0.45}px, 0) scale(${1 + Math.abs(idleFloat.y) / 80})`;

  return (
    <div className="min-h-screen space-y-6 pb-12 sm:space-y-8 sm:pb-16 lg:space-y-9 lg:pb-24">
      <DashboardHeader profile={data.playerProfile} summary={data.playerSummary} />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="lg:col-span-8">
          <SummaryCards summary={data.playerSummary} />
        </div>
        <div className="lg:col-span-4">
          <RecentActivityPanel activity={data.recentActivity} />
        </div>
      </section>

      <section className="pt-12 sm:pt-16 lg:pt-20">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="max-w-5xl rounded-3xl bg-app-surface p-4 shadow-app sm:p-5 lg:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-start sm:gap-5">
                <div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-app sm:text-3xl">
                    {activeLabel} Challenges
                  </h2>
                </div>
                {showViewAll ? (
                  <Link
                    href="/challenge"
                    className="inline-flex self-end text-base font-semibold text-primary transition-all duration-200 hover:translate-x-0.5 hover:brightness-110 sm:ml-auto sm:self-auto sm:pb-0.5 xl:text-lg 2xl:text-xl"
                  >
                    View all -&gt;
                  </Link>
                ) : null}
              </div>

              <ChallengeTabs
                categories={data.challengeCategories}
                activeCategory={activeCategory}
                onSelect={setActiveCategory}
              />

              <div className="mt-6">
                <ChallengeList category={activeCategory} challenges={activeChallenges} />
              </div>
            </div>
          </div>

          <aside className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-24">
              <div
                ref={pokiPanelRef}
                onPointerDown={handlePokiPointerDown}
                className={`relative cursor-pointer select-none transition-[transform,opacity] duration-500 ease-out ${
                  isPokiVisible ? "opacity-100" : "opacity-0"
                }`}
                style={{ transform: pokiTransform, willChange: "transform, opacity" }}
              >
                <div
                  className="pointer-events-none absolute inset-x-10 top-8 h-28 rounded-full bg-primary/12 blur-3xl transition-transform duration-300 ease-out"
                  style={{ transform: glowTransform }}
                />
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={pokiSrc}
                    alt="Pokemon character holding a phone with Monarcade UI"
                    fill
                    className="object-contain"
                    priority
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section>
        <RewardsPanel rewardsHistory={data.rewardsHistory} summary={data.playerSummary} />
      </section>
    </div>
  );
}
