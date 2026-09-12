import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Reveals its children when they scroll into view.
 *
 * A long catalogue page that animates everything on mount animates twenty cards
 * the visitor cannot see yet, and by the time they scroll there the motion is
 * over. An IntersectionObserver ties the animation to the moment the thing is
 * actually looked at, which is the only moment it communicates anything.
 *
 * Three deliberate details:
 *  - It disconnects after firing. A reveal that replays on every scroll-by is a
 *    flicker, not an entrance.
 *  - Server-render and the no-JS path start VISIBLE. Content that depends on an
 *    observer to become visible is content that disappears when the observer
 *    never runs — a blank page behind a JS error is a worse failure than no
 *    animation.
 *  - `delay` staggers a row. Each card arriving 60ms after the last reads as one
 *    considered movement; all of them at once reads as a repaint.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { setShown(true); io.disconnect(); }
        }
      },
      // Fire slightly before the element reaches the viewport, so the animation
      // is finishing as it arrives rather than starting.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`et-reveal ${className}`}
      data-shown={shown ? 'true' : 'false'}
      style={delay ? ({ ['--et-delay' as string]: `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
