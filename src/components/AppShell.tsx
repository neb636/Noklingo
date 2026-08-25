"use client";

import { useRouter } from "next/router";
import {
  BookOpen, CalendarDays, ChartNoAxesColumnIncreasing, Library,
  Settings, Sparkles,
} from "lucide-react";
import { AppProviders } from "./AppProviders";
import { AppLink } from "./AppLink";

const navItems = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/library", label: "Library", icon: Library },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumnIncreasing },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <AppProviders>
      <div className="app-frame">
        <aside className="sidebar">
          <AppLink className="wordmark" href="/today/" aria-label="Thai Study home">
            <span className="wordmark-mark"><Sparkles size={16} aria-hidden="true" /></span>
            <span>Thai Study</span>
          </AppLink>
          <nav className="side-nav" aria-label="Primary navigation">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = router.pathname === href;
              return (
                <AppLink key={href} href={`${href}/`} className="nav-link" aria-current={active ? "page" : undefined}>
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span>{label}</span>
                </AppLink>
              );
            })}
          </nav>
          <div className="sidebar-note">
            <span className="eyebrow">Study method</span>
            <p>Watch closely. Retrieve later. Return before the phrase fades.</p>
          </div>
        </aside>
        <main className="main-content" id="main-content">{children}</main>
        <nav className="mobile-nav" aria-label="Primary navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = router.pathname === href;
            return (
              <AppLink key={href} href={`${href}/`} className="mobile-nav-link" aria-current={active ? "page" : undefined}>
                <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
                <span>{label}</span>
              </AppLink>
            );
          })}
        </nav>
      </div>
    </AppProviders>
  );
}
