import Link from "next/link";
import { pageContainerClass } from "@/lib/layout";

const footerLinks = [
  { label: "Challenges", href: "/challenge" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Coming Soon", href: "/#coming-soon" },
];

export function Footer() {
  return (
    <footer className="relative w-full overflow-hidden bg-app py-14 sm:py-16 lg:py-20">
      <div
        className="absolute left-[-6rem] top-8 h-40 w-40 rounded-full bg-primary/12 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-[-5rem] h-52 w-52 rounded-full bg-secondary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className={`${pageContainerClass} relative`}>
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-app-surface/90 px-5 py-7 shadow-app backdrop-blur sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:gap-14">
            <div className="max-w-2xl">
              <Link
                href="/"
                className="inline-flex rounded-full bg-app-soft/80 px-4 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-app-muted transition-colors duration-200 hover:text-app sm:text-base"
              >
                Monarcade
              </Link>
              <h2 className="mt-5 max-w-xl text-[2.35rem] font-bold tracking-tight text-app sm:text-5xl lg:text-[3.8rem]">
                Turn attention into play, and play into rewards.
              </h2>
              <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-app-muted sm:mt-5 sm:text-xl lg:text-[1.45rem]">
                Monarcade gives brands a more memorable way to engage players through short challenge rounds backed by real MON incentives.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap">
                <Link
                  href="/challenge"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 py-3 text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 sm:min-h-14 sm:px-6 sm:py-3.5 sm:text-xl"
                >
                  Explore Challenges
                </Link>
                <Link
                  href="/#how-it-works"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-app-soft px-5 py-3 text-base font-semibold text-app transition-colors duration-200 hover:bg-app sm:min-h-14 sm:px-6 sm:py-3.5 sm:text-xl"
                >
                  See How It Works
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-app-soft/70 px-5 py-5 sm:px-6 sm:py-6 lg:mt-16 lg:self-end">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-base">
                Quick Links
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {footerLinks.map((link) => (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    className="text-lg font-semibold text-app transition-colors duration-200 hover:text-secondary sm:text-xl"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-[color:var(--border)] pt-5 sm:mt-10 sm:pt-6">
            <div className="flex flex-col gap-3 text-base text-app-muted sm:flex-row sm:items-center sm:justify-between sm:text-lg">
              <p className="font-medium">Brand-backed challenges. Faster player recall. Rewarded outcomes.</p>
              <p>
                Powered by <Link href="/" className="transition-colors duration-200 hover:text-app">Monarcade</Link> on Monad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
