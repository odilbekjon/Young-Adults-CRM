import { useEffect, useRef, useState, type ReactNode } from "react";

// Renders a long list a chunk at a time instead of all at once: the first chunk
// straight away, the next one whenever the end of what is rendered scrolls near
// the screen. Each row of a history timeline is dozens of components, so 300 of
// them in one go froze the page for about a second. The rows are direct
// children of the caller's container, so the layout is the same as an
// unchunked `items.map(...)`.
export const ChunkedList = <T,>({
  items,
  chunkSize = 20,
  children,
}: {
  items: T[];
  chunkSize?: number;
  children: (item: T) => ReactNode;
}) => {
  const [count, setCount] = useState(chunkSize);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = count < items.length;

  // A fresh observer after every chunk, so a sentinel that is still near the
  // screen (a short chunk, a tall window) asks for the next one straight away.
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setCount(items.length);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setCount((c) => c + chunkSize);
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, count, chunkSize, items.length]);

  return (
    <>
      {items.slice(0, count).map(children)}
      {hasMore && <div ref={sentinel} aria-hidden style={{ height: 0, marginTop: 0 }} />}
    </>
  );
};
