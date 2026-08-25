"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns false for SSR and the browser's hydration render, then true once
 * React can safely render browser-local values such as locale and URL state.
 */
export function useClientReady() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
