/**
 * scene/fx/PostProcessingPipeline.tsx
 *
 * Active effects:
 *  1. SMAA         — temporal-stable anti-aliasing
 *  2. Bloom        — HDR glow on bright emissive surfaces (candles, lanterns)
 *  3. Vignette     — cinematic edge darkening for photographic depth
 *
 * ToneMapping is handled by the WebGLRenderer in SceneFoundation (ACES filmic).
 */
import { BlendFunction } from "postprocessing";
import { EffectComposer, SMAA, Bloom, Vignette } from "@react-three/postprocessing";

interface PostProcessingPipelineProps {
  enableSMAA?: boolean;
  enableBloom?: boolean;
  enableSSAO?: boolean;
  bloomIntensity?: number;
  bloomThreshold?: number;
}

export function PostProcessingPipeline({
  enableSMAA      = true,
  enableBloom     = true,
  bloomIntensity  = 1.6,
  bloomThreshold  = 0.20,
}: PostProcessingPipelineProps) {
  return (
    <EffectComposer multisampling={0}>
      {/* Anti-aliasing */}
      <SMAA />

      {/* HDR bloom — wider glow, lower threshold to catch candle light */}
      <Bloom
        intensity={enableBloom ? bloomIntensity : 0}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.92}
        mipmapBlur
        blendFunction={BlendFunction.ADD}
        levels={8}
      />

      {/* Vignette — darkened edges for photographic / sacred atmosphere */}
      <Vignette
        offset={0.28}
        darkness={0.65}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
