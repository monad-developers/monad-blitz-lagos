import { Link } from "react-router-dom";
import { AppShell } from "../components/common/AppShell";

export function HomePage() {
  return (
    <AppShell
      title="Natural-language crypto payment rules for Monad"
      subtitle="Parse prompts like “Send 1 USDC every Friday if my balance stays above 20” into previewable, semi-automatic payment flows."
      actions={
        <>
          <Link className="primary-button" to="/dashboard">
            Open dashboard
          </Link>
          <a className="secondary-button" href="https://testnet-rpc.monad.xyz" target="_blank" rel="noreferrer">
            Monad RPC
          </a>
        </>
      }
    >
      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Hackathon-ready flow</h2>
          </div>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <strong>1. Parse</strong>
            <p>Turn a natural-language instruction into a strict payment rule with safe defaults.</p>
          </div>
          <div className="feature-card">
            <strong>2. Review</strong>
            <p>Preview recipient, amount, schedule, and balance condition before you save anything.</p>
          </div>
          <div className="feature-card">
            <strong>3. Run</strong>
            <p>Simulate the rule or manually broadcast the prepared Monad transaction from your wallet.</p>
          </div>
        </div>
      </article>

      <article className="panel accent-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Demo Defaults</p>
            <h2>Built for reliability over complexity</h2>
          </div>
        </div>

        <ul className="bullet-list">
          <li>SQLite + Drizzle for lightweight persistence.</li>
          <li>Hono backend with optional OpenAI parsing and heuristic fallback.</li>
          <li>Wallet-driven execution so the MVP avoids autonomous custody.</li>
        </ul>
      </article>
    </AppShell>
  );
}
