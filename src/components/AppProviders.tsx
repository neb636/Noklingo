"use client";

import { useEffect } from "react";
import { readSnapshot, writeSnapshot } from "@/data/db";
import { defaultSnapshot, snapshotFromState, useStudyStore } from "@/state/study-store";
import { assetPath, basePath } from "@/lib/asset-path";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrated = useStudyStore((state) => state.hydrated);
  const hydrationNotice = useStudyStore((state) => state.hydrationNotice);
  const dismissHydrationNotice = useStudyStore((state) => state.dismissHydrationNotice);
  const settings = useStudyStore((state) => state.settings);

  useEffect(() => {
    let active = true;
    readSnapshot(defaultSnapshot)
      .then(({ snapshot, incompatible }) => { if (active) useStudyStore.getState().hydrate(snapshot, incompatible); })
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
  }, [settings]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    void navigator.serviceWorker.register(assetPath("/sw.js"), { scope: `${basePath || ""}/` });
  }, []);

  return <>
    {hydrationNotice && <div className="redesign-notice" role="status">
      <span>The new learning engine started with a clean local record because the earlier prototype data was incompatible.</span>
      <button onClick={dismissHydrationNotice} aria-label="Dismiss notice">×</button>
    </div>}
    {children}
  </>;
}
