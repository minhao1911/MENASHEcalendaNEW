/**
 * scene/perf/ScenePerf.tsx
 *
 * Phase 1 — Performance monitoring overlay.
 *
 * Uses r3f-perf (https://github.com/utsuboco/r3f-perf) which renders
 * a compact HUD showing:
 *  • FPS and frame time (ms)
 *  • GPU timing (when available via EXT_disjoint_timer_query_webgl2)
 *  • Draw calls, triangles, textures, programs
 *  • Memory usage (MB)
 *
 * Rendered only in development mode (import.meta.env.DEV).
 * Production builds get a zero-cost stub.
 */
import { Perf } from "r3f-perf";

interface ScenePerfProps {
  /** Force-show even in production (for debugging deployed builds). */
  forceShow?: boolean;
  /** Position of the HUD panel. Default "top-left". */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export function ScenePerf({ forceShow = false, position = "top-left" }: ScenePerfProps) {
  const isDev = import.meta.env.DEV;
  if (!isDev && !forceShow) return null;

  return (
    <Perf
      position={position}
      minimal={false}
      showGraph
      chart={{ hz: 60, length: 120 }}
      antialias
      overClock={false}
      logsPerSecond={10}
      style={{
        opacity: 0.82,
        fontSize: "11px",
        zIndex: 9999,
      }}
    />
  );
}
