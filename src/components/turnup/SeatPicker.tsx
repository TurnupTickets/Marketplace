import { Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SeatMapResource, SeatMapSeat, SeatSelection } from "@/lib/api/types";

const FALLBACK_COLOR = "#9ca3af";
const DISABLED_FILL = "#d4d4d8";
const SELECTED_COLOR = "#111827";
const DECORATIVE_FILL = "#e5e7eb";
const MIN_SCALE = 0.3;
const MAX_SCALE = 6;
const WHEEL_ZOOM_FACTOR = 1.1;
const BUTTON_ZOOM_FACTOR = 1.2;
const FIT_PADDING = 24;

/**
 * `App\Enums\Statuses\SeatInEventStatusEnum` (int-backed: DISABLE=0, ENABLE=1)
 * serializes here as its lowercased case *name* — `"disable"`/`"enable"`,
 * not `"occupied"`/`"available"`. The enum itself has no "held" or "sold"
 * state at all: `sold` is a separate boolean field, and a seat someone
 * else's cart is advisorily holding (`X-Cart-Token`, 15min) isn't in this
 * response at all — that only surfaces as a `422 SEATS_OCCUPIED` on quote,
 * which is why `occupiedSeatIds` (reactive, not from the seat map itself)
 * is a separate parameter here.
 */
function isSeatDisabled(seat: SeatMapSeat, occupiedSeatIds: Set<number>): boolean {
  return (
    seat.sold ||
    seat.status === "disable" ||
    seat.ticket_group_id == null ||
    occupiedSeatIds.has(seat.id)
  );
}

function seatTitle(seat: SeatMapSeat): string {
  const parts = [
    seat.section ? `Sekcja ${seat.section}` : null,
    seat.row ? `Rząd ${seat.row}` : null,
    seat.number ? `Miejsce ${seat.number}` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

/** Ctrl on Windows/Linux, Cmd on macOS — held-modifier tracking shared by both pan/zoom viewports. */
function useModifierHeld() {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") setHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") setHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
  return held;
}

const ZoomControls = ({
  onZoomOut,
  onReset,
  onZoomIn,
  hint,
}: {
  onZoomOut: () => void;
  onReset: () => void;
  onZoomIn: () => void;
  hint: string;
}) => (
  <div className="flex items-center justify-between">
    <p className="text-[0.65rem] text-muted-foreground">{hint}</p>
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Oddal"
        onClick={onZoomOut}
        className="flex size-7 items-center justify-center rounded-full border border-border hover:border-primary"
      >
        <Minus className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Resetuj widok"
        onClick={onReset}
        className="flex size-7 items-center justify-center rounded-full border border-border hover:border-primary"
      >
        <RotateCcw className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Przybliż"
        onClick={onZoomIn}
        className="flex size-7 items-center justify-center rounded-full border border-border hover:border-primary"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  </div>
);

const PAN_ZOOM_HINT = "Przybliż kółkiem myszy, przesuń widok Ctrl/Cmd + lewy przycisk myszy";

/**
 * `type: 'custom'` — no SVG, seats are placed on a plain `rows`×`cols` grid
 * by their own `row`/`number`. Real DOM buttons + a CSS-transform pan/zoom
 * wrapper (native click hit-testing through the transform, no manual
 * point-in-path math needed).
 */
function CustomSeatPicker({
  seatMap,
  selectedIds,
  occupiedSeatIds,
  onToggleSeat,
}: {
  seatMap: Extract<SeatMapResource, { type: "custom" }>;
  selectedIds: Set<number>;
  occupiedSeatIds: Set<number>;
  onToggleSeat: (seatId: number, groupId: number) => void;
}) {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const ctrlHeld = useModifierHeld();
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    };
    const onMouseUp = () => {
      draggingRef.current = false;
      setDragging(false);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const zoomBy = (factor: number) =>
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor)),
    }));

  return (
    <div className="space-y-2">
      <ZoomControls
        hint={PAN_ZOOM_HINT}
        onZoomOut={() => zoomBy(1 / BUTTON_ZOOM_FACTOR)}
        onReset={() => setTransform({ scale: 1, x: 0, y: 0 })}
        onZoomIn={() => zoomBy(BUTTON_ZOOM_FACTOR)}
      />
      <div
        onWheel={(e) => {
          e.preventDefault();
          zoomBy(e.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR);
        }}
        onMouseDown={(e) => {
          if (!(e.ctrlKey || e.metaKey) || e.button !== 0) return;
          e.preventDefault();
          draggingRef.current = true;
          setDragging(true);
          lastPosRef.current = { x: e.clientX, y: e.clientY };
        }}
        style={{
          height: "min(60vh, 32rem)",
          cursor: dragging ? "grabbing" : ctrlHeld ? "grab" : "default",
        }}
        className="overflow-hidden rounded-2xl border border-border bg-background p-4"
      >
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
          }}
          className="grid w-fit gap-1.5"
        >
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${seatMap.grid.cols}, minmax(1.75rem, 1fr))` }}
          >
            {seatMap.seats.map((seat) => {
              const disabled = isSeatDisabled(seat, occupiedSeatIds);
              const selected = selectedIds.has(seat.id);
              const row = Number(seat.row);
              const col = Number(seat.number);
              return (
                <button
                  key={seat.id}
                  type="button"
                  title={seatTitle(seat)}
                  disabled={disabled}
                  onClick={() => !disabled && onToggleSeat(seat.id, seat.ticket_group_id!)}
                  style={{
                    gridRow: Number.isFinite(row) ? row : undefined,
                    gridColumn: Number.isFinite(col) ? col : undefined,
                    backgroundColor: disabled
                      ? undefined
                      : selected
                        ? SELECTED_COLOR
                        : (seat.color ?? FALLBACK_COLOR),
                  }}
                  className={`aspect-square rounded text-[0.6rem] font-bold text-white transition-transform ${
                    disabled
                      ? "cursor-not-allowed bg-muted text-muted-foreground opacity-40"
                      : "hover:scale-110"
                  }`}
                >
                  {seat.number}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

type ParsedPath = { id: string; path: Path2D; transform: { x: number; y: number } };
type ViewTransform = { scale: number; x: number; y: number };

function parseElementTransform(el: Element): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let node: Element | null = el;
  while (node && node.tagName.toLowerCase() !== "svg") {
    const attr = node.getAttribute("transform");
    if (attr) {
      const translate = attr.match(/translate\(\s*(-?[\d.]+)\s*[,\s]\s*(-?[\d.]+)?\s*\)/);
      if (translate) {
        x += parseFloat(translate[1] || "0");
        y += parseFloat(translate[2] || "0");
      }
      const matrix = attr.match(/matrix\s*\(([-\d.,\s]+)\)/i);
      if (matrix) {
        const values = matrix[1]!.split(/[\s,]+/).map(Number);
        if (values.length === 6) {
          x += values[4]!;
          y += values[5]!;
        }
      }
    }
    node = node.parentElement;
  }
  return { x, y };
}

function fitTransform(
  containerWidth: number,
  containerHeight: number,
  svgWidth: number,
  svgHeight: number,
): ViewTransform {
  const scaleX = (containerWidth - FIT_PADDING * 2) / svgWidth;
  const scaleY = (containerHeight - FIT_PADDING * 2) / svgHeight;
  const scale = Math.max(0.1, Math.min(scaleX, scaleY));
  return {
    scale,
    x: (containerWidth - svgWidth * scale) / 2,
    y: (containerHeight - svgHeight * scale) / 2,
  };
}

/**
 * `type: 'scheme'` — rendered on `<canvas>` (raster), not injected as live
 * SVG/DOM: smoother pan/zoom at scale, and pixels aren't inspectable
 * vector geometry the way a `dangerouslySetInnerHTML`'d SVG is — closer to
 * the legacy admin canvas (`app/theme/.../seat_scheme/CanvasScheme.js`),
 * reimplemented functionally rather than as a ported class.
 */
function SchemeSeatCanvas({
  seatMap,
  selectedIds,
  occupiedSeatIds,
  onToggleSeat,
}: {
  seatMap: Extract<SeatMapResource, { type: "scheme" }>;
  selectedIds: Set<number>;
  occupiedSeatIds: Set<number>;
  onToggleSeat: (seatId: number, groupId: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathsRef = useRef<ParsedPath[]>([]);
  const svgDimsRef = useRef({ width: 500, height: 500 });
  const viewRef = useRef<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const initializedRef = useRef(false);
  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const ctrlHeld = useModifierHeld();
  const [dragging, setDragging] = useState(false);
  const [hoveredSeat, setHoveredSeat] = useState<{
    seat: SeatMapSeat;
    x: number;
    y: number;
  } | null>(null);

  const seatByRealId = useMemo(() => {
    const map = new Map<string, SeatMapSeat>();
    for (const seat of seatMap.seats) map.set(seat.real_id, seat);
    return map;
  }, [seatMap.seats]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { scale, x, y } = viewRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    for (const { id, path, transform } of pathsRef.current) {
      const seat = seatByRealId.get(id);
      ctx.save();
      ctx.translate(transform.x, transform.y);

      if (seat) {
        const disabled = isSeatDisabled(seat, occupiedSeatIds);
        const selected = selectedIds.has(seat.id);
        ctx.globalAlpha = disabled ? 0.4 : 1;
        ctx.fillStyle = disabled
          ? DISABLED_FILL
          : selected
            ? SELECTED_COLOR
            : (seat.color ?? FALLBACK_COLOR);
        if (selected) {
          ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
          ctx.shadowBlur = 4 / scale;
        }
      } else {
        ctx.fillStyle = DECORATIVE_FILL;
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1 / scale;
      ctx.fill(path);
      ctx.stroke(path);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.restore();
  }, [seatByRealId, selectedIds, occupiedSeatIds]);

  // `draw` closes over `seatByRealId`/`selectedIds`, so its identity changes
  // on every selection change — keeping it in an effect's dependency array
  // would re-run that effect (re-parsing the SVG, resetting zoom/pan) on
  // every seat click. `drawRef` lets the parsing/resize effect below call
  // the *current* draw without depending on it.
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
    draw();
  }, [draw]);

  const resetView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    viewRef.current = fitTransform(
      rect.width,
      rect.height,
      svgDimsRef.current.width,
      svgDimsRef.current.height,
    );
    initializedRef.current = true;
    draw();
  }, [draw]);

  // Parse the SVG source once per event (id/path/transform only — never
  // re-parsed on selection or pan/zoom changes; see `drawRef` above for why
  // `draw` itself is deliberately not a dependency here).
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const doc = new DOMParser().parseFromString(seatMap.svg ?? "<svg></svg>", "image/svg+xml");
    const svgRoot = doc.documentElement;
    const viewBox = svgRoot.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.split(/\s+/).map(Number);
      svgDimsRef.current = { width: parts[2] || 500, height: parts[3] || 500 };
    } else {
      svgDimsRef.current = {
        width: parseFloat(svgRoot.getAttribute("width") || "500"),
        height: parseFloat(svgRoot.getAttribute("height") || "500"),
      };
    }

    const parsed: ParsedPath[] = [];
    doc.querySelectorAll("path").forEach((el, index) => {
      const d = el.getAttribute("d");
      if (!d) return;
      parsed.push({
        id: el.getAttribute("id") || `path-${index}`,
        path: new Path2D(d),
        transform: parseElementTransform(el),
      });
    });
    pathsRef.current = parsed;
    initializedRef.current = false;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      if (!initializedRef.current) {
        viewRef.current = fitTransform(
          rect.width,
          rect.height,
          svgDimsRef.current.width,
          svgDimsRef.current.height,
        );
        initializedRef.current = true;
      }
      drawRef.current();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [seatMap.svg]);

  const hitTest = useCallback((canvasX: number, canvasY: number): ParsedPath | null => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return null;
    const { scale, x, y } = viewRef.current;
    const svgX = (canvasX - x) / scale;
    const svgY = (canvasY - y) / scale;
    for (const p of pathsRef.current) {
      if (ctx.isPointInPath(p.path, svgX - p.transform.x, svgY - p.transform.y)) return p;
    }
    return null;
  }, []);

  const zoomAt = useCallback(
    (px: number, py: number, factor: number) => {
      const { scale, x, y } = viewRef.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
      if (newScale === scale) return;
      const svgX = (px - x) / scale;
      const svgY = (py - y) / scale;
      viewRef.current = { scale: newScale, x: px - svgX * newScale, y: py - svgY * newScale };
      draw();
    },
    [draw],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      viewRef.current = {
        ...viewRef.current,
        x: viewRef.current.x + dx,
        y: viewRef.current.y + dy,
      };
      draw();
    };
    const onMouseUp = () => {
      draggingRef.current = false;
      setDragging(false);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [draw]);

  return (
    <div className="space-y-2">
      <ZoomControls
        hint={PAN_ZOOM_HINT}
        onZoomOut={() => {
          const canvas = canvasRef.current;
          if (canvas) zoomAt(canvas.width / 2, canvas.height / 2, 1 / BUTTON_ZOOM_FACTOR);
        }}
        onReset={resetView}
        onZoomIn={() => {
          const canvas = canvasRef.current;
          if (canvas) zoomAt(canvas.width / 2, canvas.height / 2, BUTTON_ZOOM_FACTOR);
        }}
      />
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-border bg-background"
        style={{ height: "min(60vh, 32rem)" }}
      >
        <canvas
          ref={canvasRef}
          onWheel={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            zoomAt(
              e.clientX - rect.left,
              e.clientY - rect.top,
              e.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR,
            );
          }}
          onMouseDown={(e) => {
            if (!(e.ctrlKey || e.metaKey) || e.button !== 0) return;
            e.preventDefault();
            draggingRef.current = true;
            setDragging(true);
            lastPosRef.current = { x: e.clientX, y: e.clientY };
          }}
          onMouseMove={(e) => {
            if (draggingRef.current) {
              setHoveredSeat(null);
              return;
            }
            const rect = e.currentTarget.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const hit = hitTest(px, py);
            const seat = hit ? seatByRealId.get(hit.id) : undefined;
            e.currentTarget.style.cursor =
              seat && !isSeatDisabled(seat, occupiedSeatIds)
                ? "pointer"
                : ctrlHeld
                  ? "grab"
                  : "default";
            setHoveredSeat(seat ? { seat, x: px, y: py } : null);
          }}
          onMouseLeave={() => setHoveredSeat(null)}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
            if (!hit) return;
            const seat = seatByRealId.get(hit.id);
            if (seat && !isSeatDisabled(seat, occupiedSeatIds))
              onToggleSeat(seat.id, seat.ticket_group_id!);
          }}
          className="size-full"
        />
        {hoveredSeat && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2 py-1 text-xs font-semibold text-background"
            style={{ left: hoveredSeat.x, top: hoveredSeat.y - 8 }}
          >
            {seatTitle(hoveredSeat.seat)}
          </div>
        )}
      </div>
    </div>
  );
}

export function SeatPicker({
  seatMap,
  selectedByGroup,
  occupiedSeatIds = new Set(),
  onToggleSeat,
}: {
  seatMap: SeatMapResource;
  selectedByGroup: SeatSelection;
  /** Seats a `422 SEATS_OCCUPIED` from the last quote attempt named — grayed out same as sold/disabled. */
  occupiedSeatIds?: Set<number>;
  onToggleSeat: (seatId: number, groupId: number) => void;
}) {
  if (seatMap.type === "none") return null;

  const selectedIds = new Set(Object.values(selectedByGroup).flat());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {seatMap.ticket_groups.map((group) => (
          <span key={group.id} className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: group.color ?? FALLBACK_COLOR }}
            />
            {group.name}
          </span>
        ))}
      </div>
      {occupiedSeatIds.size > 0 && (
        <p className="text-xs text-destructive">
          Część wybranych miejsc jest już zajęta — usunęliśmy je z koszyka, wybierz inne.
        </p>
      )}
      {seatMap.type === "scheme" ? (
        <SchemeSeatCanvas
          seatMap={seatMap}
          selectedIds={selectedIds}
          occupiedSeatIds={occupiedSeatIds}
          onToggleSeat={onToggleSeat}
        />
      ) : (
        <CustomSeatPicker
          seatMap={seatMap}
          selectedIds={selectedIds}
          occupiedSeatIds={occupiedSeatIds}
          onToggleSeat={onToggleSeat}
        />
      )}
    </div>
  );
}
