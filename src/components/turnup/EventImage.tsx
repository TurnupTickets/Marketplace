import { useCallback, useState } from "react";
import { EVENT_PLACEHOLDER_IMAGE, resolveMediaUrl } from "@/lib/api/client";

/**
 * Every event cover/thumbnail on the site goes through this: a brand-coloured
 * shimmer while the image loads, then a fade-in — instead of a bare grey box
 * that pops into the image (or the placeholder) with no transition.
 *
 * - The wrapper takes the caller's sizing classes (`className`), so the box
 *   is reserved before load and nothing shifts.
 * - A missing `src` and a present-but-broken one both end up on
 *   EVENT_PLACEHOLDER_IMAGE, which fades in the same way.
 * - An image that is already complete when it mounts (browser cache, or it
 *   finished before hydration and its `load` event was missed) is marked
 *   loaded from the ref callback, so it never sits invisible.
 * - Reduced motion: no shimmer animation, no fade (see styles.css).
 */
export function EventImage({
  src,
  alt,
  width,
  height,
  loading = "lazy",
  className = "",
  imgClassName = "",
}: {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  loading?: "lazy" | "eager";
  /** Sizing/shape of the box (size, aspect, rounding, border). */
  className?: string;
  /** Extra classes on the `<img>` itself (e.g. hover scale). */
  imgClassName?: string;
}) {
  const resolved = resolveMediaUrl(src);
  const [current, setCurrent] = useState(resolved);
  const [loaded, setLoaded] = useState(false);

  // Reset only when the source actually changes — not on mount, where it
  // would undo the ref callback's "already complete" detection below.
  const [prevResolved, setPrevResolved] = useState(resolved);
  if (prevResolved !== resolved) {
    setPrevResolved(resolved);
    setCurrent(resolved);
    setLoaded(false);
  }

  const markIfComplete = useCallback((img: HTMLImageElement | null) => {
    if (!img?.complete) return;
    // `complete` is also true for a failed load; a decoded image has a
    // width (an SVG without intrinsic size can report 0, so the
    // placeholder counts as loaded regardless).
    if (img.naturalWidth > 0 || img.src.endsWith(EVENT_PLACEHOLDER_IMAGE)) setLoaded(true);
    else img.dispatchEvent(new Event("error"));
  }, []);

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      {!loaded && <span aria-hidden className="event-image-shimmer absolute inset-0" />}
      <img
        ref={markIfComplete}
        src={current}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (current !== EVENT_PLACEHOLDER_IMAGE) {
            setLoaded(false);
            setCurrent(EVENT_PLACEHOLDER_IMAGE);
          } else {
            // Placeholder itself failed — stop the shimmer rather than loop.
            setLoaded(true);
          }
        }}
        className={`event-image-fade size-full object-cover ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
      />
    </span>
  );
}
