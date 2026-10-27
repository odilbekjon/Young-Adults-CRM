import { useEffect, useState } from "react";

// The page content (Layout) scrolls, not the window, so the observer has to be
// rooted on that scroll container for the margin below to reach past its edge.
const scrollParentOf = (el: HTMLElement): HTMLElement | null => {
  for (let parent = el.parentElement; parent; parent = parent.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) return parent;
  }
  return null;
};

// `true` once the element is within `margin` px of the visible area, and it
// stays true afterwards. Cards below the fold start their requests with it, so
// a short screen doesn't pay for data it hasn't scrolled to yet.
export const useNearViewport = (margin = 300) => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (!element || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setNear(true); },
      { root: scrollParentOf(element), rootMargin: `${margin}px 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, near, margin]);

  return [setElement, near] as const;
};
