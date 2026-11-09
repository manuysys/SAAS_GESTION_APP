"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";
import Lenis from "lenis";
import { useEffect } from "react";

/*
 * Smooth scroll con Lenis, montado solo en la landing. Lenis usa el ticker de
 * GSAP para que ScrollTrigger (pins y scrub) se sincronice con el scroll suave.
 * Con prefers-reduced-motion no se inicializa: el scroll queda nativo.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.1 });
    const onLenisScroll = () => ScrollTrigger.update();
    const onTick = (time: number) => lenis.raf(time * 1000);

    lenis.on("scroll", onLenisScroll);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  return null;
}
