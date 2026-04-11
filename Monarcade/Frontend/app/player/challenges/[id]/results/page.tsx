import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { getChallengeDetails } from "@/lib/challenge-details";
import { buildChallengeResultData } from "@/lib/challenge-results";
import { pageContainerClass } from "@/lib/layout";

type ChallengeResultsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    correct?: string;
    total?: string;
    reason?: string;
    round1Correct?: string;
    round1Total?: string;
    round2Correct?: string;
    round2Total?: string;
    outcome?: string;
  }>;
};

const statusMap = {
  processing: {
    label: "Pending Distribution",
    tone: "bg-primary/10 text-app",
    message: "You made the winners list. Reward distribution starts after challenge verification.",
  },
  scheduled: {
    label: "Scheduled",
    tone: "bg-primary/10 text-app",
    message: "Reward payout has been scheduled. Check your wallet activity shortly.",
  },
  paid: {
    label: "Paid",
    tone: "bg-primary/10 text-app",
    message: "Your MON reward has been sent to your wallet successfully.",
  },
  "not-qualified": {
    label: "Not Qualified",
    tone: "bg-app-soft text-app-muted",
    message: "No payout for this run.",
  },
};

export default async function ChallengeResultsPage({ params, searchParams }: ChallengeResultsPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const challenge = await getChallengeDetails(id);

  if (!challenge) {
    notFound();
  }

  const result = buildChallengeResultData(challenge.brandTitle, query);
  const payout = statusMap[result.payoutStatus];
  return (
    <div className="page-typography player-dashboard-typography min-h-screen bg-app text-app">
      <Navbar />

      <main className="w-full py-8 sm:py-10 lg:py-12">
        <section className={`${pageContainerClass} space-y-6 sm:space-y-7`}>
          <section className="relative overflow-hidden rounded-[2rem] border border-app bg-app-surface p-6 shadow-app sm:p-8 lg:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{
                background: result.didWin
                  ? "radial-gradient(circle at 12% 12%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 46%), radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--color-secondary) 18%, transparent), transparent 38%)"
                  : "radial-gradient(circle at 12% 12%, color-mix(in srgb, var(--color-neutral) 12%, transparent), transparent 46%), radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--color-secondary) 9%, transparent), transparent 38%)",
              }}
            />

            <div className="relative flex flex-wrap items-start justify-between gap-4 sm:gap-5">
              <div>
               <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">Challenge Results</p>
                
                <p className="mt-2 text-lg text-app-muted sm:text-xl">Brand: {result.brandName}</p>
              </div>

              <span
                className={`inline-flex rounded-full px-4 py-2 text-base font-semibold uppercase tracking-[0.15em] sm:text-lg ${
                  result.didWin ? "bg-primary text-white dark:text-[#2f1736]" : "bg-app-soft text-app-muted"
                }`}
              >
                {result.didWin ? "Winner" : "Completed"}
              </span>
            </div>

            <div className="relative mt-6 flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
              <article className="w-fit rounded-2xl border border-app bg-app px-6 py-4 text-center sm:px-7 sm:py-5">
                <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">Final Score</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-app sm:text-2xl">{result.finalScore}%</p>
              </article>
              <article className="w-fit rounded-2xl border border-app bg-app px-6 py-4 text-center sm:px-7 sm:py-5">
                <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">Correct Answers</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-app sm:text-2xl">
                  {result.totalCorrectAnswers}/{result.totalQuestions}
                </p>
              </article>
            </div>

            <p className="relative mt-6 max-w-3xl text-center text-lg leading-8 text-app-muted sm:mx-auto sm:text-xl">
              {result.performanceNote}
            </p>
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
            <article className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-6 lg:col-span-7">
              <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">Performance Breakdown</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-app bg-app px-4 py-4 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold uppercase tracking-[0.14em] text-app-muted sm:text-lg">Round 1</p>
                    <p className="text-xl font-semibold text-app sm:text-2xl">
                      {result.round1Correct}/{result.round1Total}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-app bg-app px-4 py-4 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold uppercase tracking-[0.14em] text-app-muted sm:text-lg">Round 2</p>
                    <p className="text-xl font-semibold text-app sm:text-2xl">
                      {result.round2Correct}/{result.round2Total}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-app bg-app-soft px-4 py-4 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold uppercase tracking-[0.14em] text-app-muted sm:text-lg">Total Correct</p>
                    <p className="text-xl font-semibold text-app sm:text-2xl">
                      {result.totalCorrectAnswers}/{result.totalQuestions}
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <aside className="space-y-5 lg:col-span-5">
              <section className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-6">
                <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">Reward Status</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-app sm:text-4xl">
                  {result.didWin ? `${result.rewardMon.toFixed(1)} MON` : "0 MON"}
                </p>

                <span
                  className={`mt-4 inline-flex font-semibold uppercase tracking-[0.14em] ${
                    result.payoutStatus === "not-qualified"
                      ? "rounded-none px-2 py-0.5 text-xs sm:text-sm"
                      : "rounded-full px-3 py-1.5 text-base sm:text-lg"
                  } ${payout.tone}`}
                >
                  {payout.label}
                </span>

                <p className="mt-4 text-lg leading-8 text-app-muted sm:text-xl">{payout.message}</p>

                {!result.didWin ? (
                  <p className="mt-4 text-lg leading-8 text-app-muted sm:text-xl">
                    Keep going. More live challenges are available.
                  </p>
                ) : null}

              </section>

              <section className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-6">
                <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">Next Step</p>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <Link
                    href="/player/dashboard"
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-app bg-app px-5 py-3 text-xl font-semibold text-app transition-colors duration-200 hover:bg-app-soft sm:min-h-14 sm:text-2xl"
                  >
                    Back to Dashboard
                  </Link>
                  <Link
                    href="/challenge"
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-5 py-3 text-xl font-semibold text-white transition-all duration-200 hover:brightness-110 dark:text-[#2f1736] sm:min-h-14 sm:text-2xl"
                    style={{ color: "var(--color-white)" }}
                  >
                    Explore More Challenges
                  </Link>
                </div>
              </section>
            </aside>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  );
}
