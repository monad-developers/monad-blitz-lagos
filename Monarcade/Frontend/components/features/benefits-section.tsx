"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/providers/theme-provider";

interface BenefitsSectionProps {
  forceLightLogo?: boolean;
}

export function BenefitsSection({ forceLightLogo = false }: BenefitsSectionProps) {
  const { theme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const logoSrc = forceLightLogo || !mounted || theme === "light" ? "/logo-light.png" : "/logo-dark.png";

  return (
    <div className="flex flex-col">
      {/* Logo and branding */}
      <div className="mb-12">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16">
            <Image
              src={logoSrc}
              alt="Monarcade"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              priority
              unoptimized
            />
          </div>
          <div>
            <div className="font-bold text-app text-lg sm:text-xl lg:text-2xl">Monarcade</div>
            <div className="text-xs sm:text-sm text-app-muted uppercase tracking-wider">Play to earn</div>
          </div>
        </Link>
      </div>

      {/* Main heading */}
      <div className="mb-10 lg:mb-14">
        <h2 className="text-4xl sm:text-5xl lg:text-5xl font-bold leading-tight text-app mb-4">
          Join as a Player
        </h2>
        <p className="text-lg sm:text-xl text-app-muted leading-relaxed">
          Create your account and start competing in fast, fun branded challenges for MON rewards.
        </p>
      </div>

      {/* Benefits list */}
      <div className="space-y-5 sm:space-y-6 lg:space-y-7">
        <div className="flex gap-4 sm:gap-5">
          <div className="shrink-0 flex items-start">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/15 text-primary font-semibold">
              ✓
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-app text-lg sm:text-xl">Sign Up in Seconds</h3>
            <p className="text-app-muted mt-1 sm:text-lg">Use Google for instant access or create an account manually.</p>
          </div>
        </div>

        <div className="flex gap-4 sm:gap-5">
          <div className="shrink-0 flex items-start">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/15 text-primary font-semibold">
              ✓
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-app text-lg sm:text-xl">No Crypto Knowledge Needed</h3>
            <p className="text-app-muted mt-1 sm:text-lg">Wallet setup is seamless. Designed to be beginner-friendly.</p>
          </div>
        </div>

        <div className="flex gap-4 sm:gap-5">
          <div className="shrink-0 flex items-start">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/15 text-primary font-semibold">
              ✓
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-app text-lg sm:text-xl">Compete for Real Rewards</h3>
            <p className="text-app-muted mt-1 sm:text-lg">Play branded challenges and earn MON tokens instantly.</p>
          </div>
        </div>
      </div>

      {/* Trust note */}
      <div className="mt-12 lg:mt-16 pt-8 lg:pt-12 border-t border-app/10">
        <p className="text-sm sm:text-base text-app-muted">
          <span className="font-semibold text-app">Transparent & On-Chain.</span> Every challenge result is verified and recorded on the blockchain.
        </p>
      </div>
    </div>
  );
}
