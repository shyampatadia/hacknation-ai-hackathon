"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Ask", kicker: "Crisis query" },
  { href: "/map", label: "Map", kicker: "Desert view" },
  { href: "/browse", label: "Browse", kicker: "Facility audit" },
  // { href: "/auth", label: "Auth", kicker: "Operator access" },
];

const pageMeta: Record<string, { title: string; caption: string }> = {
  "/": {
    title: "Ask",
    caption: "Verified care routing for urgent referrals",
  },
  "/map": {
    title: "Desert Map",
    caption: "District scarcity and coverage pressure",
  },
  "/browse": {
    title: "Facility Browser",
    caption: "Audit facilities, evidence, and contradictions",
  },
  // "/auth": {
  //   title: "Operator Access",
  //   caption: "Supabase-backed sign in and profile bootstrap",
  // },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = pageMeta[pathname] ?? pageMeta["/"];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">AI</div>
          <div>
            <h1>Aarogya Intelligence</h1>
            <p>Healthcare network verification</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="sidebar-link"
              data-active={pathname === item.href}
            >
              <strong>{item.label}</strong>
              <span>{item.kicker}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-chip">VOICE READY</div>
          <div className="sidebar-chip">LANG AUTO</div>
          <div className="sidebar-note">
            <strong>System focus</strong>
            <span>Interface first. Trust visible. Trace always present.</span>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">{current.title}</p>
            <h2>{current.caption}</h2>
          </div>
          <div className="topbar-status">
            <span className="status-pill">INDIA NETWORK</span>
            <span className="status-pill status-live">LIVE MOCK DATA</span>
          </div>
        </header>

        <main className="page-shell">{children}</main>
      </div>
    </div>
  );
}
