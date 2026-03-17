import { useRef, useState, useEffect } from "react";

/**
 * useFadeIn – scroll-triggered fade hook.
 * Returns [ref, isVisible].
 */
export function useFadeIn(threshold = 0.05) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -10px 0px" }
    );

    raf = requestAnimationFrame(() => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        setVis(true);
      } else {
        obs.observe(el);
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [threshold]);

  return [ref, vis];
}
