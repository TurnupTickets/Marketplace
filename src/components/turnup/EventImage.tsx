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

  // Reads the element's own src (not state), so it's safe from the
  // mount-time ref callback as well as from onError.
  const handleError = useCallback((img: HTMLImageElement) => {
    if (img.src.endsWith(EVENT_PLACEHOLDER_IMAGE)) {
      // Placeholder itself failed — stop the shimmer rather than loop.
      setLoaded(true);
    } else {
      setLoaded(false);
      setCurrent(EVENT_PLACEHOLDER_IMAGE);
      // State may already hold the placeholder (src resolved to it but the
      // element ended up elsewhere), in which case React won't rewrite src.
      img.src = EVENT_PLACEHOLDER_IMAGE;
    }
  }, []);

  const markIfComplete = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img?.complete) return;
      // `complete` is also true for a load that failed before hydration; a
      // decoded image has a width (an SVG without intrinsic size can report
      // 0, so the placeholder counts as loaded regardless).
      if (img.naturalWidth > 0 || img.src.endsWith(EVENT_PLACEHOLDER_IMAGE)) setLoaded(true);
      else handleError(img);
    },
    [handleError],
  );

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
        onError={(e) => handleError(e.currentTarget)}
        className={`event-image-fade size-full object-cover ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
      />
    </span>
  );
}
