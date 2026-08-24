"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { LoaderCircle } from "lucide-react";
import { LibraryRoute } from "@/src/features/library/LibraryRoute";
import { ProgressRoute } from "@/src/features/progress/ProgressRoute";
import { ResultsRoute } from "@/src/features/results/ResultsRoute";
import { SettingsRoute } from "@/src/features/settings/SettingsRoute";
import { AppShell } from "@/src/features/shell/AppShell";
import { StudyRoute } from "@/src/features/study/StudyRoute";
import { TodayRoute } from "@/src/features/today/TodayRoute";
import { type AppRoute, useAppStore } from "@/src/store/useAppStore";

const appRoutes: AppRoute[] = [
  "today",
  "study",
  "results",
  "library",
  "progress",
  "settings",
];

const routeFromHash = () => {
  if (typeof window === "undefined") return null;
  const candidate = window.location.hash.replace(/^#\//u, "") as AppRoute;
  return appRoutes.includes(candidate) ? candidate : null;
};

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null } as { error: Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Noklingo app error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal-error">
          <h1>Nok hit a little turbulence.</h1>
          <p>
            Your saved progress is still on this device. Reload the app to try
            again.
          </p>
          <button onClick={() => window.location.reload()}>
            Reload Noklingo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RouteView() {
  const route = useAppStore((state) => state.route);
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrate = useAppStore((state) => state.hydrate);
  const navigate = useAppStore((state) => state.navigate);
  const activeSession = useAppStore((state) => state.activeSession);
  const completion = useAppStore((state) => state.completion);
  const initialHashRoute = useRef<AppRoute | null>(routeFromHash());

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || !initialHashRoute.current) return;
    const desired = initialHashRoute.current;
    const safeDesired =
      desired === "study" && !activeSession
        ? "today"
        : desired === "results" && !completion
          ? "today"
          : desired;
    initialHashRoute.current = null;
    if (safeDesired !== route) navigate(safeDesired);
  }, [activeSession, completion, hydrated, navigate, route]);

  useEffect(() => {
    if (!hydrated) return;
    if (initialHashRoute.current && initialHashRoute.current !== route) return;
    window.history.replaceState(null, "", `#/${route}`);
  }, [hydrated, route]);

  useEffect(() => {
    if (!hydrated) return;
    const handleHash = () => {
      const desired = routeFromHash();
      if (!desired) return;
      const state = useAppStore.getState();
      if (desired === "study" && !state.activeSession) navigate("today");
      else if (desired === "results" && !state.completion) navigate("today");
      else navigate(desired);
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [hydrated, navigate]);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    )
      return;
    const serviceWorkerUrl = new URL("sw.js", window.location.href);
    navigator.serviceWorker
      .register(serviceWorkerUrl)
      .then(async () => {
        const registration = await navigator.serviceWorker.ready;
        const urls = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(window.location.origin));
        registration.active?.postMessage({ type: "CACHE_URLS", urls });
      })
      .catch(() => undefined);
  }, []);

  if (!hydrated) {
    return (
      <div className="app-loading">
        <div className="loading-bird">นก</div>
        <LoaderCircle className="spin" size={24} />
        <span>Getting today’s Thai ready…</span>
      </div>
    );
  }

  return (
    <AppShell>
      {route === "today" && <TodayRoute />}
      {route === "study" && <StudyRoute />}
      {route === "results" && <ResultsRoute />}
      {route === "library" && <LibraryRoute />}
      {route === "progress" && <ProgressRoute />}
      {route === "settings" && <SettingsRoute />}
    </AppShell>
  );
}

export function NoklingoApp() {
  return (
    <AppErrorBoundary>
      <RouteView />
    </AppErrorBoundary>
  );
}
