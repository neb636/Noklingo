"use client";

import { Component, type ErrorInfo, type ReactNode, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { AppShell } from "@/src/features/shell/AppShell";
import { CompletionRoute } from "@/src/features/completion/CompletionRoute";
import { HomeRoute } from "@/src/features/home/HomeRoute";
import { LessonRoute } from "@/src/features/lesson/LessonRoute";
import { OnboardingRoute } from "@/src/features/onboarding/OnboardingRoute";
import { PracticeRoute } from "@/src/features/practice/PracticeRoute";
import { ProgressRoute } from "@/src/features/progress/ProgressRoute";
import { SettingsRoute } from "@/src/features/settings/SettingsRoute";
import { useAppStore } from "@/src/store/useAppStore";

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

  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  useEffect(() => {
    window.history.replaceState(null, "", `#/${route}`);
  }, [route]);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
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
    }
  }, []);

  if (!hydrated)
    return (
      <div className="app-loading">
        <div className="loading-bird">นก</div>
        <LoaderCircle className="spin" size={24} />
        <span>Warming up your Thai…</span>
      </div>
    );

  return (
    <AppShell>
      {route === "onboarding" && <OnboardingRoute />}
      {route === "home" && <HomeRoute />}
      {route === "lesson" && <LessonRoute />}
      {route === "complete" && <CompletionRoute />}
      {route === "practice" && <PracticeRoute />}
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
