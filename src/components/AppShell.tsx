"use client";

import Image from "next/image";
import { useRouter } from "next/router";
import {
  CalendarDays, ClipboardCheck, Library, Settings,
} from "lucide-react";
import { assetPath } from "@/lib/asset-path";
import { AppLink } from "./AppLink";

const navItems = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/library", label: "Library", icon: Library },
  { href: "/results", label: "Results", icon: ClipboardCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="app-frame" data-route={router.pathname.slice(1) || "home"}>
      <aside className="sidebar">
        <AppLink className="wordmark" href="/today/" aria-label="NokLingo home">
          <span className="wordmark-mark brand-mark" aria-hidden="true">
            <Image src={assetPath("/noklingo-logo-black.png")} width={31} height={31} alt="" priority />
          </span>
          <span>NokLingo</span>
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
          <span className="eyebrow">Real conversations</span>
          <p>Watch, listen, and bring useful Thai into everyday life.</p>
        </div>
      </aside>
      <main className="main-content" id="main-content" tabIndex={-1}>{children}</main>
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
  );
}
