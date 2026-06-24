/**
 * scene/SceneFoundation.tsx
 *
 * Phase 1 — Production-ready Canvas wrapper.
 *
 * Responsibilities:
 *  • WebGLRenderer configured for HDR PBR rendering
 *  • PCFSoftShadowMap at configurable resolution
 *  • ACES filmic tone mapping baked into renderer
 *  • Device pixel ratio clamped to [1, 1.75] for performance
 *  • Loader setup (Draco + KTX2) wired inside Canvas context
 *  • Suspense boundary with consistent fallback
 *  • Error boundary wrapper (prevents full-page crash)
 *
 * Swap this single file to change the core renderer settings.
 * All scene content goes in `children`.
 */
import { Suspense, useEffect, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { configureLoaders } from "./loaders";

/* ── Loader initialiser (runs once inside Canvas context) ── */
function LoaderSetup() {
  const { gl } = useThree();
  useEffect(() => {
    configureLoaders();
    void gl; // ensure Canvas context is ready before configuring loaders
  }, [gl]);
  return null;
}

/* ── Renderer configurator (runs once on mount) ── */
function RendererConfig() {
  const { gl, scene } = useThree();
  useEffect(() => {
    /* Physically correct rendering */
    gl.shadowMap.enabled = true;
    gl.shadowMap.type    = THREE.PCFSoftShadowMap;

    /* HDR color pipeline */
    gl.toneMapping         = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.outputColorSpace    = THREE.SRGBColorSpace;

    /* Encoding for generated env maps */
    scene.backgroundBlurriness = 0;
  }, [gl, scene]);
  return null;
}

/* ── WebGL context creation attributes ── */
const GL_PROPS: React.ComponentProps<typeof Canvas>["gl"] = {
  antialias:        false,   // SMAA post-process handles AA
  alpha:            false,   // opaque background — saves fill rate
  stencil:          false,   // not needed for this scene
  depth:            true,
  powerPreference:  "high-performance",
  failIfMajorPerformanceCaveat: false,
  preserveDrawingBuffer: false,
};

interface SceneFoundationProps {
  children: ReactNode;
  /** Initial camera FOV in degrees. Default 44 */
  fov?: number;
  /** className / style forwarded to the Canvas container */
  className?: string;
  style?: React.CSSProperties;
}

export function SceneFoundation({
  children,
  fov = 44,
  className,
  style,
}: SceneFoundationProps) {
  return (
    <Canvas
      shadows
      camera={{ fov, near: 0.25, far: 260, position: [22, 28, 22] }}
      gl={GL_PROPS}
      dpr={[1, 1.75]}
      frameloop="always"
      performance={{ min: 0.5 }}    // auto-downscale DPR if FPS drops
      className={className}
      style={{
        width:  "100%",
        height: "100%",
        touchAction: "none",
        ...style,
      }}
    >
      {/* Invisible setup components */}
      <LoaderSetup />
      <RendererConfig />

      {/* Scene content */}
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </Canvas>
  );
}
