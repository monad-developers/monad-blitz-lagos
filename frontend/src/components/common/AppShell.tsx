import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import mark from "../../assets/paypilot-mark.svg";

type AppShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function AppShell({ title, subtitle, children, actions }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="background-grid" />
      <header className="topbar">
        <Link to="/" className="brand">
          <img src={mark} alt="PayPilot" />
          <div>
            <strong>PayPilot</strong>
            <span>AI payment rules on Monad</span>
          </div>
        </Link>

        <nav className="topnav">
          <NavLink end to="/" className={({ isActive }) => (isActive ? "active" : undefined)}>
            Home
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : undefined)}>
            Dashboard
          </NavLink>
        </nav>
      </header>

      <main className="page">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Monad Testnet MVP</p>
            <h1>{title}</h1>
            <p className="subtitle">{subtitle}</p>
          </div>

          {actions ? <div className="hero-actions">{actions}</div> : null}
        </section>

        <section className="content-grid">{children}</section>
      </main>
    </div>
  );
}
