"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Ask", kicker: "Crisis query" },
  { href: "/map", label: "Map", kicker: "Coverage view" },
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
          <div>
            <h1>MedCompass: Find the Right Care, Right Where You Are</h1>
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
          <div className="sidebar-note">
            <strong>Product stance</strong>
            <span>Clear signals, traceable evidence, and less visual noise during urgent routing.</span>
          </div>
          <div className="sidebar-note">
            <strong>License</strong>
            <span>Released under the MIT License.</span>
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
            <span className="status-pill">Prototype interface</span>
          </div>
        </header>

        <main className="page-shell">{children}</main>
        <footer className="app-footer">
          <span>Aarogya Intelligence prototype</span>
          <span>MIT licensed</span>
        </footer>
      </div>
    </div>
  );
}
