"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Crisis Query" },
  { href: "/map", label: "Desert Map" },
  { href: "/browse", label: "Facility Browser" },
  { href: "/auth", label: "Sign In" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="header">
      <div className="shell header-inner">
        <div className="wordmark">
          <div className="wordmark-mark">AI</div>
          <div className="wordmark-copy">
            <h1>Aarogya Intelligence</h1>
            <p>Verified access routing for high-friction healthcare regions</p>
          </div>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              data-active={pathname === item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
