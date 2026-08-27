"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { readSnapshot, writeSnapshot } from "@/data/db";
import { defaultSnapshot, snapshotFromState, useStudyStore } from "@/state/study-store";
import { assetPath, basePath } from "@/lib/asset-path";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrated = useStudyStore((state) => state.hydrated);
  const hydrationNotice = useStudyStore((state) => state.hydrationNotice);
  const dismissHydrationNotice = useStudyStore((state) => state.dismissHydrationNotice);
  const staleSessionNotice = useStudyStore((state) => state.staleSessionNotice);
  const dismissStaleSessionNotice = useStudyStore((state) => state.dismissStaleSessionNotice);
  const settings = useStudyStore((state) => state.settings);

  useEffect(() => {
    let active = true;
    readSnapshot(defaultSnapshot)
      .then(({ snapshot, incompatible, staleSessionDropped }) => { if (active) useStudyStore.getState().hydrate(snapshot, incompatible, staleSessionDropped); })
      .catch(() => { if (active) useStudyStore.getState().hydrate(defaultSnapshot); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let writeChain = Promise.resolve();
    const unsubscribe = useStudyStore.subscribe((state) => {
      const snapshot = snapshotFromState(state);
      writeChain = writeChain.then(() => writeSnapshot(snapshot)).catch(() => undefined);
    });
    void writeSnapshot(snapshotFromState(useStudyStore.getState()));
    return unsubscribe;
  }, [hydrated]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.thaiSize = settings.thaiSize;
    root.dataset.romanization = String(settings.showRomanization);
    root.dataset.thaiScript = String(settings.showThaiScript);
    root.classList.toggle("reduce-motion", settings.reduceMotion);
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      const darkMeta = meta.media.includes("dark");
      meta.content = settings.theme === "dark"
        ? "#111318"
        : settings.theme === "light"
          ? "#f7f8fc"
          : darkMeta ? "#111318" : "#f7f8fc";
    }
  }, [settings]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    void navigator.serviceWorker.register(assetPath("/sw.js"), { scope: `${basePath || ""}/` });
  }, []);

  return <MotionConfig reducedMotion={settings.reduceMotion ? "always" : "user"}>
    {hydrationNotice && <div className="redesign-notice" role="status">
      <span>NokLingo was redesigned. Incompatible earlier data was cleared once on this device.</span>
      <button onClick={dismissHydrationNotice} aria-label="Dismiss notice">×</button>
    </div>}
    {staleSessionNotice && !hydrationNotice && <div className="redesign-notice" role="status">
      <span>A stale session was discarded; the rest of your valid local record was kept.</span>
      <button onClick={dismissStaleSessionNotice} aria-label="Dismiss notice">×</button>
    </div>}
    {children}
  </MotionConfig>;
}
