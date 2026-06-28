/**
 * scene/SceneFoundation.tsx — Phase 5 (quality-aware)
 *
 * Reads QualitySettings from QualityContext to configure:
 *  • Device pixel ratio cap (dprMax)
 *  • Shadow map type and resolution
 *  • Tone mapping / color space
 *
 * The QualityProvider must wrap SceneFoundation in the parent component.
 */
import { Suspense, useEffect, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { configureLoaders } from "./loaders";
import { useQuality } from "./QualityContext";

function LoaderSetup() {
  const { gl } = useThree();
  useEffect(() => { configureLoaders(); void gl; }, [gl]);
  return null;
}

function RendererConfig() {
  const { gl, scene } = useThree();
  const q = useQuality();

  useEffect(() => {
    gl.shadowMap.enabled = q.shadowsEnabled;
    gl.shadowMap.type    = q.shadowsEnabled ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;

    gl.toneMapping         = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.62;
    gl.outputColorSpace    = THREE.SRGBColorSpace;

    scene.backgroundBlurriness = 0;
  }, [gl, scene, q.shadowsEnabled]);
  return null;
}

const GL_PROPS: React.ComponentProps<typeof Canvas>["gl"] = {
  antialias:                    false,
  alpha:                        false,
  stencil:                      false,
  depth:                        true,
  powerPreference:              "high-performance",
  failIfMajorPerformanceCaveat: false,
  preserveDrawingBuffer:        false,
};

interface SceneFoundationProps {
  children:   ReactNode;
  fov?:       number;
  className?: string;
  style?:     React.CSSProperties;
}

export function SceneFoundation({ children, fov = 44, className, style }: SceneFoundationProps) {
  const q = useQuality();

  return (
    <Canvas
      shadows={q.shadowsEnabled}
      camera={{ fov, near: 0.15, far: 320, position: [0, 4.2, 18] }}
      gl={GL_PROPS}
      dpr={[1, q.dprMax]}
      frameloop="always"
      performance={{ min: 0.5 }}
      className={className}
      style={{ width: "100%", height: "100%", touchAction: "none", ...style }}
    >
      <LoaderSetup />
      <RendererConfig />
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </Canvas>
  );
}
