"use client";

import Image from "next/image";
import { useRouter } from "next/router";
import { Brain, CalendarDays, Library, Settings } from "lucide-react";
import { assetPath } from "@/lib/asset-path";
import { useStudyStore } from "@/state/study-store";
import { AppLink } from "./AppLink";

const desktopNavItems = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/library", label: "Library", icon: Library },
  { href: "/review", label: "Review", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings },
];

const mobileNavItems = [
  { href: "/library", label: "Lessons", icon: Library },
  { href: "/review", label: "Review", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const kidsMode = useStudyStore((state) => state.settings.kidsMode);
  const visibleDesktopNavItems = kidsMode
    ? desktopNavItems.filter(({ href }) => href === "/library" || href === "/settings")
    : desktopNavItems;
  const homeHref = kidsMode ? "/library/" : "/today/";

  return (
    <div className="app-frame" data-route={router.pathname.slice(1) || "home"}>
      <aside className="sidebar">
        <AppLink className="wordmark" href={homeHref} aria-label="NokLingo home">
          <span className="wordmark-mark brand-mark" aria-hidden="true">
            <Image src={assetPath("/noklingo-logo-black.png")} width={31} height={31} alt="" priority />
          </span>
          <span>NokLingo</span>
        </AppLink>
        <nav className="side-nav" aria-label="Primary navigation">
          {visibleDesktopNavItems.map(({ href, label, icon: Icon }) => {
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
      {!kidsMode && <nav
        className="mobile-nav"
        aria-label="Primary navigation"
        style={{ gridTemplateColumns: `repeat(${mobileNavItems.length}, minmax(0, 1fr))` }}
      >
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active = router.pathname === href;
          return (
            <AppLink key={href} href={`${href}/`} className="mobile-nav-link" aria-current={active ? "page" : undefined}>
              <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              <span>{label}</span>
            </AppLink>
          );
        })}
      </nav>}
    </div>
  );
}
