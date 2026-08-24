"use client";

import { useEffect } from "react";
import { readSnapshot, writeSnapshot } from "@/data/db";
import { defaultSnapshot, snapshotFromState, useStudyStore } from "@/state/study-store";
import { assetPath, basePath } from "@/lib/asset-path";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrated = useStudyStore((state) => state.hydrated);
  const settings = useStudyStore((state) => state.settings);

  useEffect(() => {
    let active = true;
    readSnapshot(defaultSnapshot)
      .then((snapshot) => { if (active) useStudyStore.getState().hydrate(snapshot); })
      .catch(() => { if (active) useStudyStore.getState().hydrate(defaultSnapshot); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useStudyStore.subscribe((state) => {
      clearTimeout(timer);
      timer = setTimeout(() => { void writeSnapshot(snapshotFromState(state)); }, 180);
    });
    void writeSnapshot(snapshotFromState(useStudyStore.getState()));
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [hydrated]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.thaiSize = settings.thaiSize;
    root.classList.toggle("reduce-motion", settings.reduceMotion);
  }, [settings]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    void navigator.serviceWorker.register(assetPath("/sw.js"), { scope: `${basePath || ""}/` });
  }, []);

  return <>{children}</>;
}
