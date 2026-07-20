import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Dumbbell,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";
import { NokLogo } from "@/src/components/Mascot";
import type { AppRoute } from "@/src/store/useAppStore";
import { useAppStore } from "@/src/store/useAppStore";

const items: { route: AppRoute; label: string; icon: typeof BookOpen }[] = [
  { route: "home", label: "Learn", icon: BookOpen },
  { route: "practice", label: "Practice", icon: Dumbbell },
  { route: "progress", label: "Progress", icon: ChartNoAxesColumnIncreasing },
  { route: "settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const route = useAppStore((state) => state.route);
  const navigate = useAppStore((state) => state.navigate);
  const settings = useAppStore((state) => state.settings);
  const progress = useAppStore((state) => state.progress);
  const immersive = ["onboarding", "lesson", "complete"].includes(route);

  return (
    <div
      className={`app ${settings.darkMode ? "theme-dark" : ""} ${settings.reducedMotion ? "reduce-motion" : ""}`}
    >
      {!immersive && (
        <aside className="sidebar">
          <NokLogo />
          <nav className="side-nav" aria-label="Primary navigation">
            {items.map(({ route: itemRoute, label, icon: Icon }) => (
              <button
                key={itemRoute}
                className={route === itemRoute ? "nav-item active" : "nav-item"}
                onClick={() => navigate(itemRoute)}
                aria-current={route === itemRoute ? "page" : undefined}
              >
                <Icon size={22} strokeWidth={2.4} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-streak">
            <span aria-hidden="true">🔥</span>
            <div>
              <strong>{progress.currentStreak} day streak</strong>
              <small>Keep your flame glowing</small>
            </div>
          </div>
        </aside>
      )}

      <main className={immersive ? "main immersive-main" : "main"}>
        {children}
      </main>

      {!immersive && (
        <nav className="bottom-nav" aria-label="Primary navigation">
          {items.map(({ route: itemRoute, label, icon: Icon }) => (
            <button
              key={itemRoute}
              className={
                route === itemRoute
                  ? "bottom-nav-item active"
                  : "bottom-nav-item"
              }
              onClick={() => navigate(itemRoute)}
              aria-current={route === itemRoute ? "page" : undefined}
              aria-label={label}
            >
              <Icon size={22} strokeWidth={2.5} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
