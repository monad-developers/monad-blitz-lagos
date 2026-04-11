'use client'

import Image from "next/image";
import Link from "next/link";
import { useAccount } from 'wagmi'
import { ChatUI } from "@/components/ChatUI";
import { useAppKit } from '@reown/appkit/react'

export default function Home() {
  const { isConnected } = useAccount()
  const { open } = useAppKit()

  const handleConnect = () => {
    open()
  }

  if (isConnected) {
    return <ChatUI />
  }

  return (
    <>
      {/* TopNavBar */}
      <nav className="bg-background/85 backdrop-blur-xl sticky top-0 z-50 transition-opacity duration-300 w-full border-b border-outline-variant/10">
        <div className="flex justify-between items-center w-full px-6 md:px-12 py-6 max-w-[1440px] mx-auto">
          <div className="text-2xl font-headline italic text-on-background tracking-tighter">
            MONA
          </div>
          <div className="hidden md:flex gap-10 items-center">
            <Link
              className="font-label uppercase tracking-widest text-[11px] text-primary font-bold border-b border-primary pb-1"
              href="#"
            >
              How it works
            </Link>
            <Link
              className="font-label uppercase tracking-widest text-[11px] text-on-background opacity-70 hover:opacity-100 transition-opacity duration-300"
              href="#"
            >
              Features
            </Link>
            <Link
              className="font-label uppercase tracking-widest text-[11px] text-on-background opacity-70 hover:opacity-100 transition-opacity duration-300"
              href="#"
            >
              Built on Monad
            </Link>
          </div>
          <div className="flex gap-4 items-center">
            <button 
              onClick={handleConnect}
              className="bg-surface-container-highest px-6 py-2.5 text-[11px] font-label uppercase tracking-widest hover:bg-surface-container-high transition-colors"
            >
              Connect Wallet
            </button>
            <button 
              onClick={handleConnect}
              className="bg-primary text-on-primary px-6 py-2.5 text-[11px] font-label uppercase tracking-widest scale-100 hover:scale-95 transition-all duration-200"
            >
              Start shopping
            </button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 px-6 md:px-12 max-w-[1440px] mx-auto overflow-hidden">
          <div className="radial-glow absolute inset-0 -z-10"></div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 pt-12">
              <h1 className="text-[64px] md:text-[84px] leading-[0.9] font-headline font-medium tracking-tight mb-8">
                Shop with words.{" "}
                <span className="text-primary italic">Pay in milliseconds.</span>
              </h1>
              <p className="text-xl text-on-surface-variant max-w-md mb-10 leading-relaxed">
                The first AI-native shopping experience built on Monad. No
                forms, no carts, just natural conversation and instant
                settlement.
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleConnect}
                  className="bg-primary text-on-primary px-8 py-4 text-sm font-label uppercase tracking-widest flex items-center gap-3 group shadow-[0_0_20px_rgba(172,51,35,0.2)]"
                >
                  Start shopping free
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </button>
                <button className="border-b border-on-surface/20 px-4 py-4 text-sm font-label uppercase tracking-widest flex items-center gap-3 hover:border-primary transition-colors">
                  <span className="material-symbols-outlined">play_circle</span>
                  Watch demo
                </button>
              </div>
            </div>
            <div className="lg:col-span-7">
              <div className="bg-surface-container-lowest border border-outline-variant/30 shadow-2xl p-2">
                <div className="bg-surface-container-low flex h-[540px] flex-col md:flex-row">
                  {/* Mockup Sidebar: Chat */}
                  <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-outline-variant/20">
                    <div className="p-6 flex-1 overflow-y-auto space-y-6">
                      <div className="bg-surface-container-highest p-4 text-sm">
                        I&apos;m looking for a minimal mechanical keyboard, olive
                        green, with silent switches. Budget is $200.
                      </div>
                      <div className="bg-primary-container/10 p-4 text-sm italic">
                        Curating options for your workspace... Found 3 matches
                        matching your aesthetic and technical specs.
                      </div>
                    </div>
                    <div className="p-6 border-t border-outline-variant/20">
                      <div className="bg-surface-container-lowest p-3 text-xs opacity-40">
                        Type your request...
                      </div>
                    </div>
                  </div>
                  {/* Mockup Content: Results */}
                  <div className="w-full md:w-1/2 p-6 overflow-y-auto bg-surface-container-lowest">
                    <div className="space-y-6">
                      <div className="group">
                        <div className="aspect-[4/3] bg-surface-container mb-3 overflow-hidden relative">
                          <Image
                            className="w-full h-full object-cover"
                            alt="minimalist olive green mechanical keyboard on a wooden desk with soft cinematic lighting"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBCSZxoWNjQUQNbhrm_KquDDpy4a4wLNRum6wyiyqVQ_Rc0V_UeMoVKXMC6m2QEucueLTkKqt-HgO-YmKm-BUF18RTYsAoWrKc6xt8mgOJTAHE2sHnWlQ0F71Avvc7um8GH8SIPK_y1LAx2j1pjJT5cFKFWhoHjzpCG6rjPOfC6eombR9j5uhGOOuYoG02KT9T_QtF98OBukkD-oMVYJ2IqPUogQp9GpQeLrOs0XaH58y1mZT03YtWuoV2p_IkzI7lrrKMDURHuf3u"
                            fill
                          />
                        </div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-headline text-lg">
                              Terra Series Mk.I
                            </h4>
                            <p className="text-xs uppercase tracking-widest opacity-60">
                              Custom Built
                            </p>
                          </div>
                          <span className="font-bold">$189.00</span>
                        </div>
                      </div>
                      <div className="opacity-50 blur-[1px]">
                        <div className="aspect-[4/3] bg-surface-container mb-3"></div>
                        <div className="h-4 w-3/4 bg-surface-container mb-2"></div>
                        <div className="h-4 w-1/4 bg-surface-container"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Bar */}
        <section className="bg-surface-container-low py-12 px-6 md:px-12">
          <div className="max-w-[1440px] mx-auto flex flex-wrap justify-between items-center gap-8 border-y border-outline-variant/10 py-12">
            <div className="flex flex-col">
              <span className="text-3xl font-headline">&lt; 400ms</span>
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">
                Settlement
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-headline">10k+</span>
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">
                Target TPS
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-headline">x402</span>
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">
                Protocol Native
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-headline">0</span>
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">
                Forms Required
              </span>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-32 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="mb-20">
            <span className="text-[11px] font-label uppercase tracking-[0.3em] text-primary mb-4 block">
              Process
            </span>
            <h2 className="text-5xl font-headline max-w-xl">
              Intelligent commerce in three movements.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="space-y-6">
              <div className="text-6xl font-headline opacity-10 italic">01</div>
              <div className="w-12 h-12 flex items-center justify-center bg-surface-container-highest">
                <span className="material-symbols-outlined text-primary">
                  chat_bubble
                </span>
              </div>
              <h3 className="text-2xl font-headline">Describe it</h3>
              <p className="text-on-surface-variant leading-relaxed">
                Simply tell Mona what you&apos;re looking for in natural language.
                No filters, no categories, just your intent.
              </p>
            </div>
            <div className="space-y-6">
              <div className="text-6xl font-headline opacity-10 italic">02</div>
              <div className="w-12 h-12 flex items-center justify-center bg-surface-container-highest">
                <span className="material-symbols-outlined text-primary">
                  auto_awesome
                </span>
              </div>
              <h3 className="text-2xl font-headline">Browse results</h3>
              <p className="text-on-surface-variant leading-relaxed">
                Our agent scours the x402 ecosystem to find curated matches that
                fit your taste and technical requirements.
              </p>
            </div>
            <div className="space-y-6">
              <div className="text-6xl font-headline opacity-10 italic">03</div>
              <div className="w-12 h-12 flex items-center justify-center bg-surface-container-highest">
                <span className="material-symbols-outlined text-primary">
                  bolt
                </span>
              </div>
              <h3 className="text-2xl font-headline">Pay instantly</h3>
              <p className="text-on-surface-variant leading-relaxed">
                Confirm with one click. Funds move via Monad&apos;s parallel
                execution for settlement that feels like magic.
              </p>
            </div>
          </div>
        </section>

        {/* Features - Bento Grid Style */}
        <section className="py-32 px-6 md:px-12 bg-surface">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-surface-container-low p-8 md:p-16 flex flex-col justify-between min-h-[480px]">
              <div>
                <h3 className="text-4xl font-headline mb-6">Agent-first UX</h3>
                <p className="text-lg text-on-surface-variant max-w-md">
                  The entire store lives in the chat. We&apos;ve removed the
                  friction of navigation so you can focus on curation.
                </p>
              </div>
              <div className="mt-12 flex items-end justify-between">
                <div className="flex -space-x-4">
                  <div className="w-12 h-12 bg-surface-container-highest border-2 border-surface-container-low flex items-center justify-center font-bold text-xs">
                    AI
                  </div>
                  <div className="w-12 h-12 bg-primary-container border-2 border-surface-container-low flex items-center justify-center font-bold text-xs text-white">
                    X
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-widest opacity-40">
                  Real-time inference
                </span>
              </div>
            </div>
            <div className="md:col-span-4 bg-tertiary-container p-8 md:p-12 text-on-tertiary-container flex flex-col justify-center">
              <span
                className="material-symbols-outlined text-4xl mb-6"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              <h3 className="text-2xl font-headline mb-4">
                The Curator&apos;s Note
              </h3>
              <p className="text-sm leading-relaxed opacity-90">
                Every recommendation is backed by on-chain verification and
                protocol-level security. No spoofing, just truth.
              </p>
            </div>
            <div className="md:col-span-4 bg-[#211a14] p-8 md:p-12 text-[#fff8f5] flex flex-col justify-between">
              <h3 className="text-2xl font-headline">
                Monad-native Payments
              </h3>
              <p className="text-sm opacity-70 mb-8">
                Settlement at the speed of thought using the x402 standard.
              </p>
              <div className="h-1 bg-primary w-full"></div>
            </div>
            <div className="md:col-span-8 bg-surface-container-highest p-8 md:p-16 overflow-hidden relative group">
              <div className="relative z-10">
                <h3 className="text-3xl font-headline mb-4">
                  Unrivaled Throughput
                </h3>
                <p className="max-w-sm text-on-surface-variant">
                  Parallel execution means your transaction never waits in line.
                  Scalability is no longer a bottleneck for luxury commerce.
                </p>
              </div>
              <div className="absolute bottom-[-10%] right-[-5%] w-1/2 aspect-video bg-white/40 skew-x-12 group-hover:translate-x-4 transition-transform duration-700"></div>
            </div>
          </div>
        </section>

        {/* Built on Monad */}
        <section className="py-32 px-6 md:px-12 bg-[#eee0d6]">
          <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-20 items-center">
            <div className="lg:w-1/2">
              <span className="text-[11px] font-label uppercase tracking-[0.3em] text-primary mb-4 block">
                Infrastructure
              </span>
              <h2 className="text-6xl font-headline mb-10 leading-tight">
                Why Monad?
              </h2>
              <div className="space-y-8">
                <div className="flex gap-6 border-b border-on-surface/10 pb-8">
                  <span className="font-headline text-3xl opacity-30 italic">
                    A
                  </span>
                  <div>
                    <h4 className="font-bold mb-2">10,000 Real TPS</h4>
                    <p className="text-sm text-on-surface-variant">
                      The performance ceiling of modern commerce has been
                      lifted. Mona handles thousands of concurrent shoppers
                      without a hiccup.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 border-b border-on-surface/10 pb-8">
                  <span className="font-headline text-3xl opacity-30 italic">
                    B
                  </span>
                  <div>
                    <h4 className="font-bold mb-2">400ms Block Times</h4>
                    <p className="text-sm text-on-surface-variant">
                      The psychological barrier of &quot;waiting for
                      confirmation&quot; is gone. Purchases feel as immediate as
                      a physical handshake.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <span className="font-headline text-3xl opacity-30 italic">
                    C
                  </span>
                  <div>
                    <h4 className="font-bold mb-2">MonadDB Efficiency</h4>
                    <p className="text-sm text-on-surface-variant">
                      Optimized state access ensures that our AI agents can
                      retrieve product data and execute orders with zero
                      latency.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2 relative w-full">
              <div className="aspect-square bg-surface-container-lowest p-1 relative overflow-hidden">
                <Image
                  className="w-full h-full object-cover"
                  alt="abstract digital visualization of high-speed data streams flowing through a crystalline architecture, glowing warm orange and deep purple"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCXbrqATCfimGz9LYAMYPp9vClvDa_jI3Tq4vFQ981sPUWOlEIvK08eBHgten1fqb11EzikKGfV4jhfdWv0uzujXyMcl5AoO05nZ9q73IS6Y6yqG-CZm1ux3eiqeQLqjDY9xzM38op0e4RFrk-57kR3uSIWkOOC1Q4Hzu7N4moqVORLoPLsaABu_ia0FEbcuctq6cJ6lAEkfnvZ2sQqwUipeukT2XF3rWiTa7Ev-_JYYX8hCG3OwBecQtux4seyE3DGRYySuXmCBbJ"
                  fill
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-primary text-white p-8">
                <p className="text-[10px] uppercase tracking-widest mb-2">
                  Network Status
                </p>
                <p className="font-headline text-2xl">Optimal</p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-40 px-6 md:px-12 text-center bg-surface relative overflow-hidden">
          <div className="radial-glow absolute inset-0 -z-10"></div>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-headline mb-10 italic">
              Ready to shop smarter?
            </h2>
            <p className="text-xl text-on-surface-variant mb-12">
              Join the next evolution of commerce on the fastest network in
              existence.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-6">
              <button 
                onClick={handleConnect}
                className="bg-primary text-on-primary px-10 py-5 text-sm font-label uppercase tracking-widest hover:translate-y-[-2px] transition-transform shadow-xl"
              >
                Start shopping free
              </button>
              <button className="border border-on-surface px-10 py-5 text-sm font-label uppercase tracking-widest hover:bg-on-surface hover:text-surface transition-colors">
                Contact sales
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t-0 py-20 px-6 md:px-12">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-20">
            <div className="space-y-8">
              <div className="text-2xl font-headline text-on-background italic">
                MONA
              </div>
              <p className="text-[12px] font-body tracking-tight opacity-60 leading-relaxed max-w-xs">
                Curating the world of decentralized commerce through intelligent
                agency and parallel execution.
              </p>
              <div className="flex gap-4">
                <div className="bg-surface-container px-3 py-1 text-[10px] uppercase tracking-tighter border border-outline-variant/30">
                  Built on Monad
                </div>
                <div className="bg-surface-container px-3 py-1 text-[10px] uppercase tracking-tighter border border-outline-variant/30">
                  x402 Certified
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h5 className="text-[11px] uppercase tracking-widest font-bold">
                  Platform
                </h5>
                <ul className="space-y-3">
                  <li>
                    <Link
                      className="text-[12px] opacity-60 hover:text-primary transition-colors"
                      href="#"
                    >
                      Brand
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="text-[12px] opacity-60 hover:text-primary transition-colors underline underline-offset-4 decoration-primary"
                      href="#"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="text-[12px] opacity-60 hover:text-primary transition-colors"
                      href="#"
                    >
                      Monad
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h5 className="text-[11px] uppercase tracking-widest font-bold">
                  Legal
                </h5>
                <ul className="space-y-3">
                  <li>
                    <Link
                      className="text-[12px] opacity-60 hover:text-primary transition-colors"
                      href="#"
                    >
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="text-[12px] opacity-60 hover:text-primary transition-colors"
                      href="#"
                    >
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="text-[12px] opacity-60 hover:text-primary transition-colors"
                      href="#"
                    >
                      x402
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="space-y-4">
              <h5 className="text-[11px] uppercase tracking-widest font-bold">
                Subscribe
              </h5>
              <p className="text-[12px] opacity-60">
                Get the latest curator notes and protocol updates.
              </p>
              <form className="flex border-b border-on-surface/20 py-2">
                <input
                  className="bg-transparent border-none focus:ring-0 text-sm flex-1 placeholder:opacity-40"
                  placeholder="email@address.com"
                  type="email"
                />
                <button
                  className="material-symbols-outlined text-primary"
                  type="submit"
                >
                  arrow_forward
                </button>
              </form>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 border-t border-on-surface/5">
            <p className="text-[12px] opacity-40">
              © 2024 MONA. All rights reserved.
            </p>
            <div className="flex gap-8">
              <span className="material-symbols-outlined text-lg opacity-40 hover:opacity-100 cursor-pointer">
                public
              </span>
              <span className="material-symbols-outlined text-lg opacity-40 hover:opacity-100 cursor-pointer">
                chat
              </span>
              <span className="material-symbols-outlined text-lg opacity-40 hover:opacity-100 cursor-pointer">
                terminal
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
