"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";

/* Three.js solo se carga en desktop, sin reduced motion y después de idle. */
const HeroCanvas = dynamic(() => import("./hero-canvas"), { ssr: false });

const DESKTOP_QUERY = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

function useIdleReady(enabled: boolean) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const markReady = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(markReady, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(markReady, 1200);
    return () => window.clearTimeout(id);
  }, [enabled]);

  return ready;
}

type HeroSceneProps = {
  onReady?: () => void;
};

export function HeroScene({ onReady }: HeroSceneProps) {
  const isDesktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const idle = useIdleReady(isDesktop);

  if (!isDesktop || !idle) return null;
  return <HeroCanvas onReady={onReady} />;
}
